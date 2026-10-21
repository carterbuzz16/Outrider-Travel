import { formatUsPhone } from "@/lib/phone";
import { reachLabel, type CleanAmbassadorInput } from "@/lib/ambassador-application";

/**
 * The team's note about a new /ambassador application
 * (app/(site)/ambassador/actions.ts sends it). Plain text, one fact per line,
 * so it can be read from a phone lock screen, like the waitlist notification.
 * Pure, so the admin preview page (app/admin/emails) shows exactly what lands
 * in the inbox.
 *
 * The phone number is left out when the application was saved: it is in the
 * ambassador_applications table, and stays there rather than travelling
 * around a team inbox (the waitlist note makes the same choice). When the
 * save failed, this email is the only record of the application, so it
 * carries everything and says so at the top.
 */
export function renderAmbassadorApplication(
  input: CleanAmbassadorInput,
  { saved }: { saved: boolean },
): { subject: string; text: string } {
  const lines = [
    ...(saved
      ? []
      : [
          "NOT SAVED: the database write failed, so this email is the only record of this application. Copy it somewhere before replying.",
          "",
        ]),
    input.name,
    `School: ${input.school}`,
    `Chapter: ${input.chapter}`,
    `Instagram: @${input.instagram} (https://www.instagram.com/${input.instagram}/)`,
    `Friends they could bring: ${reachLabel(input.reach)}`,
    saved ? "Phone: in the ambassador_applications table in Supabase" : `Phone: ${formatUsPhone(input.phone)}`,
  ];

  return {
    subject: `Outrider: ambassador application from ${input.name} (${input.school})`,
    text: lines.join("\n"),
  };
}
