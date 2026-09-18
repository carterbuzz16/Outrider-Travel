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
 * working portal link. The same goes for `group` on the booking page
 * (/bookings/new?group=CODE, the penthouse invite link): a group code is what
 * lets someone into a penthouse and read its fill progress. A client component
 * because beforeSend is a function, which a Server Component layout cannot
 * pass across.
 */
const SECRET_PARAMS = ["t", "group"];

function stripToken(url: string): string {
  try {
    const parsed = new URL(url);
    // /login?next=/bookings/new?group=CODE carries the code one level down,
    // where a logged-out friend following the invite lands first.
    const next = parsed.searchParams.get("next");
    const nested = next ? new URL(next, parsed.origin) : null;
    const hit = (u: URL) => SECRET_PARAMS.some((name) => u.searchParams.has(name));
    if (!hit(parsed) && !(nested && hit(nested))) return url;
    for (const name of SECRET_PARAMS) parsed.searchParams.delete(name);
    if (nested && hit(nested)) {
      for (const name of SECRET_PARAMS) nested.searchParams.delete(name);
      parsed.searchParams.set("next", nested.pathname + nested.search);
    }
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
