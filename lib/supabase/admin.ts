import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// Service-role client for privileged server-side writes that must bypass
// RLS — e.g. confirming a deposit as paid after independently verifying
// the PaymentIntent status with Stripe. Server-only: never import this
// into a Client Component or otherwise let the key reach the browser.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
