import {
  AttributionCapture,
  CookieConsent,
  Footer,
  MobileJoinBar,
  OrganizationSchema,
  ToastProvider,
} from "@/components/ui";
import { getAppUrl } from "@/lib/site-url";
import SiteNav from "./SiteNav";

/**
 * Shell for every public marketing page.
 *
 * A route group, so it adds no path segment — app/(site)/about/page.tsx still
 * serves /about. The booking flow, admin and auth pages sit outside it and keep
 * their own chrome.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <OrganizationSchema siteUrl={getAppUrl()} />
      {/* .site-quiet (globals.css) takes the hairlines off every marketing
          page; display: contents, so it adds no box to the layout. */}
      <div className="site-quiet contents">
        <SiteNav />
        {children}
        <Footer />
      </div>
      {/* Both render nothing visible until needed: one reads the landing URL's
          campaign tags, the other waits for a phone reader to scroll. */}
      <AttributionCapture />
      <MobileJoinBar />
      {/*
        Last in the DOM so it lands at the end of the tab order and never
        intercepts focus on its way into the page. It renders nothing at all
        while lib/consent.ts has TRACKING_ENABLED off, which is today: the site
        sets only strictly-necessary session cookies, and those need no opt-in.
      */}
      <CookieConsent />
    </ToastProvider>
  );
}
