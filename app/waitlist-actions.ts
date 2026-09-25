"use server";

import { headers } from "next/headers";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendWaitlistNotification, sendWaitlistWelcome } from "@/lib/email/send";
import { sendEarlyAccessOnJoin } from "@/lib/early-access";
import { clientIp } from "@/lib/client-ip";
import type { Database } from "@/types/supabase";
import { WAITLIST_CONSENT_VERSION } from "@/lib/waitlist-consent";
import {
  validateWaitlist,
  type CleanWaitlistInput,
  type WaitlistFieldErrors,
  type WaitlistInput,
} from "@/lib/waitlist-signup";

const UNIQUE_VIOLATION = "23505";
// PostgREST's "column not in the schema cache", and Postgres's own
// undefined_column. Either means the database is behind the code.
const MISSING_COLUMN = "PGRST204";
const UNKNOWN_COLUMN = "42703";

export type JoinResult =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: WaitlistFieldErrors };

/**
 * Where a signup came from: which form on the site, and the campaign that
 * brought the visitor in. Nothing here is personal. It exists so the team can
 * tell whether the Instagram bio or a chapter group chat is what fills the
 * list, which is the one question the list itself cannot answer.
 *
 * `src` is the short tag on a link the team hands out (?src=launch on the
 * event QR code). It is stored on the row, so one night's signups can be
 * pulled out with a single filter.
 */
export type SignupContext = {
  placement?: string;
  src?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  referrer?: string;
};

// Every field arrives from the browser, so each is trimmed to a short token
// before it gets anywhere near an email body or a column. Anything that does
// not look like a campaign tag is dropped rather than repaired.
function cleanContext(raw: unknown): SignupContext {
  if (!raw || typeof raw !== "object") return {};
  const out: SignupContext = {};
  for (const key of ["placement", "source", "medium", "campaign", "referrer"] as const) {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value !== "string") continue;
    const token = value.trim().slice(0, 80);
    if (/^[\w.\-+ /:]+$/.test(token)) out[key] = token;
  }
  // Stricter than the rest, and lowercased, because it is the column people
  // filter on: "Launch" and "launch " should not be two different nights.
  const src = (raw as Record<string, unknown>).src;
  if (typeof src === "string") {
    const token = src.trim().toLowerCase();
    if (/^[a-z0-9_-]{1,40}$/.test(token)) out.src = token;
  }
  return out;
}

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

/** The columns a repeat signup is compared against. */
type ExistingRow = {
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email_consent: boolean | null;
  sms_consent: boolean | null;
  src: string | null;
  placement: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  unsubscribed_at: string | null;
};

/** Who submitted the consent, as far as the request can tell us. */
type ConsentEvidence = { ip: string | null; userAgent: string | null };

