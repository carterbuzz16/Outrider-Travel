"use server";

import { headers } from "next/headers";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendWaitlistNotification } from "@/lib/email/send";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UNIQUE_VIOLATION = "23505";

export type JoinResult = { ok: true } | { ok: false; message: string };

// Adding a contact needs audience access. RESEND_API_KEY may be scoped to
// sending only, in which case give this one a key that can write contacts;
// otherwise it falls back and the single key does both.
function contactsClient(): Resend {
  return new Resend(process.env.RESEND_CONTACTS_API_KEY || process.env.RESEND_API_KEY);
}

function clientIp(): string {
  return headers().get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function joinWaitlist(rawEmail: string): Promise<JoinResult> {
  const email = String(rawEmail ?? "").trim().toLowerCase();

  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false, message: "Enter a valid email." };
  }

  // Server actions are public endpoints like any other, and this one is
  // pre-auth, so there's no user id to throttle on — fall back to IP, the
  // same way the booking flow's anonymous steps do.
  const allowed = await checkRateLimit(`waitlist:${clientIp()}`, 5, 60 * 60);
  if (!allowed) {
    return { ok: false, message: "Too many attempts. Try again later." };
  }

  // Two independent destinations, written concurrently so the visitor waits
  // on the slower one rather than the sum. The table is the durable record
  // we control; the Resend audience is what the list actually gets mailed
  // from. Neither is allowed to sink the other.
  const [stored, synced] = await Promise.all([storeSignup(email), addToAudience(email)]);

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
    try {
      await sendWaitlistNotification(email);
    } catch (err) {
      console.error("Waitlist notification failed (signup still recorded):", err);
    }
  }

  return { ok: true };
}

async function storeSignup(email: string): Promise<{ ok: boolean; isNew: boolean }> {
  // Service-role: waitlist_signups has no INSERT policy for anon, the same
  // shape as the other pre-auth writes in this app.
  const { error } = await createAdminClient().from("waitlist_signups").insert({ email });

  if (!error) return { ok: true, isNew: true };

  // Signing up twice is a normal thing for someone to do, not a failure.
  if (error.code === UNIQUE_VIOLATION) return { ok: true, isNew: false };

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
