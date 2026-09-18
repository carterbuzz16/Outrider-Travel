"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/client-ip";
import { createPortalUrl, isBookingId, verifyPortalToken } from "@/lib/portal-token";
import { sendPortalLinkEmail } from "@/lib/email/portal-link";
import { SMS_CONSENT_FIELD, SMS_CONSENT_VERSION } from "@/lib/sms-consent";
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
  "This link has expired or is not valid. Reload the page and ask for a fresh link.";

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
        message: "These forms open once your deposit has cleared, and close if a booking is cancelled.",
      },
    };
  }

  return { ok: true, bookingId };
}

function text(formData: FormData, name: string, max: number): string {
  return String(formData.get(name) ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, max);
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
    return { ok: false, message: "That did not save. Try again." };
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
    return { ok: false, message: "That did not save. Try again." };
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

// Loose on purpose: international numbers, extensions and whatever
// punctuation people use. Seven to fifteen digits (E.164's ceiling), with an
// optional leading +.
function phoneDigits(raw: string): string | null {
  if (!/^\+?[\d\s().\-]+$/.test(raw)) return null;
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15 ? digits : null;
}

// Plausible for someone on this trip: not born in the future and not in the
// 1800s. The floor is 16 rather than 18 because the odd first-year is 17, and
// whether a minor can travel is a policy call for the team, not a form error.
const MIN_AGE = 16;
const MAX_AGE = 100;

function checkDateOfBirth(raw: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return "Enter your date of birth.";
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const dob = new Date(Date.UTC(year, month - 1, day));
  // Rejects 2006-02-31, which Date would roll over into March.
  if (dob.getUTCFullYear() !== year || dob.getUTCMonth() !== month - 1 || dob.getUTCDate() !== day) {
    return "That date does not exist.";
  }

  const now = new Date();
  let age = now.getUTCFullYear() - year;
  if (now.getUTCMonth() < month - 1 || (now.getUTCMonth() === month - 1 && now.getUTCDate() < day)) {
    age -= 1;
  }
  if (age < MIN_AGE || age > MAX_AGE) return "Check the year of your date of birth.";
  return null;
}

export async function submitTravelerDetails(
  _prev: PortalActionResult | null,
  formData: FormData
): Promise<PortalActionResult> {
  const auth = await authorize(formData);
  if (!auth.ok) return auth.result;

  const legalName = text(formData, "legalName", 200);
  const dateOfBirth = text(formData, "dateOfBirth", 10);
  const phone = text(formData, "phone", 40);
  const emergencyName = text(formData, "emergencyContactName", 200);
  const emergencyPhone = text(formData, "emergencyContactPhone", 40);
  const height = text(formData, "height", 40);
  const weight = text(formData, "weight", 40);
  const shoeSize = text(formData, "shoeSize", 40);
  const skiOrBoard = text(formData, "skiOrBoard", 20);
  const abilityLevel = text(formData, "abilityLevel", 20);
  // Line breaks are kept here: allergies are often a short list.
  const dietary = String(formData.get("dietaryRestrictions") ?? "").trim().slice(0, 1000);

  const fieldErrors: Record<string, string> = {};

  if (legalName.length < 2) fieldErrors.legalName = "Enter your name as it appears on your ID.";
  const dobError = checkDateOfBirth(dateOfBirth);
  if (dobError) fieldErrors.dateOfBirth = dobError;

  const ownDigits = phoneDigits(phone);
  if (!ownDigits) fieldErrors.phone = "Enter a phone number, including the area code.";
  if (emergencyName.length < 2) fieldErrors.emergencyContactName = "Enter someone we can call.";
  const emergencyDigits = phoneDigits(emergencyPhone);
  if (!emergencyDigits) {
    fieldErrors.emergencyContactPhone = "Enter their phone number, including the area code.";
  } else if (ownDigits && emergencyDigits === ownDigits) {
    fieldErrors.emergencyContactPhone = "Use someone other than yourself, who will not be on the trip.";
  }

  if (!height) fieldErrors.height = "The rental shop needs this to fit your gear.";
  if (!weight) fieldErrors.weight = "The rental shop needs this to set your bindings.";
  if (!shoeSize) fieldErrors.shoeSize = "The rental shop needs this to fit your boots.";
  if (!SKI_OR_BOARD.some((o) => o.value === skiOrBoard)) fieldErrors.skiOrBoard = "Choose one.";
  if (!ABILITY_LEVELS.some((o) => o.value === abilityLevel)) fieldErrors.abilityLevel = "Choose one.";

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "A few things need another look.", fieldErrors };
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  // Whole-row replace: "Replace my details" starts from an empty form, so
  // every field is sent every time and nothing stale survives a resubmit.
  // submitted_at is pinned to the first submission by the table's trigger.
  const { error } = await admin.from("traveler_details").upsert(
    {
      booking_id: auth.bookingId,
      legal_name: legalName,
      date_of_birth: dateOfBirth,
      phone,
      emergency_contact_name: emergencyName,
      emergency_contact_phone: emergencyPhone,
      height,
      weight,
      shoe_size: shoeSize,
      ski_or_board: skiOrBoard,
      ability_level: abilityLevel,
      dietary_restrictions: dietary || null,
      submitted_at: now,
      updated_at: now,
    },
    { onConflict: "booking_id" }
  );

  if (error) {
    // Code and message only. `details` would contain the row.
    console.error(`submitTravelerDetails(${auth.bookingId}) failed: ${error.code} ${error.message}`);
    return { ok: false, message: "That did not save. Try again." };
  }

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
    return { ok: false, message: "That did not save. Try again." };
  }
  if (!details) {
    return { ok: false, message: "Send your traveler details first, so we have a number to text." };
  }

  if (!(await recordSmsConsent(auth.bookingId))) {
    return { ok: false, message: "That did not save. Try again." };
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
