"use server";

import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { emailCatalog } from "@/lib/email/catalog";
import { getFromAddress, sendEmail } from "@/lib/email/send";

export type TestSendResult = { ok: boolean; message: string };

const TESTS_PER_HOUR = 20;

/**
 * Sends one email from the catalogue, rendered from the sample booking, to the
 * signed-in admin's own address. There is deliberately no recipient field: an
 * action that mails arbitrary addresses from the bookings domain is a spam
 * cannon, admin-only or not.
 *
 * Touches no booking: it goes straight through the render function and
 * sendEmail, around the claim-and-send paths in lib/email. The only write is
 * the rate limiter's own counter.
 */
export async function sendTestEmail(_prev: TestSendResult | null, formData: FormData): Promise<TestSendResult> {
  const userId = await requireAdmin();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const to = user?.id === userId ? user.email : null;
  if (!to) return { ok: false, message: "Your account has no email address to send to." };

  const id = String(formData.get("email") ?? "");
  const entry = emailCatalog().find((e) => e.id === id);
  if (!entry) return { ok: false, message: "That email isn't in the list." };
  if (entry.supabase) return { ok: false, message: "Supabase sends this one; it can't be test-sent from here." };

  if (!(await checkRateLimit(`admin:email-test:${userId}`, TESTS_PER_HOUR, 60 * 60))) {
    return { ok: false, message: `That's ${TESTS_PER_HOUR} test emails this hour. Try again later.` };
  }

  try {
    const email = entry.render();
    const from = getFromAddress();
    const subject = `[TEST] ${email.subject}`;
    const base = { from, to, subject, ...(entry.replyToBookings ? { replyTo: from } : {}) };
    // No List-Unsubscribe header on a test: it would point at a sample token.
    if (email.html) {
      await sendEmail({ ...base, html: email.html, ...(email.text ? { text: email.text } : {}) });
    } else if (email.text) {
      await sendEmail({ ...base, text: email.text });
    } else {
      return { ok: false, message: "This email has no body to send." };
    }
  } catch (err) {
    console.error(`admin test email ${id} failed: ${err instanceof Error ? err.message : err}`);
    return { ok: false, message: "It didn't send. The server log has the reason." };
  }

  return { ok: true, message: `Sent to ${to}.` };
}
