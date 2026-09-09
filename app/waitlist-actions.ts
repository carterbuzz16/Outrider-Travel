"use server";

import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendWaitlistNotification, sendWaitlistWelcome } from "@/lib/email/send";
import { clientIp } from "@/lib/client-ip";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UNIQUE_VIOLATION = "23505";

export type JoinResult = { ok: true } | { ok: false; message: string };

// Adding a contact needs audience access. RESEND_API_KEY may be scoped to
// sending only, in which case give this one a key that can write contacts;
// otherwise it falls back and the single key does both.
function contactsClient(): Resend {
  const key = process.env.RESEND_CONTACTS_API_KEY || process.env.RESEND_API_KEY;
  // new Resend(undefined) throws rather than returning an error, so check
  // first and let the caller turn it into an ordinary failed sync.
  if (!key) {
    throw new Error("Neither RESEND_CONTACTS_API_KEY nor RESEND_API_KEY is set.");
  }
  return new Resend(key);
}


export async function joinWaitlist(rawEmail: string): Promise<JoinResult> {
  const email = String(rawEmail ?? "").trim().toLowerCase();

  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false, message: "Enter a valid email." };
  }

  // Server actions are public endpoints like any other, and this one is
  // pre-auth, so there's no user id to throttle on — fall back to IP, the
  // same way the booking flow's anonymous steps do.
  const allowed = await checkRateLimit(`waitlist:${(await clientIp())}`, 5, 60 * 60);
  if (!allowed) {
    return { ok: false, message: "Too many attempts. Try again later." };
  }

  // Two independent destinations, written concurrently so the visitor waits
  // on the slower one rather than the sum. The table is the durable record
  // we control; the Resend audience is what the list actually gets mailed
  // from. Neither is allowed to sink the other.
  //
  // allSettled, not all: `all` rejects the moment one side throws, which on
  // a serverless host tears the invocation down with the other write still
  // in flight — that silently dropped signups depending on which finished
  // first. Settling both means the insert is always awaited to completion.
  const [storedResult, syncedResult] = await Promise.allSettled([
    storeSignup(email),
    addToAudience(email),
  ]);

  const stored =
    storedResult.status === "fulfilled" ? storedResult.value : { ok: false, isNew: false, token: undefined };
  const synced = syncedResult.status === "fulfilled" && syncedResult.value;

  if (storedResult.status === "rejected") {
    console.error("Waitlist insert threw:", storedResult.reason);
  }
  if (syncedResult.status === "rejected") {
    console.error("Resend audience sync threw:", syncedResult.reason);
  }

  // Only a total loss is worth telling them about: if either side captured
  // the address, they are on the list and saying otherwise would push them
  // to submit again for nothing.
  if (!stored.ok && !synced) {
    return { ok: false, message: "Something went wrong. Try again." };
  }

  // Keyed off the table's unique constraint rather than Resend, which
  // upserts a repeat signup to the same contact id and so can't tell us
  // whether this address is new.
  if (stored.isNew) {
    // The welcome is what carries the unsubscribe link. Until it existed the
    // first message anyone got was going to be a bulk announcement, so the
    // "unsubscribe link in any of those messages" the privacy policy promises
    // did not yet exist anywhere. Failure is logged, never surfaced: they are
    // on the list either way, and telling them otherwise invites a resubmit.
    if (stored.token) {
      try {
        await sendWaitlistWelcome(email, stored.token);
      } catch (err) {
        // Loud and specific. The first time this failed in production it was a
        // missing EMAIL_FROM_ADDRESS, and the only evidence was silence: the
        // row was written, the Resend contact was created, and the person got
        // nothing. Nobody reads a log that does not say what broke.
        console.error(
          "WAITLIST WELCOME FAILED — the signup was recorded and the contact synced, but no email was sent.",
          err,
        );
      }
    } else {
      // Previously skipped in silence, which is how the same failure could
      // happen again without leaving a trace.
      console.error(
        "WAITLIST WELCOME SKIPPED — no unsubscribe token came back from the insert, so no email could be sent.",
      );
    }

    try {
      await sendWaitlistNotification(email);
    } catch (err) {
      console.error("Waitlist notification failed (signup still recorded):", err);
    }
  }

  return { ok: true };
}

async function storeSignup(
  email: string,
): Promise<{ ok: boolean; isNew: boolean; token?: string }> {
  // Service-role: waitlist_signups has no INSERT policy for anon, the same
  // shape as the other pre-auth writes in this app. The token comes back on
  // the same round trip, because the welcome email cannot be sent without it.
  const { data, error } = await createAdminClient()
    .from("waitlist_signups")
    .insert({ email })
    .select("unsubscribe_token")
    .single();

  if (!error) return { ok: true, isNew: true, token: data?.unsubscribe_token };

  // Signing up twice is a normal thing for someone to do, not a failure.
  if (error.code === UNIQUE_VIOLATION) {
    // Someone who left and came back is opting in again, so clear the flag
    // rather than leaving them marked unsubscribed and silently unreachable.
    await createAdminClient()
      .from("waitlist_signups")
      .update({ unsubscribed_at: null })
      .eq("email", email);
    return { ok: true, isNew: false };
  }

  console.error(`Waitlist insert failed: ${error.code} — ${error.message}`);
  return { ok: false, isNew: false };
}

async function addToAudience(email: string): Promise<boolean> {
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!audienceId) {
    console.error("RESEND_AUDIENCE_ID is not set — signup stored but not synced to Resend.");
    return false;
  }

  // Resend renamed audiences to "segments"; same objects, same ids, and the
  // SDK still takes one under `audienceId`. A repeat address is upserted
  // onto the existing contact rather than returning an error.
  const { error } = await contactsClient().contacts.create({
    audienceId,
    email,
    unsubscribed: false,
  });

  if (error) {
    console.error(`Resend contacts.create failed: ${error.name} — ${error.message}`);
    return false;
  }

  return true;
}
