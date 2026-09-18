"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

/**
 * Vercel Analytics and Speed Insights, with access tokens taken out of the
 * URLs they report.
 *
 * Both send the full page URL, query string included. The trip portal
 * (/trip/[id]?t=...) and the unsubscribe page (?t=...) carry a credential in
 * `t`, and a working portal link sitting in an analytics dashboard is a
 * working portal link. A client component because beforeSend is a function,
 * which a Server Component layout cannot pass across.
 */
function stripToken(url: string): string {
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has("t")) return url;
    parsed.searchParams.delete("t");
    return parsed.toString();
  } catch {
    return url;
  }
}

export default function Telemetry() {
  return (
    <>
      <Analytics beforeSend={(event) => ({ ...event, url: stripToken(event.url) })} />
      <SpeedInsights beforeSend={(event) => ({ ...event, url: stripToken(event.url) })} />
    </>
  );
}
