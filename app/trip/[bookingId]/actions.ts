"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/client-ip";
import { createPortalUrl, isBookingId, verifyPortalToken } from "@/lib/portal-token";
import { sendPortalLinkEmail } from "@/lib/email/portal-link";
import { SMS_CONSENT_FIELD, SMS_CONSENT_VERSION } from "@/lib/sms-consent";
import { MAX_LENGTHS, formText, parseIdentity } from "@/lib/traveler-details";
import {
  ABILITY_LEVELS,
  MAX_NAME_LENGTH,
  MAX_ROOMMATES,
  SKI_OR_BOARD,
  type PortalActionResult,
} from "./fields";

/*
 * Every write the trip portal makes.
 *
 * The portal has no session, so each action starts from nothing: the booking
 * id and the token arrive as hidden fields, and the token is verified against
 * that id again here. Checking it when the page rendered proves nothing about
 * this request, which anyone can post by hand.
 *
 * Writes go through the service-role client because there is no Supabase user
 * for RLS to recognise; rooming_requests and traveler_details have no policies
 * at all (see the add_post_booking_forms migration).
 *
 * Logging: booking ids and database error codes only. traveler_details holds
 * a date of birth, a legal name and phone numbers, and a console.error with
 * the row or the form in it would copy them into Vercel's logs, which have
 * none of that table's protection. Postgres puts the offending row in an
 * error's `details`, so that field is never logged either.
 */

/** The statuses the forms are open for. Pending has not paid; cancelled is done. */
const OPEN_STATUSES = ["deposit_paid", "paid_in_full"] as const;

const LINK_PROBLEM =
  "This link has expired or isn't valid. Reload the page and ask for a fresh link.";

type Authorized = { ok: true; bookingId: string } | { ok: false; result: PortalActionResult };

async function authorize(formData: FormData): Promise<Authorized> {
  const bookingId = String(formData.get("bookingId") ?? "").toLowerCase();
  const token = String(formData.get("t") ?? "");

  if (!verifyPortalToken(bookingId, token).ok) {
    return { ok: false, result: { ok: false, message: LINK_PROBLEM } };
  }

  // Per booking rather than per IP: the link is the credential, so this is
  // what bounds a leaked link being used to hammer the table. Generous, since
  // a real traveler fixing a typo a few times should never see it.
  if (!(await checkRateLimit(`portal:write:${bookingId}`, 30, 60 * 60))) {
    return {
      ok: false,
      result: { ok: false, message: "Too many changes in a short time. Try again in an hour." },
    };
  }

  const admin = createAdminClient();
  const { data: booking, error } = await admin
    .from("bookings")
    .select("status")
    .eq("id", bookingId)
    .maybeSingle();

  if (error) {
    console.error(`portal authorize(${bookingId}) failed: ${error.code} ${error.message}`);
    return { ok: false, result: { ok: false, message: "Something went wrong. Try again." } };
  }
  if (!booking || !(OPEN_STATUSES as readonly string[]).includes(booking.status)) {
    return {
      ok: false,
      result: {
        ok: false,
        message: "These forms open once your deposit has cleared, and close if a booking is canceled.",
      },
    };
  }

  return { ok: true, bookingId };
}


/* -- flights --------------------------------------------------------------- */

export async function setFlightsBooked(
  _prev: PortalActionResult | null,
  formData: FormData
): Promise<PortalActionResult> {
  const auth = await authorize(formData);
  if (!auth.ok) return auth.result;

  // Either way round: a traveler who ticked it by mistake can take it back.
  const booked = formData.get("booked") === "1";

  const { error } = await createAdminClient()
    .from("bookings")
    .update({ flights_booked: booked })
    .eq("id", auth.bookingId);

  if (error) {
    console.error(`setFlightsBooked(${auth.bookingId}) failed: ${error.code} ${error.message}`);
    return { ok: false, message: "That didn't save. Try again." };
  }

  revalidatePath(`/trip/${auth.bookingId}`);
  return { ok: true };
}

/* -- rooming --------------------------------------------------------------- */

