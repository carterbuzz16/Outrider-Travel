import { NextResponse } from "next/server";
import { timingSafeEqual, createHash } from "crypto";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { INSTALLMENT_RETRY_AFTER_DAYS, MAX_INSTALLMENT_ATTEMPTS } from "@/lib/payments";

// Plain !== leaks timing information proportional to how many leading
// characters match, which could help an attacker guess CRON_SECRET one
// byte at a time. Hashing both sides to a fixed-length digest first avoids
// needing equal-length inputs (timingSafeEqual throws on a length
// mismatch) while keeping the actual comparison constant-time.
function timingSafeStringEqual(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

// Triggered daily by Vercel Cron (see vercel.json). Finds installments that
// are due (or due for a retry) and attempts an off-session charge against
// the customer's saved payment method. Status/attempt_count are NOT set
// here — Stripe stays the single source of truth, same as the rest of this
// codebase, via the payment_intent.succeeded / payment_intent.payment_failed
// webhook (see lib/payments.ts). This route only records that an attempt
// was made (stripe_payment_intent_id, last_attempted_at), which the retry
// gate below depends on.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  if (!timingSafeStringEqual(authHeader, `Bearer ${process.env.CRON_SECRET}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: due, error } = await admin
    .from("payments")
    .select("id, booking_id, amount, attempt_count, last_attempted_at")
    .eq("status", "scheduled")
    .lte("scheduled_date", today)
    .lt("attempt_count", MAX_INSTALLMENT_ATTEMPTS);

  if (error) {
    console.error(`charge-installments: failed to query due payments: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const retryAfterMs = INSTALLMENT_RETRY_AFTER_DAYS * 24 * 60 * 60 * 1000;
  const eligible = (due ?? []).filter((payment) => {
    if (payment.attempt_count === 0) return true;
    if (!payment.last_attempted_at) return true;
    return Date.now() - new Date(payment.last_attempted_at).getTime() >= retryAfterMs;
  });

  if (eligible.length === 0) {
    return NextResponse.json({ attempted: 0 });
  }

  const bookingIds = Array.from(new Set(eligible.map((p) => p.booking_id)));
  const { data: bookings } = await admin
    .from("bookings")
    .select("id, users(stripe_customer_id, stripe_default_payment_method_id)")
    .in("id", bookingIds);

  const paymentMethodByBooking = new Map(
    (bookings ?? []).map((b) => [
      b.id,
      { customerId: b.users?.stripe_customer_id ?? null, paymentMethodId: b.users?.stripe_default_payment_method_id ?? null },
    ])
  );

  const stripe = getStripe();
  let attempted = 0;

  for (const payment of eligible) {
    const saved = paymentMethodByBooking.get(payment.booking_id);
    if (!saved?.customerId || !saved.paymentMethodId) {
      console.error(`charge-installments: booking ${payment.booking_id} has no saved payment method, skipping payment ${payment.id}`);
      continue;
    }

    attempted++;
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(payment.amount * 100),
        currency: "usd",
        customer: saved.customerId,
        payment_method: saved.paymentMethodId,
        off_session: true,
        confirm: true,
        metadata: { bookingId: payment.booking_id, paymentId: payment.id },
      });

      await admin
        .from("payments")
        .update({ stripe_payment_intent_id: paymentIntent.id, last_attempted_at: new Date().toISOString() })
        .eq("id", payment.id);
    } catch (err) {
      const paymentIntentId =
        err instanceof Stripe.errors.StripeCardError ? err.payment_intent?.id : undefined;

      await admin
        .from("payments")
        .update({
          stripe_payment_intent_id: paymentIntentId ?? undefined,
          last_attempted_at: new Date().toISOString(),
        })
        .eq("id", payment.id);

      console.error(
        `charge-installments: attempt failed for payment ${payment.id}: ${err instanceof Error ? err.message : err}`
      );
    }
  }

  return NextResponse.json({ attempted });
}
