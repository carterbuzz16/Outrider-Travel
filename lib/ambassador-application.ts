import { normalizeUsPhone } from "@/lib/phone";

/**
 * The /ambassador application's fields and the rules for them, once.
 *
 * Imported by the browser (to answer inline, before a round trip) and by the
 * server action (which is the one that decides, since anything can be POSTed
 * to it). Same arrangement as lib/waitlist-signup.ts, for the same reason: one
 * function, so the form never accepts what the server then refuses.
 */

export type AmbassadorInput = {
  name: string;
  school: string;
  chapter: string;
  instagram: string;
  phone: string;
  reach: string;
};

export type AmbassadorField = keyof AmbassadorInput;
export type AmbassadorFieldErrors = Partial<Record<AmbassadorField, string>>;

/**
 * "Roughly how many friends could you bring on a trip?" The value is what is
 * stored (ASCII, so it can be filtered on without thinking about dashes); the
 * label is what is shown.
 */
export const REACH_OPTIONS = [
  { value: "1-5", label: "1–5" },
  { value: "5-10", label: "5–10" },
  { value: "10+", label: "10+" },
] as const;

export type Reach = (typeof REACH_OPTIONS)[number]["value"];

export type CleanAmbassadorInput = {
  name: string;
  school: string;
  chapter: string;
  /** Without the "@", lowercased. */
  instagram: string;
  /** +1XXXXXXXXXX */
  phone: string;
  reach: Reach;
};

export const EMPTY_AMBASSADOR_INPUT: AmbassadorInput = {
  name: "",
  school: "",
  chapter: "",
  instagram: "",
  phone: "",
  reach: "",
};

// Error copy lives here so the browser and the server say the same thing.
export const AMBASSADOR_ERRORS = {
  name: "Enter your name.",
  nameChars: "Use letters, spaces, hyphens or apostrophes.",
  school: "Enter your school.",
  chapter: "Enter your Chptr chapter.",
  text: "Keep it to letters, numbers and ordinary punctuation.",
  instagram: "Enter your Instagram handle.",
  instagramChars: "Instagram handles use letters, numbers, periods and underscores, up to 30.",
  phone: "Enter a 10-digit US phone number, like 205 555 0123.",
  reach: "Pick how many friends you could bring.",
  /** The brief's wording for anything that is not a field's fault. */
  failed: "Something went wrong. Try again in a moment.",
} as const;

const TEXT_MAX = 120;

// The waitlist's name rule (lib/waitlist-signup.ts): letters in any script and
// the punctuation real names carry, nothing else. One field here, so the cap
// is the table's 120 rather than 80 per half.
const NAME_PATTERN = new RegExp("^[\\p{L}\\p{M}][\\p{L}\\p{M} .'’\\-]*$", "u");

// School and chapter are free text ("Auburn", "Alpha Delta Pi", "ΑΔΠ",
// "Kappa Alpha Theta - Beta Iota"), so only what has no business in either is
// refused: angle brackets and control characters, which keep markup out of a
// column that ends up in the team's email. It must have a letter or digit in
// it, so "-" or "." is not an answer.
const FREE_TEXT_FORBIDDEN = new RegExp("[<>\\u0000-\\u001f\\u007f]");
const HAS_WORD = new RegExp("[\\p{L}\\p{N}]", "u");

// Instagram's own rule for a username: up to 30 letters, numbers, periods and
// underscores.
const INSTAGRAM_PATTERN = /^[a-z0-9._]{1,30}$/;

function clean(raw: unknown): string {
  return String(raw ?? "")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The handle as Instagram spells it. People type "@name", "name", " @Name ",
 * or paste their profile link, so all of those come back as "name". Anything
 * left that is not a valid handle comes back as typed, for the check to
 * refuse.
 */
export function cleanInstagram(raw: unknown): string {
  let value = String(raw ?? "").trim();
  value = value.replace(/^(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\//i, "");
  // A pasted profile link can carry a trailing slash or a share tag.
  value = value.replace(/[/?#].*$/, "");
  value = value.replace(/^@+/, "");
  return value.toLowerCase();
}

function checkFreeText(value: string, missing: string): string | undefined {
  if (!value) return missing;
  if (value.length > TEXT_MAX || FREE_TEXT_FORBIDDEN.test(value) || !HAS_WORD.test(value)) {
    return AMBASSADOR_ERRORS.text;
  }
  return undefined;
}

function isReach(value: string): value is Reach {
  return REACH_OPTIONS.some((option) => option.value === value);
}

export function validateAmbassador(
  raw: Partial<Record<AmbassadorField, unknown>>,
): { ok: true; data: CleanAmbassadorInput } | { ok: false; errors: AmbassadorFieldErrors } {
  const name = clean(raw.name);
  const school = clean(raw.school);
  const chapter = clean(raw.chapter);
  const instagram = cleanInstagram(raw.instagram);
  const phone = normalizeUsPhone(String(raw.phone ?? ""));
  const reach = String(raw.reach ?? "");

  const errors: AmbassadorFieldErrors = {};

  if (!name) errors.name = AMBASSADOR_ERRORS.name;
  else if (name.length > TEXT_MAX || !NAME_PATTERN.test(name)) errors.name = AMBASSADOR_ERRORS.nameChars;

  const schoolError = checkFreeText(school, AMBASSADOR_ERRORS.school);
  if (schoolError) errors.school = schoolError;
  const chapterError = checkFreeText(chapter, AMBASSADOR_ERRORS.chapter);
  if (chapterError) errors.chapter = chapterError;

  if (!instagram) errors.instagram = AMBASSADOR_ERRORS.instagram;
  else if (!INSTAGRAM_PATTERN.test(instagram)) errors.instagram = AMBASSADOR_ERRORS.instagramChars;

  if (!phone) errors.phone = AMBASSADOR_ERRORS.phone;
  if (!isReach(reach)) errors.reach = AMBASSADOR_ERRORS.reach;

  if (Object.keys(errors).length > 0 || !phone || !isReach(reach)) return { ok: false, errors };

  return { ok: true, data: { name, school, chapter, instagram, phone, reach } };
}

/** "5-10" -> "5–10", for anything a person reads. */
export function reachLabel(value: Reach): string {
  return REACH_OPTIONS.find((option) => option.value === value)?.label ?? value;
}
