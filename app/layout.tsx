import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import Telemetry from "@/components/Telemetry";
import { getAppUrl } from "@/lib/site-url";
import { CHECKOUT_SANDBOX } from "@/lib/booking-window";
import "./globals.css";

/**
 * One family. The brand book specifies Centra No.2, a commercial face; the
 * team chose not to license it, so the site is set in Figtree, the closest
 * open geometric sans in proportion and color, used the way the book uses
 * Centra: Extrabold capitals for headlines, Medium for subheads, Book and
 * Light for text.
 *
 * Self-hosted through next/font rather than a Google Fonts <link>: no
 * third-party request, and the generated fallback metrics stop headlines
 * reflowing on load.
 */
const figtree = Figtree({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "800"],
  display: "swap",
  variable: "--font-figtree",
});

/*
 * metadataBase is what turns the relative opengraph-image path into the
 * absolute URL a scraper needs. Without it Next warns at build and social
 * previews render without an image.
 */
export const metadata: Metadata = {
  metadataBase: new URL(getAppUrl()),
  /*
   * "./" resolves per route against metadataBase, so every page declares its
   * own canonical URL on the real domain.
   *
   * This matters because the site answers on outrider-travel.vercel.app as well
   * as www.outrider.travel, and that deployment serves the whole thing at 200
   * rather than redirecting. Without a canonical those are two indexable copies
   * of every page competing with each other. NEXT_PUBLIC_APP_URL is set in
   * Vercel, so metadataBase is the custom domain even when the vercel.app host
   * is the one answering, and the duplicate points at the original.
   */
  alternates: { canonical: "./" },
  title: {
    default: "Outrider",
    template: "%s | Outrider",
  },
  description:
    "Small-group trips for college friends: Telluride ski weeks now, spring break next. Hosted start to finish by Outrider.",
  openGraph: {
    type: "website",
    siteName: "Outrider",
    title: "Outrider",
    description:
      "Small-group trips for college friends: Telluride ski weeks now, spring break next. Hosted start to finish by Outrider.",
    // No `url` here. Anything inheriting this block would claim to live at
    // the root; pages set their own through lib/metadata.ts.
  },
  twitter: {
    card: "summary_large_image",
    title: "Outrider",
    description:
      "Small-group trips for college friends: Telluride ski weeks now, spring break next. Hosted start to finish by Outrider.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={figtree.variable}
      // The inline script below adds `js` to this element before hydration, so
      // the server and client className will always differ here by design.
      suppressHydrationWarning
    >
      <head>
        {/*
          Marks the document as scripted before the first paint, which is what
          gates the scroll-reveal's hidden state (see .reveal in globals.css).
          Without it a failed or disabled bundle would leave revealed content
          stuck at opacity 0 — a blank page rather than an unanimated one.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.classList.add('js')",
          }}
        />
      </head>
      <body className="antialiased">
        {CHECKOUT_SANDBOX && (
          // Nobody should mistake this build for the live site. See
          // lib/booking-window.ts for what turns it on.
          <div className="pointer-events-none fixed bottom-3 right-3 z-[100] rounded-full bg-[#b3261e] px-3 py-1.5 font-body text-[12px] font-medium text-white shadow-lg">
            Checkout sandbox, Stripe test mode
          </div>
        )}
        {children}
        {/*
          Vercel Analytics and Speed Insights.
          Chosen over Google Analytics deliberately: both are cookieless and
          store no identifier on the visitor's device, so they do not trigger
          the consent requirement and the cookie banner stays switched off.
          They also only report on a real deployment, so local runs stay clean.
          Wrapped so access tokens in query strings are not reported; see
          components/Telemetry.tsx.
        */}
        <Telemetry />
      </body>
    </html>
  );
}
