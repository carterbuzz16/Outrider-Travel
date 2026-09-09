import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";

/**
 * Take somebody off the list, in both places it exists.
 *
 * Addressed by an opaque token rather than the email address. An address in an
 * unsubscribe URL sits in browser history, referrer headers and server logs,
 * and worse, it lets anyone unsubscribe anyone else by editing the query
 * string. The token is per row and unguessable.
 *
 * The row is marked rather than deleted, so a later signup can tell "never
 * joined" from "left", and so the record of what was consented to survives.
 *
 * Returns true when the token matched something. A token that matches nothing
 * is reported as success to the caller anyway: the page must not become a way
 * to test whether a token, and therefore a subscriber, exists.
 */
export async function unsubscribeByToken(token: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return false;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("waitlist_signups")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("unsubscribe_token", token)
    .is("unsubscribed_at", null)
    .select("email")
    .maybeSingle();

  if (error) {
    console.error("Unsubscribe update failed:", error.message);
    return false;
  }
  if (!data?.email) return false;

  // Resend holds the mailing audience, so leaving the database row marked but
  // the contact subscribed would keep sending to somebody who opted out. The
  // contact is marked rather than deleted, which is what stops a later import
  // quietly resubscribing them.
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  const key = process.env.RESEND_CONTACTS_API_KEY || process.env.RESEND_API_KEY;
  if (audienceId && key) {
    try {
      await new Resend(key).contacts.update({
        audienceId,
        email: data.email,
        unsubscribed: true,
      });
    } catch (err) {
      // The database is already marked, which is what our own sends read, so
      // this is logged rather than surfaced or retried.
      console.error("Resend unsubscribe sync failed:", err);
    }
  }

  return true;
}
