import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { handlePaymentIntentSucceeded, handlePaymentIntentFailed } from "@/lib/payments";

export async function POST(request: Request) {
  // Raw text, not .json(): Stripe's signature check is computed over the
  // exact request bytes, and re-serializing a parsed body would not match.
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }
  /*
   * Fail closed if the secret is missing OR empty.
   *
   * An empty string is a valid HMAC key as far as Node is concerned, so
   * constructEvent("", ...) verifies happily against a signature anyone can
   * compute. That turns this endpoint into "mark any booking paid, for free".
   * The non-null assertion that used to be here was a compile-time claim with
   * nothing behind it at runtime.
   */
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set. Refusing to process webhooks.");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }


  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // A throw answers 500, and Stripe delivers the event again later. That is
  // deliberate: the handlers are idempotent, and the one expected throw,
  // RefundContentionError from lib/overpayment.ts, means two payments on the
  // same booking were being settled at once and this one should look again
  // when the other has finished.
  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object);
        break;
      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object);
        break;
    }
  } catch (err) {
    console.error(`Stripe webhook ${event.type} ${event.id} failed: ${err instanceof Error ? err.message : err}`);
    return NextResponse.json({ error: "Handler failed; retry" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
