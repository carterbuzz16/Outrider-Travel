import "server-only";
import { Resend } from "resend";

/*
 * Adding someone to the Resend audience the list is mailed from. Shared by the
 * waitlist form (app/waitlist-actions.ts) and the account signup form's email
 * opt-in (lib/waitlist-from-signup.ts), so both add a contact the same way.
 *
 * Not in waitlist-actions.ts on purpose: everything a "use server" file
 * exports is a public endpoint.
 */

// Adding a contact needs audience access. RESEND_API_KEY may be scoped to
// sending only, in which case give this one a key that can write contacts;
// otherwise it falls back and the single key does both.
function contactsClient(): Resend {
  const key = process.env.RESEND_CONTACTS_API_KEY || process.env.RESEND_API_KEY;
  // new Resend(undefined) throws rather than returning an error, so check
  // first and let the caller turn it into an ordinary failed sync.
  if (!key) {
    throw new Error("Neither RESEND_CONTACTS_API_KEY nor RESEND_API_KEY is set.");
  }
  return new Resend(key);
}

/**
 * True when the contact is in the audience. Names are sent only when given:
 * Resend upserts a repeat address, so passing them again would overwrite what
 * is there.
 */
export async function addContactToAudience(contact: {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}): Promise<boolean> {
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!audienceId) {
    console.error("RESEND_AUDIENCE_ID is not set: signup stored but not synced to Resend.");
    return false;
  }

  // Resend renamed audiences to "segments"; same objects, same ids, and the
  // SDK still takes one under `audienceId`. A repeat address is upserted
  // onto the existing contact rather than returning an error. `unsubscribed`
  // is left out rather than sent as false, so a repeat signup never flips a
  // contact who unsubscribed through Resend back on; a new contact starts
  // subscribed either way.
  const { error } = await contactsClient().contacts.create({
    audienceId,
    email: contact.email,
    ...(contact.firstName ? { firstName: contact.firstName } : {}),
    ...(contact.lastName ? { lastName: contact.lastName } : {}),
  });

  if (error) {
    console.error(`Resend contacts.create failed: ${error.name} ${error.message}`);
    return false;
  }
  return true;
}
