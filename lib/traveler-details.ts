/*
 * Traveler details, now asked in two halves.
 *
 * WHO THEY ARE comes first, as its own checkout step between the package and
 * the card: legal name, date of birth, school, phone and an emergency
 * contact. Before the card, so no place is paid for without a named traveler
 * behind it, and the Terms ticked on the payment step belong to that person.
 * The payment step and acceptTermsForBooking both refuse to go on without it.
 *
 * WHAT THEY RIDE comes later, on the trip portal: ski or board, ability,
 * height, weight, shoe size, dietary. The rental shop does not need any of it
 * until weeks out, and it is the half nobody will stand in a checkout for.
 *
 * Both halves write the same traveler_details row, so this module holds the
 * rules both callers share. They are here and not in either action because
 * two copies of "what counts as a date of birth" would drift, and the drift
 * would show up as one form accepting what the other rejects.
 *
 * No server-only imports: the field lists are read by the client forms too.
 */

/** The identity half, asked in checkout before payment. */
export const IDENTITY_FIELDS = [
  "legalName",
  "dateOfBirth",
  "school",
  "phone",
  "emergencyContactName",
  "emergencyContactPhone",
] as const;

/** The gear half, asked on the trip portal. */
export const GEAR_FIELDS = [
  "skiOrBoard",
  "abilityLevel",
  "height",
  "weight",
  "shoeSize",
  "dietaryRestrictions",
] as const;

export const MAX_LENGTHS = {
  legalName: 200,
  school: 120,
  phone: 40,
  emergencyContactName: 200,
  emergencyContactPhone: 40,
  height: 40,
  weight: 40,
  shoeSize: 40,
  dietaryRestrictions: 1000,
} as const;

/** Trim, collapse runs of whitespace, and cap. The shape every field is stored in. */
export function formText(formData: FormData, name: string, max: number): string {
  return String(formData.get(name) ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, max);
}

/*
 * Loose on purpose: international numbers, extensions and whatever
 * punctuation people use. Seven to fifteen digits (E.164's ceiling), with an
 * optional leading +.
 */
export function phoneDigits(raw: string): string | null {
  if (!/^\+?[\d\s().\-]+$/.test(raw)) return null;
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15 ? digits : null;
}

// Plausible for someone on this trip: not born in the future and not in the
// 1800s. The floor is 16 rather than 18 because the odd first-year is 17, and
// whether a minor can travel is a policy call for the team, not a form error.
const MIN_AGE = 16;
const MAX_AGE = 100;

export function checkDateOfBirth(raw: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return "Enter your date of birth.";
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const dob = new Date(Date.UTC(year, month - 1, day));
  // Rejects 2006-02-31, which Date would roll over into March.
  if (dob.getUTCFullYear() !== year || dob.getUTCMonth() !== month - 1 || dob.getUTCDate() !== day) {
    return "That date doesn't exist.";
  }

  const now = new Date();
  let age = now.getUTCFullYear() - year;
  if (now.getUTCMonth() < month - 1 || (now.getUTCMonth() === month - 1 && now.getUTCDate() < day)) {
    age -= 1;
  }
  if (age < MIN_AGE || age > MAX_AGE) return "Check the year of your date of birth.";
  return null;
}

export type IdentityValues = {
  legal_name: string;
  date_of_birth: string;
  school: string;
  phone: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
};

/**
 * The identity half out of a submitted form, or the errors to show against it.
 *
 * Shared so checkout's details step and a portal form that still needs this
 * half apply exactly the same rules.
 */
export function parseIdentity(
  formData: FormData,
): { ok: true; values: IdentityValues } | { ok: false; fieldErrors: Record<string, string> } {
  const legalName = formText(formData, "legalName", MAX_LENGTHS.legalName);
  const dateOfBirth = formText(formData, "dateOfBirth", 10);
  const school = formText(formData, "school", MAX_LENGTHS.school);
  const phone = formText(formData, "phone", MAX_LENGTHS.phone);
  const emergencyName = formText(formData, "emergencyContactName", MAX_LENGTHS.emergencyContactName);
  const emergencyPhone = formText(formData, "emergencyContactPhone", MAX_LENGTHS.emergencyContactPhone);

  const fieldErrors: Record<string, string> = {};

  if (legalName.length < 2) fieldErrors.legalName = "Enter your name as it appears on your ID.";
  const dobError = checkDateOfBirth(dateOfBirth);
  if (dobError) fieldErrors.dateOfBirth = dobError;
  if (school.length < 2) fieldErrors.school = "Tell us where you go.";

  const ownDigits = phoneDigits(phone);
  if (!ownDigits) fieldErrors.phone = "Enter a phone number, including the area code.";
  if (emergencyName.length < 2) fieldErrors.emergencyContactName = "Enter someone we can call.";
  const emergencyDigits = phoneDigits(emergencyPhone);
  if (!emergencyDigits) {
    fieldErrors.emergencyContactPhone = "Enter their phone number, including the area code.";
  } else if (ownDigits && emergencyDigits === ownDigits) {
    fieldErrors.emergencyContactPhone = "Use someone other than yourself, who will not be on the trip.";
  }

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  return {
    ok: true,
    values: {
      legal_name: legalName,
      date_of_birth: dateOfBirth,
      school,
      phone,
      emergency_contact_name: emergencyName,
      emergency_contact_phone: emergencyPhone,
    },
  };
}

/**
 * The gear half of a row, as the portal page is allowed to read it back.
 *
 * Deliberately not the identity half: the portal is reached by a signed link
 * rather than a session, so that page never selects a legal name, a date of
 * birth or a phone number, and nothing here changes that.
 */
export type GearShape = {
  ski_or_board: string | null;
  ability_level: string | null;
  height: string | null;
  weight: string | null;
  shoe_size: string | null;
};

/**
 * Whether the gear half is filled in.
 *
 * This, not "a row exists", is what finishes the traveler-details task: since
 * checkout writes the identity half on its own, a row can exist
 * with every gear column still null, and treating that as done would tick the
 * task off and stop the 72-hour chase for someone the rental shop still knows
 * nothing about.
 */
export function gearComplete(gear: GearShape | null | undefined): boolean {
  if (!gear) return false;
  return Boolean(
    gear.ski_or_board && gear.ability_level && gear.height && gear.weight && gear.shoe_size,
  );
}
