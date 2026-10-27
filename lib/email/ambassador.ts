import { formatUsPhone } from "@/lib/phone";
import { reachLabel, yearLabel, type CleanAmbassadorInput } from "@/lib/ambassador-application";

/**
 * The team's note about a new /ambassador application
 * (app/(site)/ambassador/actions.ts sends it). Plain text, the facts one per
 * line so they can be read from a phone lock screen, then the two short
 * answers, which are what the team actually decides on. Pure, so the admin
 * preview page (app/admin/emails) shows exactly what lands in the inbox.
 *
 * The applicant's email is in it (and in reply-to, so Reply answers them).
 * The phone number is left out when the application was saved: it is in the
 * ambassador_applications table, and stays there rather than travelling
 * around a team inbox (the waitlist note makes the same choice). When the
 * save failed, this email is the only record of the application, so it
 * carries everything and says so at the top.
 */
export function renderAmbassadorApplication(
  input: CleanAmbassadorInput,
  {
    saved,
    unsaved = [],
  }: {
    saved: boolean;
    /** Fields the table has no column for yet (their SQL not run), so they
     *  reached only this email, e.g. ["email"]. */
    unsaved?: string[];
  },
): { subject: string; text: string } {
  const warning = !saved
    ? [
        "NOT SAVED: the database write failed, so this email is the only record of this application. Copy it somewhere before replying.",
        "",
      ]
    : unsaved.length > 0
      ? [
          `PARTLY SAVED: the table has no ${unsaved.join(", ")} column yet, so ${unsaved.length === 1 ? "that is" : "those are"} only in this email. Run the pending ambassador_application SQL.`,
          "",
        ]
      : [];

  const lines = [
    ...warning,
    input.name,
    `Email: ${input.email}`,
    `School: ${input.school}`,
    `Year: ${yearLabel(input.year)}`,
    `Chapter: ${input.chapter}`,
    `Instagram: @${input.instagram} (https://www.instagram.com/${input.instagram}/)`,
    `Friends they could bring: ${reachLabel(input.reach)}`,
    saved ? "Phone: in the ambassador_applications table in Supabase" : `Phone: ${formatUsPhone(input.phone)}`,
    "",
    "Why they want to do it:",
    input.why,
    "",
    "What makes them a good fit:",
    input.fit,
  ];

  return {
    subject: `Outrider: ambassador application from ${input.name} (${input.school})`,
    text: lines.join("\n"),
  };
}
