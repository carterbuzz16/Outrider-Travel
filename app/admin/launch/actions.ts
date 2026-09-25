"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { earlyAccessFromPrice, earlyAccessUrl } from "@/lib/early-access";
import { getFromAddress, renderEarlyAccess, sendEmail, sendEmailBatch } from "@/lib/email/send";
import { getAppUrl } from "@/lib/site-url";
import { isDeliverableEmail } from "@/lib/waitlist-signup";
import { launchReadiness } from "./readiness";

export type LaunchResult = { ok: boolean; message: string };

/** Resend's batch ceiling. */
const BATCH_SIZE = 100;

/**
 * The head-start email, to the signed-in admin only, with [TEST] in the
 * subject. If the admin's own address is on the list, it carries their real
 * tokens, so the button actually opens booking and the flow can be walked end
 * to end; otherwise sample tokens, and the message says the link won't work.
 * No readiness checks: a test is exactly what you send before everything is
 * ready. No parameters: the previous state useActionState passes is of no
 * use here, and the null in the return type is what lets the form start empty.
 */
export async function sendEarlyAccessTest(): Promise<LaunchResult | null> {
  const userId = await requireAdmin();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const to = user?.id === userId ? user.email : null;
  if (!to) return { ok: false, message: "Your account has no email address to send to." };

  if (!(await checkRateLimit(`admin:early-access-test:${userId}`, 10, 60 * 60))) {
    return { ok: false, message: "That's 10 tests this hour. Try again later." };
  }

  const { data: own } = await createAdminClient()
    .from("waitlist_signups")
    .select("early_access_token, unsubscribe_token")
    .eq("email", to.toLowerCase())
    .is("unsubscribed_at", null)
    .maybeSingle();

  const email = renderEarlyAccess({
    bookingUrl: own ? earlyAccessUrl(own.early_access_token) : `${getAppUrl()}/early-access?t=sample`,
    unsubscribeToken: own?.unsubscribe_token ?? "sample-preview-token",
    fromPrice: await earlyAccessFromPrice(),
  });

  try {
    // No List-Unsubscribe header on a test, same as every other test send.
    await sendEmail({ from: getFromAddress(), to, subject: `[TEST] ${email.subject}`, html: email.html, text: email.text });
  } catch (err) {
    console.error(`early access test failed: ${err instanceof Error ? err.message : err}`);
    return { ok: false, message: "It didn't send. The server log has the reason." };
  }

  return {
    ok: true,
    message: own
      ? `Sent to ${to}. You're on the list, so its button is live: it will open booking for you.`
      : `Sent to ${to}. You're not on the list, so its button uses a sample link and won't open booking. Join the list with this address to test the whole flow.`,
  };
}

/**
 * The real send: every list member who hasn't unsubscribed, hasn't opted out
 * and hasn't had this email yet. Rows are stamped with early_access_sent_at as
 * each batch is accepted, so pressing it again only reaches whoever was
 * missed (a failure, or someone who joined since).
 */
export async function sendEarlyAccessToList(
  _prev: LaunchResult | null,
  formData: FormData,
): Promise<LaunchResult> {
  const userId = await requireAdmin();

  if (formData.get("confirm") !== "send") {
    return { ok: false, message: "Confirm the send first." };
  }

  const failing = launchReadiness().filter((check) => !check.ok);
  if (failing.length > 0) {
    return { ok: false, message: `Not sent. ${failing.map((c) => c.label).join("; ")}: not yet.` };
  }

  if (!(await checkRateLimit(`admin:early-access-send:${userId}`, 5, 60 * 60))) {
    return { ok: false, message: "That's 5 sends this hour. Try again later." };
  }

  const admin = createAdminClient();
  const { data: pending, error } = await admin
    .from("waitlist_signups")
    .select("id, email, early_access_token, unsubscribe_token")
    .is("unsubscribed_at", null)
    .is("early_access_sent_at", null)
    // Null is everyone who joined before the consent checkbox existed:
    // joining the list was asking to hear when booking opens. Only an
    // explicit false stays out.
    .or("email_consent.is.null,email_consent.eq.true")
    .order("created_at", { ascending: true });

  if (error) {
    console.error(`early access recipients read failed: ${error.code} ${error.message}`);
    return { ok: false, message: "Couldn't read the list. Nothing was sent." };
  }
  if (!pending || pending.length === 0) {
    return { ok: true, message: "Everyone on the list already has it. Nothing to send." };
  }

  // Addresses that cannot be delivered stay out of the batch: one bad "to"
  // can fail a whole Resend batch, and a bounce counts against the domain.
  // They are left unstamped and named in the result, so the team can fix
  // the address or send the link another way.
  const skipped = pending.filter((row) => !isDeliverableEmail(row.email));
  const deliverable = pending.filter((row) => isDeliverableEmail(row.email));
  const skippedNote = skipped.length
    ? ` Skipped ${skipped.length} address${skipped.length === 1 ? "" : "es"} that can't receive mail: ${skipped.map((r) => r.email).join(", ")}.`
    : "";
  if (deliverable.length === 0) {
    return { ok: false, message: `Nothing sent.${skippedNote}` };
  }

  const from = getFromAddress();
  const fromPrice = await earlyAccessFromPrice();
  let sent = 0;

  for (let i = 0; i < deliverable.length; i += BATCH_SIZE) {
    const chunk = deliverable.slice(i, i + BATCH_SIZE);
    const emails = chunk.map((row) => {
      const email = renderEarlyAccess({
        bookingUrl: earlyAccessUrl(row.early_access_token),
        unsubscribeToken: row.unsubscribe_token,
        fromPrice,
      });
      return { from, to: row.email, subject: email.subject, html: email.html, text: email.text, headers: email.headers };
    });
    // Keyed on exactly who is in this batch, so a retry of the same batch
    // is a no-op at Resend and a batch with anyone new is not.
    const key = `early-access-${createHash("sha256").update(chunk.map((r) => r.id).join(",")).digest("hex").slice(0, 40)}`;

    try {
      await sendEmailBatch(emails, key);
    } catch (err) {
      console.error(`early access batch failed: ${err instanceof Error ? err.message : err}`);
      revalidatePath("/admin/launch");
      return {
        ok: false,
        message: `Sent to ${sent} of ${deliverable.length}, then a batch failed. Press send again to reach the rest; nobody gets it twice.${skippedNote}`,
      };
    }

    const { error: stampError } = await admin
      .from("waitlist_signups")
      .update({ early_access_sent_at: new Date().toISOString() })
      .in("id", chunk.map((r) => r.id));
    if (stampError) {
      // Sent but not recorded. Stop rather than risk a second copy on retry
      // after Resend's 24-hour idempotency window.
      console.error(`early access stamp failed: ${stampError.code} ${stampError.message}`);
      revalidatePath("/admin/launch");
      return {
        ok: false,
        message: `Sent to ${sent + chunk.length}, but couldn't record it. Don't press send again; check the server log.`,
      };
    }
    sent += chunk.length;
  }

  revalidatePath("/admin/launch");
  return {
    ok: true,
    message: `Sent to ${sent} ${sent === 1 ? "person" : "people"} on the list. The head start has begun.${skippedNote}`,
  };
}
