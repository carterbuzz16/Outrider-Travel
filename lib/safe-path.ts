/**
 * A same-origin relative path, or a fallback.
 *
 * The obvious guard, `startsWith("/") && !startsWith("//")`, is not enough.
 * Browsers normalise a backslash to a slash in special-scheme URLs, so `/\evil.com`
 * passes that check and then resolves to `https://evil.com/`. Tabs and newlines
 * (`/%09/evil.com`) do the same thing.
 *
 * Rather than blocklisting those shapes, resolve the value against a throwaway
 * origin and require the origin not to move. Anything that escapes is rejected,
 * whatever trick it used.
 */
const SENTINEL = "https://safe-path.invalid";

export function safePath(value: unknown, fallback: string): string {
  const raw = typeof value === "string" ? value : "";
  if (!raw.startsWith("/")) return fallback;

  try {
    const url = new URL(raw, SENTINEL);
    if (url.origin !== SENTINEL) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
