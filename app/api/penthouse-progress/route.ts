import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/client-ip";
import { getClaimSnapshot } from "@/lib/tier-claims";

/**
 * GET /api/penthouse-progress?tier=<tier id>&group=<group code>
 *
 * What PenthouseProgress polls to keep "5 of 8 in" current while a page is
 * open. Answers { filled, capacity, deadline, full } and nothing else, and
 * only when the code is the one holding that penthouse. Anything else (a wrong
 * code, a tier nobody holds, a tier that is not a penthouse, a malformed id)
 * is the same bare 404, so the route cannot be used to learn whether a
 * penthouse is held, let alone by whom.
 *
 * No session is required: the trip portal that polls this has none, and the
 * group code is the secret here the same way it is at checkout. That makes
 * guessing codes the thing to stop. One limit per IP covers it: 600 an hour is
 * five open tabs polling every 30 seconds, and against 31^6 (about 887
 * million) possible codes per penthouse it makes guessing hopeless. A
 * separate, tighter limit on misses alone would need a way to read a bucket
 * without bumping it, which check_rate_limit does not offer.
 */

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CODE = /^[A-Z0-9]{6}$/;
const NO_STORE = { "Cache-Control": "no-store" };

function notFound() {
  return new NextResponse(null, { status: 404, headers: NO_STORE });
}

export async function GET(request: NextRequest) {
  const tierId = request.nextUrl.searchParams.get("tier") ?? "";
  const group = (request.nextUrl.searchParams.get("group") ?? "").trim().toUpperCase();

  const ip = await clientIp();
  if (!(await checkRateLimit(`penthouse-progress:${ip}`, 600, 60 * 60))) {
    return new NextResponse(null, { status: 429, headers: { ...NO_STORE, "Retry-After": "600" } });
  }

  if (!UUID.test(tierId) || !CODE.test(group)) return notFound();

  const snapshot = await getClaimSnapshot(createAdminClient(), tierId, group);
  if (!snapshot) return notFound();

  return NextResponse.json(snapshot, { headers: NO_STORE });
}
