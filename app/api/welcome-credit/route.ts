import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { welcomeCreditFor } from "@/lib/welcome-credit";
import { liveOfferFromCookie } from "@/lib/code-offer-server";

/**
 * GET /api/welcome-credit
 *
 * Where the visitor stands with the new-account credit (lib/welcome-credit.ts),
 * for the pages that stay static and cached (/telluride) and so cannot read a
 * session while rendering. The pop-up asks it whether to offer the credit at
 * all, and the countdowns ask it when the credit runs out.
 *
 *   { state: "signed-out" }                    no confirmed session: offer it
 *   { state: "active", amount, expiresAt }     theirs, running
 *   { state: "none" }                          signed in, and nothing to offer
 *
 * Signed out or "none", it also carries `offer`: the $100 code this browser
 * asked for on the page (lib/code-offer.ts), while it still works, so the
 * line under Reserve shows the code instead of offering one, and the sheet
 * stays shut. Null when there is none. Someone with the credit running has
 * $100 off already, so their code is not looked up.
 *
 * Only ever about the visitor's own account and their own cookie, and the
 * cookie can only carry a $100 offer code, which nobody needs to guess
 * (lib/code-offer-server.ts), so there is no rate limit beyond Supabase's own
 * on the session check.
 */

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET() {
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();

  // Checkout treats an unconfirmed session as signed out, and so does this.
  if (!user || !user.email_confirmed_at || user.is_anonymous) {
    return NextResponse.json({ state: "signed-out", offer: await liveOfferFromCookie() }, { headers: NO_STORE });
  }

  const credit = await welcomeCreditFor(createAdminClient(), user);
  return NextResponse.json(
    credit ? { state: "active", ...credit } : { state: "none", offer: await liveOfferFromCookie(user.id) },
    { headers: NO_STORE },
  );
}
