import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { scheduleInstallments } from "@/lib/installments";
import {
  sendBookingConfirmationEmail,
  sendInstallmentChargedEmail,
  sendPaymentFailedEmail,
  sendActionRequiredEmail,
} from "@/lib/email/send";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// Best-effort: a failed email send shouldn't fail the webhook (Stripe
// retries on non-2xx, which would just fail the same way again and delay
// retrying the part that matters — the DB write already succeeded above).
async function sendEmailSafely(send: () => Promise<unknown>) {
  try {
    await send();
  } catch (err) {
    console.error(`Email send failed: ${err instanceof Error ? err.message : err}`);
  }
}

async function getBookingContext(admin: SupabaseClient<Database>, bookingId: string) {
  const { data } = await admin
    .from("bookings")
    .select(
      "total_amount, deposit_amount, users(email, name), trips(name, destination, start_date, end_date, logistics), tiers(name)"
    )
    .eq("id", bookingId)
    .single();
  return data;
}

// Retry after 3 days on a real decline; flag (stop auto-retrying) once this
// many total attempts have failed. Doesn't count requires_action — SCA
// isn't a decline, it's the customer needing to authenticate on-session.
export const MAX_INSTALLMENT_ATTEMPTS = 2;
export const INSTALLMENT_RETRY_AFTER_DAYS = 3;

// Source of truth for "did the deposit succeed" is always Stripe itself,
// never a client-supplied value. Called from both the webhook and the
// confirmation page, so it's written to be idempotent: the `.eq("status",
// "pending")` guard means a second call after the row is already
// "succeeded" is a no-op.
export async function reconcileDepositPayment(paymentIntentId: string) {
  const paymentIntent = await getStripe().paymentIntents.retrieve(paymentIntentId);
  const admin = createAdminClient();

  if (paymentIntent.status === "succeeded") {
    const { data: payment } = await admin
      .from("payments")
      .update({ status: "succeeded", paid_at: new Date().toISOString() })
      .eq("stripe_payment_intent_id", paymentIntentId)
      .eq("status", "pending")
      .select("booking_id")
      .maybeSingle();

    if (payment) {
      await admin.from("bookings").update({ status: "deposit_paid" }).eq("id", payment.booking_id);
    }
  } else if (paymentIntent.last_payment_error) {
    await admin
      .from("payments")
      .update({ status: "failed" })
      .eq("stripe_payment_intent_id", paymentIntentId)
      .eq("status", "pending");
  }

  return paymentIntent.status;
}