export async function submitRoomingRequest(
  _prev: PortalActionResult | null,
  formData: FormData
): Promise<PortalActionResult> {
  const auth = await authorize(formData);
  if (!auth.ok) return auth.result;

  const noPreference = formData.get("noPreference") === "on";
  const names = formData
    .getAll("roommate")
    .map((v) => String(v).trim().replace(/\s+/g, " "))
    .filter(Boolean);

  if (names.some((n) => n.length > MAX_NAME_LENGTH)) {
    return { ok: false, message: `Keep each name under ${MAX_NAME_LENGTH} characters.` };
  }
  if (names.length > MAX_ROOMMATES) {
    return { ok: false, message: `Name up to ${MAX_ROOMMATES} people.` };
  }
  // The checkbox disables the name inputs in the browser, but a hand-made post
  // could send both. The table's CHECK would refuse it; say why here instead.
  if (noPreference && names.length > 0) {
    return { ok: false, message: "Either name people or choose no preference, not both." };
  }
  if (!noPreference && names.length === 0) {
    return { ok: false, message: "Name at least one person, or choose no preference." };
  }

  const admin = createAdminClient();

  // submitted_at is sent on every upsert, and the keep_first_submitted_at
  // trigger throws it away on an update. So the first request keeps its
  // place in the queue however many times it is edited, and nothing here has
  // to read before writing to get that right.
  const now = new Date().toISOString();
  const { data: saved, error } = await admin
    .from("rooming_requests")
    .upsert(
      {
        booking_id: auth.bookingId,
        roommate_names: noPreference ? [] : names,
        no_preference: noPreference,
        submitted_at: now,
        updated_at: now,
      },
      { onConflict: "booking_id" }
    )
    .select("submitted_at")
    .single();

  if (error || !saved) {
    console.error(`submitRoomingRequest(${auth.bookingId}) failed: ${error?.code} ${error?.message}`);
    return { ok: false, message: "That didn't save. Try again." };
  }

  // Mirrors the row onto bookings for list views and the follow-up email.
  // Copied from the row the trigger kept, so the two can never disagree.
  const { error: flagError } = await admin
    .from("bookings")
    .update({ rooming_submitted: true, rooming_submitted_at: saved.submitted_at })
    .eq("id", auth.bookingId);
  if (flagError) {
    // The request itself is saved, which is what room assignment reads, so
    // this is logged rather than reported as a failure.
    console.error(`rooming flag for ${auth.bookingId} failed: ${flagError.code} ${flagError.message}`);
  }

  revalidatePath(`/trip/${auth.bookingId}`);
  return { ok: true };
}

/* -- traveler details ------------------------------------------------------ */

/*
 * The gear half: ski or board, ability, sizes, dietary.
 *
 * The identity half (legal name, date of birth, school, phone, emergency
 * contact) is asked in checkout now, before the card
 * (app/(protected)/bookings/[id]/details/actions.ts), and only bookings paid
 * before that step existed still give it here. Which half this
 * form has to collect is decided HERE, from the row in the database, and
 * never from anything the browser sends: a post claiming the identity half is
 * already in must not be able to skip it.
 */
function parseGear(
  formData: FormData,
): { ok: true; values: GearValues } | { ok: false; fieldErrors: Record<string, string> } {
  const height = formText(formData, "height", MAX_LENGTHS.height);
  const weight = formText(formData, "weight", MAX_LENGTHS.weight);
  const shoeSize = formText(formData, "shoeSize", MAX_LENGTHS.shoeSize);
  const skiOrBoard = formText(formData, "skiOrBoard", 20);
  const abilityLevel = formText(formData, "abilityLevel", 20);
  // Line breaks are kept here: allergies are often a short list.
  const dietary = String(formData.get("dietaryRestrictions") ?? "")
    .trim()
    .slice(0, MAX_LENGTHS.dietaryRestrictions);

  const fieldErrors: Record<string, string> = {};
  if (!height) fieldErrors.height = "The rental shop needs this to fit your gear.";
  if (!weight) fieldErrors.weight = "The rental shop needs this to set your bindings.";
  if (!shoeSize) fieldErrors.shoeSize = "The rental shop needs this to fit your boots.";
  if (!SKI_OR_BOARD.some((o) => o.value === skiOrBoard)) fieldErrors.skiOrBoard = "Choose one.";
  if (!ABILITY_LEVELS.some((o) => o.value === abilityLevel)) fieldErrors.abilityLevel = "Choose one.";

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  return {
    ok: true,
    values: {
      height,
      weight,
      shoe_size: shoeSize,
      ski_or_board: skiOrBoard,
      ability_level: abilityLevel,
      dietary_restrictions: dietary || null,
    },
  };
}

