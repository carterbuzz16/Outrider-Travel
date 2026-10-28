"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, FAIL_CLOSED } from "@/lib/rate-limit";
import { honeypotTripped } from "@/lib/honeypot";
import { clientIp } from "@/lib/client-ip";
import { sendEmail, getFromAddress } from "@/lib/email/send";
import { renderAmbassadorApplication } from "@/lib/email/ambassador";
import { CONTACT } from "@/lib/site-content";
import type { Database } from "@/types/supabase";
import {
  AMBASSADOR_ERRORS,
  validateAmbassador,
  type AmbassadorFieldErrors,
  type AmbassadorInput,
  type CleanAmbassadorInput,
} from "@/lib/ambassador-application";

/**
 * The /ambassador application.
 *
 * Two destinations, like the waitlist: the ambassador_applications table is
 * the record the team works from, and an email tells them it arrived. Either
 * one is enough to count as received. If the table write fails, the email
 * carries the whole application (phone included) and says it was not saved,
 * so an application is never lost to a database hiccup; only when both fail
 * is the applicant asked to try again.
 */

export type ApplyResult =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: AmbassadorFieldErrors };

const FAILED: ApplyResult = { ok: false, message: AMBASSADOR_ERRORS.failed };

export async function applyForAmbassador(
  rawInput: AmbassadorInput,
  /** The form's hidden trap field (lib/honeypot.ts). Empty from a person. */
  honeypot?: unknown,
): Promise<ApplyResult> {
  // Checked before the rate limit, so someone fixing a mistyped number does
  // not spend their attempts on it.
  const checked = validateAmbassador(rawInput ?? {});
  if (!checked.ok) {
    return { ok: false, message: "Check the highlighted fields.", fieldErrors: checked.errors };
  }
  const input = checked.data;

  // A filled trap gets exactly what a real application gets, and nothing
  // happens: no row, no email. An error would tell the script which field
  // gave it away. Before the limits, so a trapped script does not spend the
  // allowance a real applicant on the same network shares.
  if (honeypotTripped(honeypot)) {
    return { ok: true };
  }

  // Public and pre-auth, so throttled on IP, the way the waitlist and contact
  // form are. Each pass writes a row and sends the team an email, so all
  // three fail closed: a flood must not get through because the limiter's
  // database is struggling. Stopped at the first refusal, so one noisy
  // address is turned away on its own counters before it can draw on the
  // site-wide one.
  //
  // 20 per ten minutes and 50 a day, not the contact form's 5 an hour: the
  // pop-up runs inside the Chptr app, and a chapter meeting is a room of
  // phones behind one Wi-Fi address. The refusals use the brief's one failure
  // line; the limits are far above what a person would ever reach.
  const ip = await clientIp();
  if (!(await checkRateLimit(`ambassador:${ip}`, 20, 10 * 60, FAIL_CLOSED))) return FAILED;
  if (!(await checkRateLimit(`ambassador-ip-day:${ip}`, 50, 24 * 60 * 60, FAIL_CLOSED))) return FAILED;
  if (!(await checkRateLimit("ambassador:global", 300, 24 * 60 * 60, FAIL_CLOSED))) {
    console.error(
      "AMBASSADOR DAILY CAP: 300 applications in 24 hours (or the rate limiter failed closed). New applications are refused until the window rolls over.",
    );
    return FAILED;
  }

  // In order, not side by side: the email's contents depend on whether the
  // row was written.
  const stored = await storeApplication(input);
  const notified = await notifyTeam(input, stored);

  if (!stored.saved && !notified) return FAILED;
  return { ok: true };
}

/** Whether the row went in, and which fields could only go in the email. */
type Stored = { saved: boolean; unsaved: string[] };

type Row = Database["public"]["Tables"]["ambassador_applications"]["Insert"];

// PostgREST's "column not in the schema cache", and Postgres's own
// undefined_column: the database is behind the code.
const MISSING_COLUMN = "PGRST204";
const UNKNOWN_COLUMN = "42703";

async function storeApplication(input: CleanAmbassadorInput): Promise<Stored> {
  const core: Row = {
    name: input.name,
    school: input.school,
    chapter: input.chapter,
    instagram: input.instagram,
    phone: input.phone,
    reach: input.reach,
  };
  // fit (the old second question) is no longer asked; its column keeps the
  // answers from before 27 October 2026.
  const answers = { year: input.year, why: input.why };

  // The columns arrived in stages: year/why/fit in
  // 20261026120000_ambassador_application_answers, email in
  // 20261027120000_ambassador_application_email. If this runs before a stage's
  // SQL has, the application is kept rather than lost: the newest columns are
  // dropped first and the insert tried again, and the team email (which always
  // carries everything) says which fields are only there. Newest first, so a
  // missing email column never also costs the answers.
  const attempts: { row: Row; unsaved: string[] }[] = [
    { row: { ...core, ...answers, email: input.email }, unsaved: [] },
    { row: { ...core, ...answers }, unsaved: ["email"] },
    { row: core, unsaved: ["email", "year", "why"] },
  ];

  try {
    // Service-role: the table has RLS on, no policies and no grants for the
    // API roles (prisma/migrations/20261019120000_ambassador_applications).
    const admin = createAdminClient();
    for (const attempt of attempts) {
      const { error } = await admin.from("ambassador_applications").insert(attempt.row);
      if (!error) {
        if (attempt.unsaved.length > 0) {
          console.error(
            `AMBASSADOR APPLICATION PARTLY STORED: ambassador_applications has no ${attempt.unsaved.join("/")} column yet, so those are in the team email only. Run the pending ambassador_application SQL.`,
          );
        }
        return { saved: true, unsaved: attempt.unsaved };
      }
      if (error.code !== MISSING_COLUMN && error.code !== UNKNOWN_COLUMN) {
        // 42P01 / PGRST205 here would mean the table itself is missing.
        console.error(`AMBASSADOR APPLICATION NOT SAVED: ${error.code} ${error.message}`);
        return { saved: false, unsaved: [] };
      }
    }
    console.error("AMBASSADOR APPLICATION NOT SAVED: even the original columns were refused as missing.");
    return { saved: false, unsaved: [] };
  } catch (err) {
    console.error("AMBASSADOR APPLICATION NOT SAVED: the insert threw.", err);
    return { saved: false, unsaved: [] };
  }
}

/** Where applications land. Falls back like the contact form, so a fresh
 *  environment still delivers somewhere real. */
function inbox(): string {
  return (
    process.env.AMBASSADOR_NOTIFY_TO ||
    process.env.CONTACT_NOTIFY_TO ||
    process.env.WAITLIST_NOTIFY_TO ||
    CONTACT.email
  );
}

async function notifyTeam(input: CleanAmbassadorInput, { saved, unsaved }: Stored): Promise<boolean> {
  try {
    const { subject, text } = renderAmbassadorApplication(input, { saved, unsaved });
    // The applicant's address goes in reply-to, never in `from` (sending as
    // them would fail SPF on our domain), so the team can answer with Reply,
    // the way the contact form works.
    await sendEmail({ from: getFromAddress(), to: inbox(), replyTo: input.email, subject, text });
    return true;
  } catch (err) {
    // Loud and specific: when the row was saved the application is safe and
    // only the heads-up is missing, but if neither went through the applicant
    // is told to try again, and this line is the only trace of why.
    console.error(
      saved
        ? "Ambassador notification failed (the application is saved in ambassador_applications):"
        : "AMBASSADOR APPLICATION LOST: neither the table write nor the team email went through.",
      err,
    );
    return false;
  }
}