export async function joinWaitlist(
  rawInput: WaitlistInput,
  rawContext?: SignupContext,
): Promise<JoinResult> {
  const context = cleanContext(rawContext);

  // Checked before the rate limit, so someone fixing a mistyped phone number
  // does not spend their attempts on it.
  const checked = validateWaitlist(rawInput ?? {});
  if (!checked.ok) {
    return { ok: false, message: "Check the highlighted fields.", fieldErrors: checked.errors };
  }
  const input = checked.data;

  // Server actions are public endpoints like any other, and this one is
  // pre-auth, so there's no user id to throttle on: fall back to IP, the same
  // way the booking flow's anonymous steps do.
  //
  // 40 per ten minutes, not the 5 an hour it used to be. The list gets handed
  // out as a QR code at events, where a room full of phones is behind one
  // venue Wi-Fi address or one carrier's shared address, and the sixth person
  // in an hour was being told to try later. This still stops a script.
  const ip = await clientIp();
  const allowed = await checkRateLimit(`waitlist:${ip}`, 40, 10 * 60);
  if (!allowed) {
    return { ok: false, message: "Too many attempts. Try again in a few minutes." };
  }

  const h = await headers();
  const evidence: ConsentEvidence = {
    ip: ip === "unknown" ? null : ip,
    userAgent: h.get("user-agent")?.slice(0, 300) ?? null,
  };

  const existing = await findExisting(input.email);

  // Someone who unsubscribed stays unsubscribed. A signup form is not consent
  // from the address's owner (anyone can type anyone's email), so it must not
  // undo an unsubscribe, here or in the Resend audience. They get the same
  // answer as everyone else, so the form cannot be used to learn who is on the
  // list or who left it; to come back they use the link in an old email, or
  // write to us. On a failed read this carries on as before: a lost signup is
  // worse than the rare re-add the insert below would refuse anyway.
  if (existing.row?.unsubscribed_at) {
    return { ok: true };
  }

  // Two independent destinations, written concurrently so the visitor waits
  // on the slower one rather than the sum. The table is the durable record
  // we control; the Resend audience is what the list actually gets mailed
  // from. Neither is allowed to sink the other.
  //
  // allSettled, not all: `all` rejects the moment one side throws, which on
  // a serverless host tears the invocation down with the other write still
  // in flight. That silently dropped signups depending on which finished
  // first. Settling both means the write is always awaited to completion.
  const [storedResult, syncedResult] = await Promise.allSettled([
    storeSignup(input, context, evidence, existing),
    // Names go to Resend only when the row has none yet (a new signup, or an
    // email-only one from before the form asked). Resend upserts a repeat
    // address, so sending them again would overwrite what is there, which the
    // table refuses to do for the same reason (see mergeRepeat).
    addToAudience(input, !existing.row?.first_name && !existing.row?.last_name),
  ]);

  const stored =
    storedResult.status === "fulfilled" ? storedResult.value : { ok: false, isNew: false, token: undefined };
  const synced = syncedResult.status === "fulfilled" && syncedResult.value;

  if (storedResult.status === "rejected") {
    console.error("Waitlist write threw:", storedResult.reason);
  }
  if (syncedResult.status === "rejected") {
    console.error("Resend audience sync threw:", syncedResult.reason);
  }

  // Only a total loss is worth telling them about: if either side captured
  // the address, they are on the list and saying otherwise would push them
  // to submit again for nothing.
  if (!stored.ok && !synced) {
    return { ok: false, message: "Something went wrong. Try again." };
  }

  // Keyed off the table rather than Resend, which upserts a repeat signup to
  // the same contact id and so can't tell us whether this address is new.
  if (stored.isNew) {
    // The welcome is what carries the unsubscribe link. Until it existed the
    // first message anyone got was going to be a bulk announcement, so the
    // "unsubscribe link in any of those messages" the privacy policy promises
    // did not yet exist anywhere. Failure is logged, never surfaced: they are
    // on the list either way, and telling them otherwise invites a resubmit.
    // During the list's head start a new signup gets their booking link
    // instead: the trip is public, and joining is how you book. It carries
    // the same unsubscribe link, so it does the welcome's job too. Anything
    // short of a sent link falls through to the ordinary welcome.
    const linkSent =
      stored.token && stored.earlyToken
        ? await sendEarlyAccessOnJoin(input.email, { earlyAccess: stored.earlyToken, unsubscribe: stored.token })
        : false;

    if (linkSent) {
      // Sent and stamped; nothing more to do for this address.
    } else if (stored.token) {
      try {
        await sendWaitlistWelcome(input.email, stored.token);
      } catch (err) {
        // Loud and specific. The first time this failed in production it was a
        // missing EMAIL_FROM_ADDRESS, and the only evidence was silence: the
        // row was written, the Resend contact was created, and the person got
        // nothing. Nobody reads a log that does not say what broke.
        console.error(
          "WAITLIST WELCOME FAILED: the signup was recorded and the contact synced, but no email was sent.",
          err,
        );
      }
    } else {
      // Previously skipped in silence, which is how the same failure could
      // happen again without leaving a trace.
      console.error(
        "WAITLIST WELCOME SKIPPED: no unsubscribe token came back from the insert, so no email could be sent.",
      );
    }

    try {
      // Name and tag only. The phone number stays in the database rather than
      // travelling around in a team inbox.
      await sendWaitlistNotification(input.email, {
        ...context,
        name: `${input.firstName} ${input.lastName}`,
      });
    } catch (err) {
      console.error("Waitlist notification failed (signup still recorded):", err);
    }
  }

  return { ok: true };
}

