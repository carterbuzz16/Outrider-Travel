import { createAdminClient } from "@/lib/supabase/admin";

// Calls the check_rate_limit Postgres function (see the rate_limiting
// migration) via the service-role client — that function's EXECUTE grant
// is revoked from anon/authenticated, so this is the only way to call it.
// Fails open (returns true) on an unexpected RPC error: a rate limiter
// that can accidentally lock everyone out is worse than one that
// occasionally under-limits during a transient DB issue.
export async function checkRateLimit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("check_rate_limit", {
    p_key: key,
    p_max: max,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    console.error(`checkRateLimit(${key}) RPC failed, failing open: ${error.message}`);
    return true;
  }

  return data === true;
}
