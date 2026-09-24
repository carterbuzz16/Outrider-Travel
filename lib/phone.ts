/**
 * US phone numbers, normalized to E.164 (+1XXXXXXXXXX).
 *
 * Shared by the browser and the server, so the form can say "that number is
 * wrong" before a round trip and the server still decides. No library: the
 * waitlist only takes US numbers, and the North American Numbering Plan is
 * simple enough to check by hand.
 *
 * Deliberately stricter than the trip page's phoneDigits (which takes any
 * country): these numbers may be texted, and a list of E.164 numbers is what
 * a texting service imports.
 */

/**
 * Returns "+1XXXXXXXXXX", or null when the input is not a plausible US number.
 *
 * Accepts whatever people type: "(970) 555-0123", "970.555.0123",
 * "1 970 555 0123", "+1 970-555-0123". Rejects letters, other country codes,
 * and area codes or exchanges starting with 0 or 1, which NANP never assigns.
 */
export function normalizeUsPhone(raw: string): string | null {
  const value = String(raw ?? "").trim();
  if (!value || value.length > 30) return null;
  // Digits and the usual punctuation only. "ext" and letters are out: an
  // extension cannot receive a text.
  if (!/^\+?[\d\s().\-]+$/.test(value)) return null;

  let digits = value.replace(/\D/g, "");
  // A leading + means the country code is written out, and it has to be 1.
  if (value.startsWith("+") && !digits.startsWith("1")) return null;
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  if (digits.length !== 10) return null;

  // NXX-NXX-XXXX: area code and exchange both start 2-9.
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(digits)) return null;

  return `+1${digits}`;
}

/** "+19705550123" -> "(970) 555-0123", for showing a stored number back. */
export function formatUsPhone(e164: string): string {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : e164;
}
