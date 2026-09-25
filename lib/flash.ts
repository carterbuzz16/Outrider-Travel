/*
 * The words behind ?error= and ?message=.
 *
 * Redirects carry a short CODE, never a sentence, and the page looks the code
 * up here. A page that printed whatever the query string said would let anyone
 * send a traveler a link to our own login or checkout page reading "Your card
 * was declined, call this number": the text is escaped, so it is not a script
 * injection, but on our domain, in our alert box, it is a convincing lie. An
 * unknown code gets the surface's generic line instead, never the raw value.
 *
 * Pure and client-safe: the login page is a client component.
 */

import { MIN_PASSWORD_LENGTH } from "@/lib/password";
import { tierDisplayName } from "@/lib/tier-display";

type Table = Readonly<Record<string, string>>;

/**
 * The sentence for `code`, the fallback for an unknown one, or undefined when
 * there is no code. Leave the fallback out where an unknown code is better
 * shown as nothing at all (an informational message, say).
 */
export function flashText(table: Table, code: string | string[] | undefined | null, fallback?: string): string | undefined {
  const value = Array.isArray(code) ? code[0] : code;
  if (!value) return undefined;
  return Object.prototype.hasOwnProperty.call(table, value) ? table[value] : fallback;
}

/* -- /bookings/new ---------------------------------------------------------- */

export const CHECKOUT_ERRORS = {
  invalid_plan: "Choose the deposit or paying in full.",
  closed: "Booking isn't open yet. Dates and pricing are final, and we'll be taking spots shortly.",
  // A broken early-access link (app/early-access/route.ts) that lands where
  // booking is open anyway: the link failed, but nothing is in their way.
  early_access: "That link didn't check out, but booking is open to you here.",
  rate_limited: "Too many booking attempts. Please try again in a bit.",
  unavailable: "That trip or package isn't available anymore.",
  departed: "Those dates aren't taking bookings anymore.",
  not_payable_online: "That package can't be paid for online. Get in touch and we'll sort it out.",
  group_code_not_found:
    "That group code wasn't found for this trip. Double-check it, or leave it blank to start a new group.",
  checkout_failed: "We couldn't start your checkout. Nothing was charged. Please try again in a minute.",
  sold_out: "That package just sold out. Please pick another.",
  stale_claimed:
    "Your checkout was open for more than 30 minutes, and in that time another group booked this penthouse. Nothing was charged. Choose again to carry on.",
  stale_full:
    "Your checkout was open for more than 30 minutes, and in that time the last spot in this package was taken. Nothing was charged. Choose again to carry on.",
  daily_limit:
    "You've started several checkouts today without finishing one. Try again tomorrow, or get in touch and we'll help.",
  payment_moving:
    "A payment on your earlier checkout for this package is going through right now. Give it a few minutes, then check your bookings.",
} as const;

export type CheckoutErrorCode = keyof typeof CHECKOUT_ERRORS | "tier_claimed";

export const CHECKOUT_ERROR_FALLBACK = "That didn't go through. Please try again.";

/**
 * The checkout page's line for a code. tier_claimed names the penthouse, which
 * the page looks up itself from the package in the link, never from the query.
 */
export function checkoutErrorText(code: string | undefined, tierName?: string | null): string | undefined {
  if (code === "tier_claimed") {
    const name = tierName ? tierDisplayName(tierName) : "This penthouse";
    return `${name} has been booked by another group. If you're joining them, enter their group code.`;
  }
  return flashText(CHECKOUT_ERRORS, code, CHECKOUT_ERROR_FALLBACK);
}

/* -- /bookings ---------------------------------------------------------------- */

export const ACCOUNT_ERRORS = {
  invalid_mode: "Choose the remaining balance or an amount.",
  rate_limited: "Too many payment attempts. Please try again in a bit.",
  no_balance: "That booking doesn't have a balance to pay online.",
  payment_moving: "A payment on this booking is going through right now. Give it a few minutes, then refresh.",
  invalid_amount: "Enter an amount in dollars, like 250 or 250.50.",
  nothing_owed: "Nothing is owed on this booking.",
  balance_too_small: "What's left on this booking is too small to pay by card. Get in touch and we'll sort it out.",
  below_minimum: "That's less than the smallest payment we can take. Try a larger amount.",
  over_balance: "That's more than you owe. Your balance is on your booking.",
  leaves_remainder:
    "That would leave an amount too small for us to charge later. Pay the full balance, or a little less.",
  start_failed: "That didn't start, and nothing was charged. Please try again in a couple of minutes.",
  start_failed_retry: "That didn't start. Please try again in a couple of minutes.",
  cannot_cancel: "That booking can't be canceled online. Get in touch and we'll sort it out.",
  payment_closed: "That payment isn't open anymore. Start a new one from your booking if you still want to pay.",
  balance_changed: "Your balance has changed since you started this payment. Start a new one from your booking.",
} as const;

