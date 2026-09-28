import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Calls the check_rate_limit Postgres function (see the rate_limiting
// migration) via the service-role client — that function's EXECUTE grant
// is revoked from anon/authenticated, so this is the only way to call it.
//
// Fails open (returns true) on an unexpected RPC error by default: a rate
// limiter that can accidentally lock everyone out is worse than one that
// occasionally under-limits during a transient DB issue. That is the right
// call for reads like penthouse progress, and the wrong one for anything that
// sends email, checks a password, holds a bed or opens a card form: a flood
// that exhausts the database would switch those limits off exactly while it
// is under way. Those callers pass { failClosed: true }, and a DB error then
// reads as "over the limit", which the caller already turns into a polite
// "try again in a bit".
export async function checkRateLimit(
  key: string,
  max: number,
  windowSeconds: number,
  options: { failClosed?: boolean } = {},
): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("check_rate_limit", {
    // Keys are built from things a visitor typed (an email, a code). Capped so
    // one request can never write an arbitrarily long row.
    p_key: key.slice(0, 200),
    p_max: max,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    const failClosed = options.failClosed === true;
    console.error(`checkRateLimit(${key.slice(0, 80)}) RPC failed, failing ${failClosed ? "closed" : "open"}: ${error.message}`);
    return !failClosed;
  }

  return data === true;
}

/** For callers where a DB error must count as "over the limit". See above. */
export const FAIL_CLOSED = { failClosed: true } as const;