type GearValues = {
  height: string;
  weight: string;
  shoe_size: string;
  ski_or_board: string;
  ability_level: string;
  dietary_restrictions: string | null;
};

export async function submitTravelerDetails(
  _prev: PortalActionResult | null,
  formData: FormData
): Promise<PortalActionResult> {
  const auth = await authorize(formData);
  if (!auth.ok) return auth.result;

  const admin = createAdminClient();

  /*
   * Does the identity half already exist? Every traveler_details row carries
   * it by construction (both writers require it), so the row existing is the
   * answer, and asking for a timestamp keeps this page's rule intact: no
   * legal name, date of birth or phone number is ever read back out here.
   */
  const { data: existing, error: lookupError } = await admin
    .from("traveler_details")
    .select("submitted_at")
    .eq("booking_id", auth.bookingId)
    .maybeSingle();

  if (lookupError) {
    console.error(`travelerDetails lookup(${auth.bookingId}) failed: ${lookupError.code} ${lookupError.message}`);
    return { ok: false, message: "That didn't save. Try again." };
  }

  const gear = parseGear(formData);
  const identity = existing ? null : parseIdentity(formData);

  const fieldErrors = {
    ...(gear.ok ? {} : gear.fieldErrors),
    ...(identity && !identity.ok ? identity.fieldErrors : {}),
  };
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "A few things need another look.", fieldErrors };
  }
  if (!gear.ok || (identity && !identity.ok)) {
    // Unreachable: both branches above already returned. Here for the narrowing.
    return { ok: false, message: "A few things need another look." };
  }

  /*
   * Only the columns this form is responsible for are named. A traveler who
   * gave their name in checkout and their sizes here keeps both:
   * the identity columns are left out of the upsert entirely rather than sent
   * as blanks. submitted_at is pinned to the first write by the table's
   * keep_first_submitted_at trigger.
   */
  const now = new Date().toISOString();
  // An update, not an upsert, when the row is already there: an upsert has to
  // carry a whole insertable row, which would mean sending the identity
  // columns this form no longer has. Naming only the gear columns is what
  // leaves checkout's half untouched.
  const { error } = existing
    ? await admin
        .from("traveler_details")
        .update({ ...gear.values, updated_at: now })
        .eq("booking_id", auth.bookingId)
    : await admin.from("traveler_details").insert({
        booking_id: auth.bookingId,
        ...identity!.values,
        ...gear.values,
        updated_at: now,
      });

  if (error) {
    // Code and message only. `details` would contain the row.
    console.error(`submitTravelerDetails(${auth.bookingId}) failed: ${error.code} ${error.message}`);
    return { ok: false, message: "That didn't save. Try again." };
  }

  // Now, and only now, is the task done: the gear half is what the rental
  // shop was waiting on, and this flag is what stops the 72-hour chase.
  const { error: flagError } = await admin
    .from("bookings")
    .update({ details_submitted: true })
    .eq("id", auth.bookingId);
  if (flagError) {
    console.error(`details flag for ${auth.bookingId} failed: ${flagError.code} ${flagError.message}`);
  }

  // The text-message box under the phone field. Optional, and only a tick
  // does anything: an unticked box on a later "Replace my details" leaves an
  // earlier yes where it is, because opting out is by replying STOP, not by
  // leaving a box empty. The details are already saved, so a failure here
  // does not fail the form: it is logged, and the page then shows the
  // separate "Text me trip updates" row, since consent is still false.
  if (formData.get(SMS_CONSENT_FIELD) === "on") {
    await recordSmsConsent(auth.bookingId);
  }

  revalidatePath(`/trip/${auth.bookingId}`);
  return { ok: true };
}

/* -- text messages --------------------------------------------------------- */

/**
 * The evidence if consent to texts is ever questioned: the tick, the server's
 * clock (not the browser's), and which wording was on screen
 * (lib/sms-consent.ts). Only written over a no, so a traveler who already
 * agreed keeps the time and the wording of their first yes.
 *
 * Returns false when it did not save (already logged).
 */
