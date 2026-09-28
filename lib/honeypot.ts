import type { CSSProperties } from "react";

/**
 * A field only a bot fills in.
 *
 * The waitlist and contact forms both make the site send email to an address
 * someone typed, which is exactly what a spam script wants from a public form.
 * The rate limits cap how much damage one can do; this stops the common kind
 * (a crawler that fills every input it finds) before it spends any of them.
 *
 * Shared by the browser (the input) and the server actions (the check), so the
 * field name cannot drift between the two. Nothing here is secret: a bot that
 * reads this file can skip the field, and the rate limits are what catch it.
 */

// "website" because it is a field a spam script expects on a contact form and
// fills without thinking. The input sets autoComplete="off" so a browser's
// autofill leaves it alone; a person who got tripped by one would be silently
// dropped, which is the one failure this trap can cause.
export const HONEYPOT_FIELD = "website";

/**
 * Off-screen rather than display:none or visibility:hidden. Some scripts skip
 * inputs that are hidden that way, and a field they skip catches nothing.
 * Absolutely positioned, so it takes no room in the form's flex column and
 * its gap. Left, never right: an element pushed off the left edge does not
 * make the page scroll sideways on a phone.
 */
export const HONEYPOT_STYLE: CSSProperties = {
  position: "absolute",
  left: "-10000px",
  width: "1px",
  height: "1px",
  overflow: "hidden",
};

/**
 * True when the trap was filled in. A person's browser only ever sends a
 * string here, and an empty one, so anything else that arrives (a number, an
 * object from a hand-built POST) is a script too.
 */
export function honeypotTripped(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value !== "string") return true;
  return value.trim() !== "";
}

/** The trap's value from a submitted form, for a client that posts JSON. */
export function honeypotValue(form: HTMLFormElement | null | undefined): string {
  if (!form) return "";
  const value = new FormData(form).get(HONEYPOT_FIELD);
  return typeof value === "string" ? value : "";
}
