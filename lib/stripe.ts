import Stripe from "stripe";

let stripeInstance: Stripe | undefined;

// Lazily constructed: a missing STRIPE_SECRET_KEY should only break the
// specific request that needs Stripe, not `next build`'s static page-data
// collection, which imports every route module regardless of whether the
// key is set.
export function getStripe(): Stripe {
  if (!stripeInstance) {
    // No explicit apiVersion: let the installed SDK use its own pinned
    // default rather than hardcoding a version string that can drift out
    // of sync with the package.
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return stripeInstance;
}