async function recordSmsConsent(bookingId: string): Promise<boolean> {
  const { error } = await createAdminClient()
    .from("bookings")
    .update({
      sms_consent: true,
      sms_consent_at: new Date().toISOString(),
      sms_consent_text_version: SMS_CONSENT_VERSION,
    })
    .eq("id", bookingId)
    .eq("sms_consent", false);

  if (error) {
    console.error(`recordSmsConsent(${bookingId}) failed: ${error.code} ${error.message}`);
    return false;
  }
  return true;
}

/**
 * Opting in to texts on its own, for a traveler who sent their details
 * without ticking the box. Needs those details first: the number texts go to
 * is the one on that form.
 */
export async function optInToTexts(
  _prev: PortalActionResult | null,
  formData: FormData
): Promise<PortalActionResult> {
  const auth = await authorize(formData);
  if (!auth.ok) return auth.result;

  // The box is required in the browser; a hand-made post without it is not
  // consent, whatever else it says.
  if (formData.get(SMS_CONSENT_FIELD) !== "on") {
    return { ok: false, message: "Tick the box to agree to trip texts." };
  }

  const { data: details, error } = await createAdminClient()
    .from("traveler_details")
    .select("booking_id")
    .eq("booking_id", auth.bookingId)
    .maybeSingle();

  if (error) {
    console.error(`optInToTexts(${auth.bookingId}) lookup failed: ${error.code} ${error.message}`);
    return { ok: false, message: "That didn't save. Try again." };
  }
  if (!details) {
    return { ok: false, message: "Send your traveler details first, so we have a number to text." };
  }

  if (!(await recordSmsConsent(auth.bookingId))) {
    return { ok: false, message: "That didn't save. Try again." };
  }

  revalidatePath(`/trip/${auth.bookingId}`);
  return { ok: true };
}

/* -- a fresh link ---------------------------------------------------------- */

const FRESH_LINK_SENT =
  "If this booking is ours, a fresh link is on its way to the email address it was made with. It can take a few minutes.";

/**
 * Sends a new portal link for a booking whose link has lapsed.
 *
 * It only ever goes to the email on the booking's account. There is no
 * address field: somebody holding a forwarded, expired link must not be able
 * to redirect a working one to themselves. And the answer is the same whether
 * the booking exists, the send worked or the rate limit tripped, so the page
 * cannot be used to find out which booking ids are real.
 */
export async function requestFreshPortalLink(
  _prev: PortalActionResult | null,
  formData: FormData
): Promise<PortalActionResult> {
  const bookingId = String(formData.get("bookingId") ?? "").toLowerCase();
  const done: PortalActionResult = { ok: true, message: FRESH_LINK_SENT };

  if (!isBookingId(bookingId)) return done;

  // Two limits. Per IP stops one person spraying requests across many ids;
  // per booking stops a group chat full of people with the same stale link
  // flooding its owner's inbox.
  const [ipAllowed, bookingAllowed] = await Promise.all([
    checkRateLimit(`portal:link:ip:${await clientIp()}`, 5, 60 * 60),
    checkRateLimit(`portal:link:booking:${bookingId}`, 3, 24 * 60 * 60),
  ]);
  if (!ipAllowed || !bookingAllowed) return done;

  const admin = createAdminClient();
  const { data: booking, error } = await admin
    .from("bookings")
    .select("id, status, users(email, name), trips(name)")
    .eq("id", bookingId)
    .maybeSingle();

  if (error) {
    console.error(`requestFreshPortalLink(${bookingId}) lookup failed: ${error.code} ${error.message}`);
    return done;
  }
  if (!booking || booking.status === "cancelled" || !booking.users?.email) return done;

  const portalUrl = createPortalUrl(booking.id);
  if (!portalUrl) return done; // PORTAL_TOKEN_SECRET missing; already logged.

  try {
    await sendPortalLinkEmail({
      to: booking.users.email,
      name: booking.users.name,
      tripName: booking.trips?.name ?? "your trip",
      portalUrl,
    });
  } catch (err) {
    console.error(
      `requestFreshPortalLink(${bookingId}) send failed: ${err instanceof Error ? err.message : "unknown error"}`
    );
  }

  return done;
}
