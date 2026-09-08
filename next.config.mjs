/**
 * Security headers.
 *
 * A deliberate subset. Content-Security-Policy is NOT set here: this site
 * embeds Stripe's Payment Element, which needs js.stripe.com, its own frames
 * and connections to api.stripe.com, and a CSP that is subtly wrong breaks
 * checkout silently rather than loudly. That belongs in its own change with a
 * report-only pass first. See the note in AGENTS.md.
 *
 * Everything below is safe to apply unconditionally.
 */
const securityHeaders = [
  {
    // Nothing on this site should ever be framed. The payment page in an
    // iframe is the textbook clickjacking target, and we embed Stripe rather
    // than the other way round, so denying outright costs nothing.
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    // Admin can upload trip photographs. Without this a file that sniffs as
    // HTML could be served as HTML from our own origin.
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    // Booking URLs carry ids. Send the origin only when leaving the site, so
    // those never reach a third party in a Referer header.
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(self)",
  },
  {
    // Vercel sets this at the edge too. Harmless to state, and it means a
    // deployment anywhere else still gets it.
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Do not advertise the framework and its version.
  poweredByHeader: false,

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
