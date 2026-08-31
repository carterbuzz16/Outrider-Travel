import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { getStripe } from "@/lib/stripe";

// Stripe Customers are created lazily on first checkout rather than at
// signup, since a customer.create call needs nothing we don't already
// have at that point, and most users may never reach checkout.
export async function getOrCreateStripeCustomerId(
  admin: SupabaseClient<Database>,
  user: { id: string; email: string }
): Promise<string> {
  const { data: existing } = await admin
    .from("users")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (existing?.stripe_customer_id) {
    return existing.stripe_customer_id;
  }

  const customer = await getStripe().customers.create({
    email: user.email,
    metadata: { userId: user.id },
  });

  await admin.from("users").update({ stripe_customer_id: customer.id }).eq("id", user.id);

  return customer.id;
}
