import type { PortalAccess, PortalAmbassador, PortalView } from "@/lib/ambassador-rules";

/*
 * GET /api/ambassador/dashboard: the numbers the open dashboard polls for
 * every 60 seconds (29 October 2026). Built from its dependencies so the
 * tests can run it without a database (tests/ambassador-access.test.ts); the
 * route file passes the real ones.
 *
 * The request is never read: no query string, no body, no header decides
 * whose numbers come back. The session does, through getAccess, so there is
 * nothing to change in the request to see someone else's (no IDOR). Every
 * answer is private and never stored, by a CDN or the browser.
 */

export type DashboardDeps = {
  getAccess: () => Promise<PortalAccess>;
  /** True while this account is under its polling limit. */
  rateLimit: (userId: string) => Promise<boolean>;
  loadView: (ambassador: PortalAmbassador) => Promise<PortalView | null>;
};

const PRIVATE = { "Cache-Control": "private, no-store, max-age=0" };

function json(body: unknown, status: number, extra: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { ...PRIVATE, ...extra } });
}

export function dashboardHandler(deps: DashboardDeps) {
  // The request is deliberately unused (see above).
  return async function GET(): Promise<Response> {
    let access: PortalAccess;
    try {
      access = await deps.getAccess();
    } catch (err) {
      console.error(`ambassador dashboard poll: ${err instanceof Error ? err.message : err}`);
      return json({ error: "unavailable" }, 503);
    }
    if (access.kind === "signed-out") return json({ error: "signed_out" }, 401);
    if (access.kind !== "ambassador") return json({ error: "not_ambassador" }, 403);
    if (!access.ambassador.agreedAt) return json({ error: "agreement" }, 403);
    if (!(await deps.rateLimit(access.userId))) return json({ error: "rate_limited" }, 429, { "Retry-After": "60" });
    const view = await deps.loadView(access.ambassador);
    if (!view) return json({ error: "unavailable" }, 503);
    return json(view, 200);
  };
}
