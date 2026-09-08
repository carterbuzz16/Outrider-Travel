/**
 * The public origin of this deployment, as a browser outside the network
 * would type it.
 *
 * Anything that ends up in an email has to use this rather than the request's
 * own origin: a Supabase auth link, a Resend CTA and a Stripe return URL are
 * all opened later, often on a different device, so "localhost" or a preview
 * host silently breaks them. `supabase.auth.signUp` with no `emailRedirectTo`
 * falls back to the Supabase project's Site URL, which is how the first real
 * confirmation email went out pointing at localhost.
 *
 * Order matters:
 *   NEXT_PUBLIC_APP_URL  the custom domain, once there is one. THIS IS
 *                        CURRENTLY EMPTY IN .env.local, so everything below
 *                        resolves to localhost in local dev, and to the
 *                        deployment host on Vercel. It must be set to
 *                        https://<the real domain> in the Vercel project
 *                        (and in .env.local if you want to test mail
 *                        locally), or auth links stay wrong off-machine.
 *   VERCEL_URL           set on every Vercel deployment, protocol-less, and
 *                        per-deployment rather than the stable alias.
 *   localhost            dev.
 */
export function getAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL || undefined;
  const vercel = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined;
  const url = configured ?? vercel ?? "http://localhost:3000";

  // Callers all append a path with a leading slash, so a trailing slash here
  // would produce "https://site.com//auth/callback" — same host, but it will
  // not match a Supabase redirect allow-list entry.
  return url.replace(/\/+$/, "");
}
