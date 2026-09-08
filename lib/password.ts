/**
 * The one place the password rule is written down.
 *
 * It lives outside app/auth/actions.ts because that file is `"use server"`,
 * and a server-action module may only export async functions — a shared
 * constant exported from there is a build error. Both the forms (which state
 * the rule up front and set `minLength`) and the actions (which enforce it
 * again, since a form field is only a suggestion) read it from here.
 *
 * Eight rather than Supabase's default six. Supabase enforces its own minimum
 * on top of this; if the dashboard minimum is still six, this is simply the
 * stricter of the two and the user never sees Supabase's message.
 */
export const MIN_PASSWORD_LENGTH = 8;

/** Said before they submit, in the field hint. */
export const PASSWORD_RULE = `At least ${MIN_PASSWORD_LENGTH} characters.`;

/**
 * Server-side check for the two password boxes. Returns customer-facing copy
 * for the first problem found, or null when the pair is acceptable.
 */
export function checkPasswordPair(password: string, confirmation: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Passwords need at least ${MIN_PASSWORD_LENGTH} characters. Yours is shorter.`;
  }
  if (password !== confirmation) {
    return "Those two passwords are not the same. Type the second one again.";
  }
  return null;
}