// The deposit PaymentIntent carries only { bookingId, userId } in metadata
// (see bookings/actions.ts); installment PaymentIntents created by the cron
// additionally carry { paymentId } (see app/api/cron/charge-installments),
// which is how these handlers tell the two apart.
export async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const bookingId = paymentIntent.metadata.bookingId;
  const paymentId = paymentIntent.metadata.paymentId;

  if (!bookingId) {
    console.error(`payment_intent.succeeded ${paymentIntent.id} is missing metadata.bookingId`);
    return;
  }

  const admin = createAdminClient();

  if (paymentId) {
    await admin
      .from("payments")
      .update({
        status: "succeeded",
        stripe_payment_intent_id: paymentIntent.id,
        paid_at: new Date().toISOString(),
      })
      .eq("id", paymentId);

    // If every payment on this booking is now succeeded, the balance is paid off.
    const { data: outstanding } = await admin
      .from("payments")
      .select("id")
      .eq("booking_id", bookingId)
      .neq("status", "succeeded")
      .limit(1);

    if (!outstanding || outstanding.length === 0) {
      await admin.from("bookings").update({ status: "paid_in_full" }).eq("id", bookingId);
    }

    const context = await getBookingContext(admin, bookingId);
    if (context?.users?.email) {
      const { data: remainingRows } = await admin
        .from("payments")
        .select("amount")
        .eq("booking_id", bookingId)
        .neq("status", "succeeded");
      const remainingBalance = (remainingRows ?? []).reduce((sum, p) => sum + p.amount, 0);

      await sendEmailSafely(() =>
        sendInstallmentChargedEmail({
          to: context.users!.email,
          name: context.users!.name,
          bookingId,
          tripName: context.trips!.name,
          amount: paymentIntent.amount / 100,
          remainingBalance,
        })
      );
    }
    return;
  }

  // Deposit charge. setup_future_usage was set when this PaymentIntent was
  // created (see bookings/actions.ts), so Stripe attaches the payment
  // method to the customer on success — save its id so the cron can charge
  // it off-session for installments later.
  const userId = paymentIntent.metadata.userId;
  if (userId && paymentIntent.payment_method) {
    const paymentMethodId =
      typeof paymentIntent.payment_method === "string"
        ? paymentIntent.payment_method
        : paymentIntent.payment_method.id;
    await admin.from("users").update({ stripe_default_payment_method_id: paymentMethodId }).eq("id", userId);
  }

  // Upserts on stripe_payment_intent_id (unique in the schema) rather than
  // assuming the pending row from booking creation is still there: Stripe
  // redelivers webhooks at least once, so a retried delivery must be a
  // no-op rather than fail on a duplicate insert.
  await admin.from("payments").upsert(
    {
      booking_id: bookingId,
      stripe_payment_intent_id: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      status: "succeeded",
      paid_at: new Date().toISOString(),
    },
    { onConflict: "stripe_payment_intent_id" },
  );

  // Guard on the pending -> deposit_paid transition so a redelivered
  // webhook can't schedule a second set of installments.
  const { data: booking } = await admin
    .from("bookings")
    .update({ status: "deposit_paid" })
    .eq("id", bookingId)
    .eq("status", "pending")
    .select("id, trip_id, total_amount, deposit_amount")
    .maybeSingle();

  if (booking) {
    await scheduleInstallments(admin, booking);

    const context = await getBookingContext(admin, bookingId);
    if (context?.users?.email) {
      const { data: upcoming } = await admin
        .from("payments")
        .select("amount, scheduled_date")
        .eq("booking_id", bookingId)
        .eq("status", "scheduled")
        .order("scheduled_date");

      await sendEmailSafely(() =>
        sendBookingConfirmationEmail({
          to: context.users!.email,
          name: context.users!.name,
          bookingId,
          trip: {
            name: context.trips!.name,
            destination: context.trips!.destination,
            startDate: context.trips!.start_date,
            endDate: context.trips!.end_date,
            logistics: context.trips!.logistics,
          },
          tierName: context.tiers!.name,
          totalAmount: context.total_amount,
          depositAmount: context.deposit_amount,
          upcomingPayments: (upcoming ?? []).map((p) => ({
            amount: p.amount,
            scheduledDate: p.scheduled_date,
          })),
        })
      );
    }
  }
}

export async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const bookingId = paymentIntent.metadata.bookingId;
  const paymentId = paymentIntent.metadata.paymentId;
  const reason = paymentIntent.last_payment_error?.message ?? "no error message from Stripe";
  console.error(`payment_intent.payment_failed ${paymentIntent.id} (booking ${bookingId ?? "unknown"}): ${reason}`);

  if (!bookingId) return;

  const admin = createAdminClient();

  if (!paymentId) {
    // Deposit failure — no pre-existing row to key off besides the intent id.
    await admin.from("payments").upsert(
      {
        booking_id: bookingId,
        stripe_payment_intent_id: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        status: "failed",
      },
      { onConflict: "stripe_payment_intent_id" },
    );
    return;
  }

  // Installment. An off-session confirm that hits SCA/3DS surfaces here too
  // (Stripe's documented behavior for off-session payments) rather than as
  // a distinct event type — distinguish it from a real decline so it
  // doesn't count toward the retry/flag threshold and doesn't get
  // auto-retried off-session again (it would just fail the same way).
  if (paymentIntent.last_payment_error?.code === "authentication_required") {
    await admin
      .from("payments")
      .update({ status: "requires_action", stripe_payment_intent_id: paymentIntent.id })
      .eq("id", paymentId);

    const context = await getBookingContext(admin, bookingId);
    if (context?.users?.email) {
      await sendEmailSafely(() =>
        sendActionRequiredEmail({
          to: context.users!.email,
          name: context.users!.name,
          bookingId,
          paymentId,
          tripName: context.trips!.name,
          amount: paymentIntent.amount / 100,
        })
      );
    }
    return;
  }

  const { data: current } = await admin.from("payments").select("attempt_count").eq("id", paymentId).single();
  const attemptCount = (current?.attempt_count ?? 0) + 1;
  const willRetry = attemptCount < MAX_INSTALLMENT_ATTEMPTS;
  const status = willRetry ? "scheduled" : "failed";

  await admin
    .from("payments")
    .update({ status, attempt_count: attemptCount, stripe_payment_intent_id: paymentIntent.id })
    .eq("id", paymentId);

  const context = await getBookingContext(admin, bookingId);
  if (context?.users?.email) {
    await sendEmailSafely(() =>
      sendPaymentFailedEmail({
        to: context.users!.email,
        name: context.users!.name,
        bookingId,
        tripName: context.trips!.name,
        amount: paymentIntent.amount / 100,
        willRetry,
      })
    );
  }
}
