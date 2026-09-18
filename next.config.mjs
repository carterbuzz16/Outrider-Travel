/**
 * Security headers.
 *
 * A deliberate subset, plus a Content-Security-Policy in REPORT-ONLY mode.
 * This site embeds Stripe's Payment Element, which needs js.stripe.com, its
 * own frames and connections to api.stripe.com, and a CSP that is subtly wrong
 * breaks checkout silently rather than loudly. So the policy below is sent as
 * Content-Security-Policy-Report-Only: the browser enforces nothing and only
 * logs what it would have blocked, in the console. Once a full checkout, the
 * admin and the marketing pages run clean under it, the same string can move
 * to Content-Security-Policy.
 *
 * Everything else below is safe to apply unconditionally.
 */

/**
 * The Supabase project's origin, from NEXT_PUBLIC_SUPABASE_URL at build time.
 * Admin-uploaded trip photographs are served from its Storage public URLs, and
 * next/image refuses any remote host it has not been told about, so without
 * this they do not render at all. null when the variable is missing or not a
 * URL (a fresh clone), in which case only local images work, as before.
 */
function supabaseOrigin() {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

const supabase = supabaseOrigin();

const isDev = process.env.NODE_ENV !== "production";

/*
 * What the site actually loads:
 *   - its own scripts, plus the inline ones Next writes for hydration and the
 *     layout's small inline script, hence 'unsafe-inline' (no nonce yet);
 *     'unsafe-eval' only in development, where React's dev tooling needs it;
 *   - Stripe.js and the Payment Element's frames (3-D Secure included);
 *   - Vercel Web Analytics and Speed Insights (same-origin /_vercel/ in
 *     production, va.vercel-scripts.com in development);
 *   - Supabase, for auth from the browser and Storage images;
 *   - Figtree through next/font (self-hosted, so 'self'); Google Fonts is
 *     allowed only because CheckoutForm hands its CSS URL to Stripe;
 *   - images and video from this origin, data: and blob: URLs, Stripe's own
 *     images, and the Supabase Storage host.
 */
const supabaseSources = supabase ? [supabase.origin] : [];
const supabaseSockets = supabase ? [`wss://${supabase.host}`] : [];
const contentSecurityPolicy = [
  ["default-src", "'self'"],
  [
    "script-src",
    "'self'",
    "'unsafe-inline'",
    ...(isDev ? ["'unsafe-eval'"] : []),
    "https://js.stripe.com",
    "https://*.js.stripe.com",
    "https://va.vercel-scripts.com",
  ],
  ["style-src", "'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  ["font-src", "'self'", "data:", "https://fonts.gstatic.com"],
  ["img-src", "'self'", "data:", "blob:", "https://*.stripe.com", ...supabaseSources],
  ["media-src", "'self'", "blob:", ...supabaseSources],
  [
    "connect-src",
    "'self'",
    "https://api.stripe.com",
    "https://*.stripe.com",
    "https://va.vercel-scripts.com",
    "https://vitals.vercel-insights.com",
    ...supabaseSources,
    ...supabaseSockets,
    ...(isDev ? ["ws:"] : []),
  ],
  ["frame-src", "'self'", "https://js.stripe.com", "https://*.js.stripe.com", "https://hooks.stripe.com"],
  ["worker-src", "'self'", "blob:"],
  ["object-src", "'none'"],
  ["base-uri", "'self'"],
  ["form-action", "'self'"],
  ["frame-ancestors", "'none'"],
]
  .map((directive) => directive.join(" "))
  .join("; ");

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
    value: "camera=(), microphone=(), geolocation=(), payment=(self \"https://js.stripe.com\")",
  },
  {
    // Report-only: logs, never blocks. See the note at the top of this file.
    key: "Content-Security-Policy-Report-Only",
    value: contentSecurityPolicy,
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

  // Trip photographs uploaded in the admin live in Supabase Storage's public
  // bucket; next/image only optimises hosts listed here. Scoped to the public
  // object path, so nothing else on that host goes through the optimiser.
  images: {
    remotePatterns: supabase
      ? [
          {
            protocol: /** @type {"https" | "http"} */ (supabase.protocol.replace(":", "")),
            hostname: supabase.hostname,
            ...(supabase.port ? { port: supabase.port } : {}),
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },

  // lib/room-media.ts checks which room photographs exist with fs on the
  // server, so nothing renders a broken image. public/ is served from the CDN
  // and is not in the server bundle on Vercel, so the routes that call it get
  // that folder traced in. Keys are route globs (groups stripped), matched
  // with `contains`, so "/trips/\\[id\\]" also catches /admin/trips/[id]; that
  // costs a few photos in the admin bundle and nothing else. Brackets are
  // escaped because a glob reads [id] as a character class.
  outputFileTracingIncludes: {
    "/telluride": ["./public/images/peaks/**/*"],
    "/trips/\\[id\\]": ["./public/images/peaks/**/*"],
    "/bookings/new": ["./public/images/peaks/**/*"],
    "/bookings/*/pay": ["./public/images/peaks/**/*"],
  },

  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // The trip portal carries its access token in the query string (see
        // lib/portal-token.ts). Listed after the catch-all so these win: no
        // Referer at all, not even to our own pages, and no indexing even if
        // a link is pasted somewhere public. Cache-Control is left to Next,
        // which sends no-store for these force-dynamic pages.
        source: "/trip/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
    ];
  },
};

export default nextConfig;