/**
 * The row for this address, if there is one. `failed` means the read itself
 * went wrong, in which case the write goes ahead as an insert and the unique
 * constraint catches a repeat.
 */
async function findExisting(email: string): Promise<{ row: ExistingRow | null; failed: boolean }> {
  const { data, error } = await createAdminClient()
    .from("waitlist_signups")
    .select(
      "first_name, last_name, phone, email_consent, sms_consent, src, placement, utm_source, utm_medium, utm_campaign, unsubscribed_at",
    )
    .eq("email", email)
    .maybeSingle();
  if (error) {
    console.error(`Waitlist lookup failed: ${error.code} ${error.message}`);
    return { row: null, failed: true };
  }
  return { row: (data as ExistingRow | null) ?? null, failed: false };
}

async function storeSignup(
  input: CleanWaitlistInput,
  context: SignupContext,
  evidence: ConsentEvidence,
  existing: { row: ExistingRow | null; failed: boolean },
): Promise<{ ok: boolean; isNew: boolean; token?: string; earlyToken?: string }> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  if (!existing.row) {
    // Service-role: waitlist_signups has no policies and no grants for anon
    // or authenticated, the same shape as the other pre-auth writes in this
    // app. The token comes back on the same round trip, because the welcome
    // email cannot be sent without it.
    const { data, error } = await admin
      .from("waitlist_signups")
      .insert({
        email: input.email,
        first_name: input.firstName,
        last_name: input.lastName,
        phone: input.phone,
        email_consent: true,
        email_consent_at: now,
        // The answer and when it was given, whichever way it went.
        sms_consent: input.smsConsent,
        sms_consent_at: now,
        consent_text_version: WAITLIST_CONSENT_VERSION,
        consent_ip: evidence.ip,
        consent_user_agent: evidence.userAgent,
        src: context.src ?? null,
        placement: context.placement ?? null,
        utm_source: context.source ?? null,
        utm_medium: context.medium ?? null,
        utm_campaign: context.campaign ?? null,
      })
      // Both tokens: the welcome needs the unsubscribe one, and during the
      // list's head start the booking link needs the other (lib/early-access.ts).
      .select("unsubscribe_token, early_access_token")
      .single();

    if (!error) {
      return { ok: true, isNew: true, token: data?.unsubscribe_token, earlyToken: data?.early_access_token };
    }

    // The columns this writes arrived in migration
    // 20260924120000_waitlist_contact_and_consent. If this code ever runs
    // against a database without them, keep the address rather than lose the
    // signup: an email-only row is what the list held before, and the name
    // and phone can be asked for again. Loud, because it means the migration
    // is missing.
    if (error.code === MISSING_COLUMN || error.code === UNKNOWN_COLUMN) {
      console.error(
        `WAITLIST DETAILS NOT STORED: waitlist_signups is missing the new columns (${error.message}). Stored the email only. Apply the waitlist_contact_and_consent migration.`,
      );
      const fallback = await admin
        .from("waitlist_signups")
        .insert({ email: input.email })
        .select("unsubscribe_token, early_access_token")
        .single();
      if (!fallback.error) {
        return {
          ok: true,
          isNew: true,
          token: fallback.data?.unsubscribe_token,
          earlyToken: fallback.data?.early_access_token,
        };
      }
      if (fallback.error.code === UNIQUE_VIOLATION) return { ok: true, isNew: false };
      console.error(`Waitlist fallback insert failed: ${fallback.error.code} ${fallback.error.message}`);
      return { ok: false, isNew: false };
    }

    if (error.code !== UNIQUE_VIOLATION) {
      console.error(`Waitlist insert failed: ${error.code} ${error.message}`);
      return { ok: false, isNew: false };
    }
    // Lost a race with a second submit of the same address (a double tap),
    // or the lookup failed. Either way the row exists now: merge into it.
    const again = await findExisting(input.email);
    if (!again.row) return { ok: true, isNew: false };
    if (again.row.unsubscribed_at) return { ok: true, isNew: false };
    return mergeRepeat(input, context, evidence, again.row, now);
  }

  return mergeRepeat(input, context, evidence, existing.row, now);
}

