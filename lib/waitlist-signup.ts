import { normalizeUsPhone } from "@/lib/phone";

/**
 * The waitlist form's fields and the rules for them, once.
 *
 * Imported by the browser (to answer before a round trip) and by the server
 * action (which is the one that decides, since anything can be POSTed to it).
 * Keeping both on this one function is what stops the two drifting into a
 * form that accepts what the server then refuses.
 */

export type WaitlistInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  emailConsent: boolean;
  smsConsent: boolean;
};

export type WaitlistField = keyof WaitlistInput;
export type WaitlistFieldErrors = Partial<Record<WaitlistField, string>>;

export type CleanWaitlistInput = {
  firstName: string;
  lastName: string;
  /** Lowercased. */
  email: string;
  /** +1XXXXXXXXXX */
  phone: string;
  emailConsent: true;
  smsConsent: boolean;
};

export const EMPTY_WAITLIST_INPUT: WaitlistInput = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  emailConsent: false,
  smsConsent: false,
};

/**
 * An address mail can actually be delivered to: the characters an unquoted
 * local part may use, then a dotted domain. The old check (anything, @,
 * anything, dot, anything) let "rrb47)9@gmail.com" onto the list, and an
 * address like that bounces, which counts against the sending domain.
 */
const EMAIL_PATTERN = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/i;

/** For senders that read addresses already stored (app/admin/launch). */
export function isDeliverableEmail(email: string): boolean {
  return email.length <= 254 && EMAIL_PATTERN.test(email.trim());
}
// Letters in any script, plus the marks, spaces, hyphens, apostrophes (both
// kinds) and full stops that real names carry. No digits or symbols, which
// keeps markup and spreadsheet formulas out of a column that ends up in an
// export and an email.
// Built from a string because tsconfig targets ES2017, and TypeScript refuses
// a Unicode property escape in a regex literal below ES2018. Every browser the
// site supports, and Node, have had them since 2018-2020.
const NAME_PATTERN = new RegExp("^[\\p{L}\\p{M}][\\p{L}\\p{M} .'’\\-]*$", "u");
const NAME_MAX = 80;

// Error copy lives here so the browser and the server say the same thing.
export const WAITLIST_ERRORS = {
  firstName: "Enter your first name.",
  lastName: "Enter your last name.",
  nameChars: "Use letters, spaces, hyphens or apostrophes.",
  email: "Enter a valid email.",
  phone: "Enter a 10-digit US mobile number, like 970 555 0123.",
  emailConsent: "Tick the box so we can email you.",
} as const;

function cleanName(raw: unknown): string {
  return String(raw ?? "")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();
}

function checkName(value: string, missing: string): string | undefined {
  if (!value) return missing;
  if (value.length > NAME_MAX || !NAME_PATTERN.test(value)) return WAITLIST_ERRORS.nameChars;
  return undefined;
}

export function validateWaitlist(
  raw: Partial<Record<WaitlistField, unknown>>,
): { ok: true; data: CleanWaitlistInput } | { ok: false; errors: WaitlistFieldErrors } {
  const firstName = cleanName(raw.firstName);
  const lastName = cleanName(raw.lastName);
  const email = String(raw.email ?? "").trim().toLowerCase();
  const phone = normalizeUsPhone(String(raw.phone ?? ""));
  // Strictly true: a string "false" from a hand-made POST is not a yes.
  const emailConsent = raw.emailConsent === true;
  const smsConsent = raw.smsConsent === true;

  const errors: WaitlistFieldErrors = {};
  const firstError = checkName(firstName, WAITLIST_ERRORS.firstName);
  if (firstError) errors.firstName = firstError;
  const lastError = checkName(lastName, WAITLIST_ERRORS.lastName);
  if (lastError) errors.lastName = lastError;
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) errors.email = WAITLIST_ERRORS.email;
  if (!phone) errors.phone = WAITLIST_ERRORS.phone;
  if (!emailConsent) errors.emailConsent = WAITLIST_ERRORS.emailConsent;

  if (Object.keys(errors).length > 0 || !phone) return { ok: false, errors };

  return {
    ok: true,
    data: { firstName, lastName, email, phone, emailConsent: true, smsConsent },
  };
}
