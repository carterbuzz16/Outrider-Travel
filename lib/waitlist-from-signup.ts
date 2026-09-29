import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { addContactToAudience } from "@/lib/resend-audience";
import { SIGNUP_EMAIL_CONSENT_VERSION } from "@/lib/waitlist-consent";

/*
 * Puts a new account on the email list, when its owner ticked "Okay to email
 * me about Outrider trips" on the signup form (app/auth/actions.ts). The list
 * is waitlist_signups plus the Resend audience, the same two places the
 * waitlist form writes, so everything sent to the list (the reminders, the
 * next trip) reaches them too, with the same unsubscribe link.
 *
 * Only a new row. An address already on the list is left exactly as it is:
 * someone who unsubscribed stays unsubscribed (a form anyone can type an
 * address into is not the owner undoing that), and someone already on it has
 * nothing to add. No welcome email either: signup has just sent the account
 * confirmation, and a second message at the same moment is noise.
 *
 * Never throws and never blocks the signup: the account matters more than
 * the list, so a failure here is logged and nothing else.
 */
export async function joinListFromSignup(input: {
  email: string;
  name: string;
  ip: string | null;
  userAgent: string | null;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: existing, error: readError } = await admin
      .from("waitlist_signups")
      .select("id")
      .eq("email", input.email)
      .maybeSingle();
    if (readError) {
      console.error(`signup list opt-in: read failed: ${readError.code} ${readError.message}`);
      return;
    }
    if (existing) return;

    const [firstName, ...rest] = input.name.trim().split(/\s+/);
    const lastName = rest.join(" ");
    const now = new Date().toISOString();

    const { error } = await admin.from("waitlist_signups").insert({
      email: input.email,
      first_name: firstName || null,
      last_name: lastName || null,
      email_consent: true,
      email_consent_at: now,
      // The signup form does not ask about texts, so there is no answer to
      // record: null, not false.
      consent_text_version: SIGNUP_EMAIL_CONSENT_VERSION,
      consent_ip: input.ip,
      consent_user_agent: input.userAgent,
      src: "signup",
      placement: "signup-form",
    });
    // 23505: the address landed on the list between the read and the insert
    // (a double submit). It is on the list, which is all this wanted.
    if (error && error.code !== "23505") {
      console.error(`signup list opt-in: insert failed: ${error.code} ${error.message}`);
      return;
    }
    if (!error) {
      await addContactToAudience({ email: input.email, firstName, lastName: lastName || null });
    }
  } catch (err) {
    console.error(`signup list opt-in threw: ${err instanceof Error ? err.message : err}`);
  }
}
