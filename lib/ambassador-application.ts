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
  year: string;
  chapter: string;
  instagram: string;
  phone: string;
  reach: string;
  why: string;
  fit: string;
};

export type AmbassadorField = keyof AmbassadorInput;
export type AmbassadorFieldErrors = Partial<Record<AmbassadorField, string>>;

/**
 * Year in school, added 26 October 2026 with the two short answers: a Campus
 * Lead who graduates in May can't lead next year. Stored lowercase; shown as
 * the label.
 */
export const YEAR_OPTIONS = [
  { value: "freshman", label: "Freshman" },
  { value: "sophomore", label: "Sophomore" },
  { value: "junior", label: "Junior" },
  { value: "senior", label: "Senior" },
] as const;

export type Year = (typeof YEAR_OPTIONS)[number]["value"];

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

/**
 * The cap on each short answer. Carter asked for "simple answers", and 300
 * characters holds one with room to spare. The form shows the count against
 * it (no hint text: Carter, 26 Oct, didn't want the page to say how long),
 * and the table refuses anything longer.
 */
export const ANSWER_MAX = 300;

export type CleanAmbassadorInput = {
  name: string;
  school: string;
  year: Year;
  chapter: string;
  /** Without the "@", lowercased. */
  instagram: string;
  /** +1XXXXXXXXXX */
  phone: string;
  reach: Reach;
  /** Why they want to do it. Line breaks kept, at most ANSWER_MAX. */
  why: string;
  /** Why they'd be a good fit. Same rules. */
  fit: string;
};

export const EMPTY_AMBASSADOR_INPUT: AmbassadorInput = {
  name: "",
  school: "",
  year: "",
  chapter: "",
  instagram: "",
  phone: "",
  reach: "",
  why: "",
  fit: "",
};

// Error copy lives here so the browser and the server say the same thing.
export const AMBASSADOR_ERRORS = {
  name: "Enter your name.",
  nameChars: "Use letters, spaces, hyphens or apostrophes.",
  school: "Enter your school.",
  year: "Pick your year.",
  chapter: "Enter the chapter you’re a part of.",
  text: "Keep it to letters, numbers and ordinary punctuation.",
  instagram: "Enter your Instagram handle.",
  instagramChars: "Instagram handles use letters, numbers, periods and underscores, up to 30.",
  phone: "Enter a 10-digit US phone number, like 205 555 0123.",
  reach: "Pick how many friends you could bring.",
  why: "Tell us why you want to do this.",
  fit: "Tell us what makes you a good fit.",
  answerLong: `Keep it under ${ANSWER_MAX} characters.`,
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

// The short answers are prose, so they keep what prose has (line breaks, and
// "<3", which is how a college student says they love a trip). Only control
// characters other than the line break go; the team reads these as plain text.
const ANSWER_CONTROL = new RegExp("[\\u0000-\\u0009\\u000b-\\u001f\\u007f]", "g");

// Instagram's own rule for a username: up to 30 letters, numbers, periods and
// underscores.
const INSTAGRAM_PATTERN = /^[a-z0-9._]{1,30}$/;

function clean(raw: unknown): string {
  return String(raw ?? "")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();
}

/** A short answer as stored: Windows line endings unified, no blank-line runs. */
export function cleanAnswer(raw: unknown): string {
  return String(raw ?? "")
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(ANSWER_CONTROL, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
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

function checkAnswer(value: string, missing: string): string | undefined {
  if (!value || !HAS_WORD.test(value)) return missing;
  if (value.length > ANSWER_MAX) return AMBASSADOR_ERRORS.answerLong;
  return undefined;
}

function isYear(value: string): value is Year {
  return YEAR_OPTIONS.some((option) => option.value === value);
}

function isReach(value: string): value is Reach {
  return REACH_OPTIONS.some((option) => option.value === value);
}

export function validateAmbassador(
  raw: Partial<Record<AmbassadorField, unknown>>,
): { ok: true; data: CleanAmbassadorInput } | { ok: false; errors: AmbassadorFieldErrors } {
  const name = clean(raw.name);
  const school = clean(raw.school);
  const year = String(raw.year ?? "");
  const chapter = clean(raw.chapter);
  const instagram = cleanInstagram(raw.instagram);
  const phone = normalizeUsPhone(String(raw.phone ?? ""));
  const reach = String(raw.reach ?? "");
  const why = cleanAnswer(raw.why);
  const fit = cleanAnswer(raw.fit);

  const errors: AmbassadorFieldErrors = {};

  if (!name) errors.name = AMBASSADOR_ERRORS.name;
  else if (name.length > TEXT_MAX || !NAME_PATTERN.test(name)) errors.name = AMBASSADOR_ERRORS.nameChars;

  const schoolError = checkFreeText(school, AMBASSADOR_ERRORS.school);
  if (schoolError) errors.school = schoolError;
  if (!isYear(year)) errors.year = AMBASSADOR_ERRORS.year;
  const chapterError = checkFreeText(chapter, AMBASSADOR_ERRORS.chapter);
  if (chapterError) errors.chapter = chapterError;

  if (!instagram) errors.instagram = AMBASSADOR_ERRORS.instagram;
  else if (!INSTAGRAM_PATTERN.test(instagram)) errors.instagram = AMBASSADOR_ERRORS.instagramChars;

  if (!phone) errors.phone = AMBASSADOR_ERRORS.phone;
  if (!isReach(reach)) errors.reach = AMBASSADOR_ERRORS.reach;

  const whyError = checkAnswer(why, AMBASSADOR_ERRORS.why);
  if (whyError) errors.why = whyError;
  const fitError = checkAnswer(fit, AMBASSADOR_ERRORS.fit);
  if (fitError) errors.fit = fitError;

  if (Object.keys(errors).length > 0 || !phone || !isYear(year) || !isReach(reach)) {
    return { ok: false, errors };
  }

  return { ok: true, data: { name, school, year, chapter, instagram, phone, reach, why, fit } };
}

/** "5-10" -> "5–10", for anything a person reads. */
export function reachLabel(value: Reach): string {
  return REACH_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

/** "junior" -> "Junior". */
export function yearLabel(value: Year): string {
  return YEAR_OPTIONS.find((option) => option.value === value)?.label ?? value;
}