/**
 * Signing up twice is a normal thing to do, not a failure. What it may change
 * is narrow, because the form is open to anyone and anyone can type anyone's
 * email:
 *
 *   - Blanks are filled (a name or number on an email-only row from before
 *     the form asked for them). A stored name or number is never overwritten.
 *   - Consent only ever goes from no to yes, and a yes keeps the timestamp of
 *     the first time it was given. Nothing on the form takes consent away; the
 *     unsubscribe link and STOP do that.
 *   - A yes to texts is recorded only for the number already on the row (or
 *     when there was none), so nobody can opt a stranger's phone in by typing
 *     their email.
 *   - Where they came from (src and the campaign tags) is first touch: kept
 *     from the first signup, filled only if blank.
 *   - An unsubscribe is never cleared from here (see joinWaitlist).
 */
async function mergeRepeat(
  input: CleanWaitlistInput,
  context: SignupContext,
  evidence: ConsentEvidence,
  row: ExistingRow,
  now: string,
): Promise<{ ok: boolean; isNew: boolean }> {
  const patch: Database["public"]["Tables"]["waitlist_signups"]["Update"] = {};

  if (!row.first_name) patch.first_name = input.firstName;
  if (!row.last_name) patch.last_name = input.lastName;
  if (!row.phone) patch.phone = input.phone;

  let consentChanged = false;
  if (row.email_consent !== true) {
    patch.email_consent = true;
    patch.email_consent_at = now;
    consentChanged = true;
  }

  const samePhone = !row.phone || row.phone === input.phone;
  if (input.smsConsent && row.sms_consent !== true && samePhone) {
    patch.sms_consent = true;
    patch.sms_consent_at = now;
    consentChanged = true;
  } else if (!input.smsConsent && row.sms_consent === null) {
    // First time this row has been asked: record the no, so "never asked"
    // and "said no" stay distinguishable.
    patch.sms_consent = false;
    patch.sms_consent_at = now;
    consentChanged = true;
  }

  if (consentChanged) {
    patch.consent_text_version = WAITLIST_CONSENT_VERSION;
    patch.consent_ip = evidence.ip;
    patch.consent_user_agent = evidence.userAgent;
  }

  if (!row.src && context.src) patch.src = context.src;
  if (!row.placement && context.placement) patch.placement = context.placement;
  if (!row.utm_source && context.source) patch.utm_source = context.source;
  if (!row.utm_medium && context.medium) patch.utm_medium = context.medium;
  if (!row.utm_campaign && context.campaign) patch.utm_campaign = context.campaign;

  if (Object.keys(patch).length === 0) return { ok: true, isNew: false };
  patch.updated_at = now;

  const { error } = await createAdminClient()
    .from("waitlist_signups")
    .update(patch)
    .eq("email", input.email)
    // Guarded again at write time: an unsubscribe that lands between the read
    // and this update is not undone.
    .is("unsubscribed_at", null);

  if (error) {
    // The address is already on the list, so this is not a lost signup.
    console.error(`Waitlist repeat update failed: ${error.code} ${error.message}`);
  }
  return { ok: true, isNew: false };
}

async function addToAudience(input: CleanWaitlistInput, withNames: boolean): Promise<boolean> {
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
    email: input.email,
    ...(withNames ? { firstName: input.firstName, lastName: input.lastName } : {}),
  });

  if (error) {
    console.error(`Resend contacts.create failed: ${error.name} ${error.message}`);
    return false;
  }

  return true;
}
