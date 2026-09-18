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
    // The origin staying put is not the end of it: dot segments are resolved,
    // so the path that comes out can itself start with "//" (or "/\\"), which
    // the browser then reads as protocol-relative and leaves the site. Checked
    // on the output, and any backslash past the first character refused too:
    //   "/.//evil.com"   -> pathname "//evil.com"  -> fallback
    //   "/..//evil.com"  -> pathname "//evil.com"  -> fallback
    //   "/%2e//evil.com" -> pathname "//evil.com"  -> fallback
    //   "/./\\evil.com"  -> pathname "//evil.com"  -> fallback
    const out = `${url.pathname}${url.search}${url.hash}`;
    if (out.startsWith("//") || out.startsWith("/\\") || out.slice(1).includes("\\")) return fallback;
    return out;
  } catch {
    return fallback;
  }
}
