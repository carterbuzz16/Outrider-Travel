import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { welcomeCreditFor } from "@/lib/welcome-credit";

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
 * Only ever about the visitor's own account, so there is nothing to guess and
 * no rate limit beyond Supabase's own on the session check.
 */

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET() {
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();

  // Checkout treats an unconfirmed session as signed out, and so does this.
  if (!user || !user.email_confirmed_at || user.is_anonymous) {
    return NextResponse.json({ state: "signed-out" }, { headers: NO_STORE });
  }

  const credit = await welcomeCreditFor(createAdminClient(), user);
  return NextResponse.json(credit ? { state: "active", ...credit } : { state: "none" }, { headers: NO_STORE });
}
