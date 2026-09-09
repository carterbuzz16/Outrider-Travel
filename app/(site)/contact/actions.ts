"use server";

import { Resend } from "resend";
import { checkRateLimit } from "@/lib/rate-limit";
import { CONTACT } from "@/lib/site-content";
import { clientIp } from "@/lib/client-ip";

/**
 * Contact form delivery.
 *
 * Mail only — there is no contact_messages table, so a send failure means the
 * message is genuinely lost. That is why this never reports success it hasn't
 * earned: if the inbox isn't configured or Resend rejects the send, the visitor
 * is told to email directly rather than being thanked for a message nobody
 * received.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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
}): Promise<ContactResult> {
  const name = String(input.name ?? "").trim().slice(0, MAX_NAME);
  const email = String(input.email ?? "").trim().toLowerCase();
  const message = String(input.message ?? "").trim().slice(0, MAX_MESSAGE);

  if (!name) return { ok: false, message: "Tell us your name." };
  if (!EMAIL_PATTERN.test(email)) return { ok: false, message: "Enter a valid email." };
  if (message.length < 2) return { ok: false, message: "Add a message." };

  // A public, unauthenticated endpoint like the waitlist one — throttled on IP
  // for the same reason.
  const allowed = await checkRateLimit(`contact:${(await clientIp())}`, 5, 60 * 60);
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
      subject: `Outrider inquiry from ${name}`,
      text: `From: ${name} <${email}>\n\n${message}`,
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
