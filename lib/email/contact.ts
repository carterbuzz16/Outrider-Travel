/**
 * The contact form's message to the team (app/(site)/contact/actions.ts sends
 * it). Plain text only. Pure, so the admin preview page (app/admin/emails)
 * shows exactly what lands in the inbox.
 */
export function renderContactMessage(input: { name: string; email: string; message: string }): {
  subject: string;
  text: string;
} {
  return {
    subject: `Outrider inquiry from ${input.name}`,
    text: `From: ${input.name} <${input.email}>\n\n${input.message}`,
  };
}
