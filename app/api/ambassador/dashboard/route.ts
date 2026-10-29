import { dashboardHandler } from "@/lib/ambassador-api";
import { getPortalAccess, loadPortalView } from "@/lib/ambassador-portal";
import { checkRateLimit } from "@/lib/rate-limit";

/*
 * The dashboard's live numbers (lib/ambassador-api.ts has the rules). Polled
 * once a minute while the tab is visible, plus on focus, so 40 in ten minutes
 * leaves room for a few tabs and nothing more. A read, so a database fault
 * fails open rather than blanking every dashboard (lib/rate-limit.ts).
 */
export const dynamic = "force-dynamic";

export const GET = dashboardHandler({
  getAccess: getPortalAccess,
  rateLimit: (userId) => checkRateLimit(`amb-dash:${userId}`, 40, 10 * 60),
  loadView: (ambassador) => loadPortalView(ambassador.code),
});