export type AccountErrorCode = keyof typeof ACCOUNT_ERRORS;

export const ACCOUNT_ERROR_FALLBACK = "That didn't go through. Please try again.";

/* -- /login ------------------------------------------------------------------ */

export const LOGIN_ERRORS = {
  rate_limited: "Too many login attempts. Try again in a few minutes.",
  invalid_credentials:
    "That email and password don't match an account. Check both, or create an account if this is your first trip.",
  email_not_confirmed: "Confirm your email first. The link is in the message we sent when you signed up.",
  login_failed: "We couldn't log you in. Check your details and try again.",
  invalid_email: "Enter a valid email address.",
  too_many_requests: "Too many requests. Try again in a few minutes.",
  link_failed: "We couldn't confirm that link. It may have expired. Try again, or log in.",
} as const;

export type LoginErrorCode = keyof typeof LOGIN_ERRORS;

export const LOGIN_MESSAGES = {
  check_email:
    "Check your email for a confirmation link, then log in. If it doesn't arrive, you can send it again below.",
  confirmation_resent: "If that address has an account waiting to be confirmed, a new link is on its way.",
  password_changed: "Your password is changed. Log in with the new one.",
} as const;

export type LoginMessageCode = keyof typeof LOGIN_MESSAGES;

/* -- /signup, /forgot-password, /reset-password ------------------------------- */

const PASSWORD_SHORT = `Passwords need at least ${MIN_PASSWORD_LENGTH} characters. Yours is shorter.`;
const PASSWORD_MISMATCH = "Those two passwords don't match. Type the second one again.";

export const SIGNUP_ERRORS = {
  password_short: PASSWORD_SHORT,
  password_mismatch: PASSWORD_MISMATCH,
  rate_limited: "Too many signups from this network. Try again later.",
  account_exists: "An account already exists for that email. Log in instead, or reset your password if you've forgotten it.",
  weak_password: `Pick a password of at least ${MIN_PASSWORD_LENGTH} characters.`,
  invalid_email: "That email address doesn't look right. Check it and try again.",
  signup_failed: "We couldn't create that account. Please try again in a minute.",
} as const;

export type SignupErrorCode = keyof typeof SIGNUP_ERRORS;

export const SIGNUP_ERROR_FALLBACK = "We couldn't create that account. Please try again.";

export const FORGOT_ERRORS = {
  rate_limited: "Too many reset requests from this network. Try again later.",
  link_expired: "That reset link has expired or has already been used. Request a new one.",
} as const;

export type ForgotErrorCode = keyof typeof FORGOT_ERRORS;

export const FORGOT_ERROR_FALLBACK = "That didn't go through. Please try again.";

export const RESET_ERRORS = {
  password_short: PASSWORD_SHORT,
  password_mismatch: PASSWORD_MISMATCH,
  same_password: "That's the password you already have. Pick a new one.",
  update_failed: "We couldn't save that password. Please try again, or request a new link.",
} as const;

export type ResetErrorCode = keyof typeof RESET_ERRORS;

export const RESET_ERROR_FALLBACK = "We couldn't save that password. Please try again.";

/* -- the back office ----------------------------------------------------------- */

export const ADMIN_ERRORS = {
  missing_booking: "Missing booking.",
  stop_payments_failed: "Could not stop the scheduled payments. Nothing was changed.",
  cancel_failed: "Could not cancel that booking.",
  booking_gone: "That booking no longer exists.",
  has_payment: "That booking has taken a payment, so it can only be cancelled, not deleted.",
  delete_failed: "Could not delete that booking.",
  delete_payment_moving:
    "A payment on this booking is going through at Stripe right now, so it was not removed. Refresh in a few minutes.",
  cancelled_payment_moving:
    "Booking cancelled, but a payment on it was already going through at Stripe and could not be stopped. Check it in Stripe; the webhook will record it when it lands.",
  remove_tiers_first: "Remove this trip's tiers before deleting it.",
  tier_has_bookings: "This tier has bookings and can't be deleted.",
  image_missing: "Choose an image file first.",
  image_type: "Only JPEG, PNG, or WebP images are allowed.",
  image_size: "Image must be under 5MB.",
} as const;

export type AdminErrorCode = keyof typeof ADMIN_ERRORS;

export const ADMIN_MESSAGES = {
  booking_cancelled: "Booking cancelled and future payments stopped.",
  booking_removed: "Unpaid booking removed.",
} as const;

export type AdminMessageCode = keyof typeof ADMIN_MESSAGES;

export const ADMIN_ERROR_FALLBACK = "That did not go through.";
export const ADMIN_MESSAGE_FALLBACK = "Done.";
