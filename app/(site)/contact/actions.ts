"use server";

import { Resend } from "resend";
import { checkRateLimit, FAIL_CLOSED } from "@/lib/rate-limit";
import { honeypotTripped } from "@/lib/honeypot";
import { isDeliverableEmail } from "@/lib/waitlist-signup";
import { CONTACT } from "@/lib/site-content";
import { clientIp } from "@/lib/client-ip";
import { renderContactMessage } from "@/lib/email/contact";

/**
 * Contact form delivery.
 *
 * Mail only — there is no contact_messages table, so a send failure means the
 * message is genuinely lost. That is why this never reports success it hasn't
 * earned: if the inbox isn't configured or Resend rejects the send, the visitor
 * is told to email directly rather than being thanked for a message nobody
 * received.
 */

const MAX_MESSAGE = 5000;
const MAX_NAME = 200;

export type ContactResult = { ok: true } | { ok: false; message: string };

/** Where inquiries land. Falls back to the waitlist inbox, then the public
 *  address, so a fresh environment still delivers somewhere real. */
function inbox(): string | null {
  return (
    process.env.CONTACT_NOTIFY_TO ||
    process.env.WAITLIST_NOTIFY_TO ||
    CONTACT.email ||
    null
  );
}


export async function sendContactMessage(input: {
  name: string;
  email: string;
  message: string;
  /** The form's hidden trap field (lib/honeypot.ts). Empty from a person. */
  website?: string;
}): Promise<ContactResult> {
  const name = String(input.name ?? "").trim().slice(0, MAX_NAME);
  const email = String(input.email ?? "").trim().toLowerCase();
  const message = String(input.message ?? "").trim().slice(0, MAX_MESSAGE);

  if (!name) return { ok: false, message: "Tell us your name." };
  // The waitlist's check (lib/waitlist-signup.ts), not the loose "anything @
  // anything . anything" this used to use: the address goes into reply-to on
  // mail from our own domain, so it has to be one mail can go to, and no
  // longer than an address can be (254). Refused when too long, never cut
  // down, since a truncated address is a different, wrong one.
  if (!isDeliverableEmail(email)) return { ok: false, message: "Enter a valid email." };
  if (message.length < 2) return { ok: false, message: "Add a message." };

  // A filled trap is thanked like a real message and nothing is sent, so the
  // script cannot tell which field gave it away. After validation, so bad
  // input is refused the same way either way; before the limit, so a trapped
  // script does not use up the allowance of a real visitor on the same
  // network.
  if (honeypotTripped(input.website)) {
    return { ok: true };
  }

  // A public, unauthenticated endpoint like the waitlist one, throttled on IP
  // for the same reason. Fails closed because every pass sends an email: a
  // limiter that switches off when its database is struggling would let a
  // flood straight through to the inbox.
  const allowed = await checkRateLimit(`contact:${(await clientIp())}`, 5, 60 * 60, FAIL_CLOSED);
  if (!allowed) {
    return { ok: false, message: "Too many messages. Try again later." };
  }

  const to = inbox();
  const from = process.env.EMAIL_FROM_ADDRESS;
  const apiKey = process.env.RESEND_API_KEY;

  if (!to || !from || !apiKey) {
    console.error(
      "Contact form is not deliverable: need RESEND_API_KEY, EMAIL_FROM_ADDRESS and a destination inbox.",
    );
    return {
      ok: false,
      message: `Our form is not accepting messages right now. Please email ${CONTACT.email} directly.`,
    };
  }

  try {
    const { error } = await new Resend(apiKey).emails.send({
      from,
      to,
      // The visitor's address goes in reply-to, never in `from`: sending as
      // them would fail SPF on a verified domain and land the lot in spam.
      replyTo: email,
      ...renderContactMessage({ name, email, message }),
    });

    if (error) {
      console.error(`Contact send failed: ${error.name} — ${error.message}`);
      return {
        ok: false,
        message: `That did not send. Please email ${CONTACT.email} directly.`,
      };
    }
  } catch (err) {
    console.error("Contact send threw:", err);
    return {
      ok: false,
      message: `That did not send. Please email ${CONTACT.email} directly.`,
    };
  }

  return { ok: true };
}
