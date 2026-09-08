import { headers } from "next/headers";

/**
 * The caller's IP, as far as it can be trusted.
 *
 * `x-forwarded-for` is a list, and the LEFT-most entry is whatever the client
 * sent. Reading [0] means anyone can rotate a header value and get a fresh
 * bucket in every IP-keyed rate limiter, and can author the `ip_address` on a
 * legal-acceptance record, which exists precisely to be evidence.
 *
 * Vercel sets `x-vercel-forwarded-for` itself and a client cannot forge it, so
 * that is preferred. Falling back to `x-forwarded-for`, the RIGHT-most entry is
 * the one appended by the nearest trusted proxy.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();

  const vercel = h.get("x-vercel-forwarded-for")?.trim();
  if (vercel) return vercel;

  const real = h.get("x-real-ip")?.trim();
  if (real) return real;

  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }

  return "unknown";
}
