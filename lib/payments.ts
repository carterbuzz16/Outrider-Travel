import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { reconcileInstallments, scheduleInstallments } from "@/lib/installments";
import { owedCents, type PaymentKind } from "@/lib/balance";
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
      "status, total_amount, deposit_amount, group_code, users(email, name), trips(name, destination, start_date, end_date, logistics), tiers(name)"
    )
    .eq("id", bookingId)
    .single();
  return data;
}

// What is still owed on a booking, in dollars, from what has actually cleared.
// Summing the non-succeeded rows instead (as this file once did) counts
// cancelled installments and abandoned card forms as debt.
async function getRemainingBalance(admin: SupabaseClient<Database>, bookingId: string, total: number) {
  const { data: rows } = await admin.from("payments").select("status, amount").eq("booking_id", bookingId);
  return owedCents(total, rows ?? []) / 100;
}

// Retry after 3 days on a real decline; flag (stop auto-retrying) once this
// many total attempts have failed. Doesn't count requires_action — SCA
// isn't a decline, it's the customer needing to authenticate on-session.
export const MAX_INSTALLMENT_ATTEMPTS = 2;
export const INSTALLMENT_RETRY_AFTER_DAYS = 3;

/**
 * Which of the four kinds of charge a PaymentIntent is.
 *
 * Read from metadata written by this app when the intent was created:
 * `kind` on everything created since pay-in-full and balance payments
 * existed, `paymentId` on every installment the cron has ever made. An intent
 * with neither predates both and can only be a deposit.
 */
export function paymentKindOf(paymentIntent: Stripe.PaymentIntent): PaymentKind {
  if (paymentIntent.metadata.paymentId) return "installment";
  const kind = paymentIntent.metadata.kind;
  if (kind === "full" || kind === "balance") return kind;
  return "deposit";
}

// Source of truth for "did the checkout payment succeed" is always Stripe
// itself, never a client-supplied value. Called from the confirmation page
// so a traveler who lands there before the webhook does still sees their
// booking confirmed.
//
// On success it runs the webhook's own handler rather than a lighter copy of
// it. It used to flip the payment and the booking itself, and when the page
// won that race the webhook's pending -> deposit_paid guard then found
// nothing to do: the installments were never scheduled and the confirmation
// email never sent. Going through the same guarded transition means whichever
// of the two arrives first does all of it, and the other is a no-op.
export async function reconcileDepositPayment(paymentIntentId: string) {
  const paymentIntent = await getStripe().paymentIntents.retrieve(paymentIntentId);
  const kind = paymentKindOf(paymentIntent);

  if (paymentIntent.status === "succeeded" && (kind === "deposit" || kind === "full")) {
    await handlePaymentIntentSucceeded(paymentIntent);
  } else if (paymentIntent.last_payment_error) {
    const admin = createAdminClient();
    await admin
      .from("payments")
      .update({ status: "failed" })
      .eq("stripe_payment_intent_id", paymentIntentId)
      .eq("status", "pending");
  }

  return paymentIntent.status;
}

/*
 * Every PaymentIntent carries { bookingId } in metadata, and a kind (see
 * paymentKindOf above):
 *
 *   deposit     createBooking, the traveler chose to pay the deposit
 *   full        createBooking, the traveler chose to pay the whole trip
 *   balance     startBalancePayment, an early payment from the bookings page
 *   installment the cron, off-session, with { paymentId } of the row it pays
 *
 * Every branch is safe to run more than once for the same intent, because
 * Stripe delivers at least once and the confirmation page runs the checkout
 * branch as well.
 */
export async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const bookingId = paymentIntent.metadata.bookingId;

  if (!bookingId) {
    console.error(`payment_intent.succeeded ${paymentIntent.id} is missing metadata.bookingId`);
    return;
  }

  const admin = createAdminClient();
  const kind = paymentKindOf(paymentIntent);

  if (kind === "installment") {
    await settleInstallment(admin, bookingId, paymentIntent);
  } else if (kind === "balance") {
    await settleBalancePayment(admin, bookingId, paymentIntent);
  } else {
    await settleCheckoutPayment(admin, bookingId, paymentIntent, kind);
  }
}

async function settleInstallment(
  admin: SupabaseClient<Database>,
  bookingId: string,
  paymentIntent: Stripe.PaymentIntent,
) {
  const paymentId = paymentIntent.metadata.paymentId;

  // The amount is taken from Stripe, not left as the row had it. They agree in
  // every normal case; if an early payment reduced the row while this charge
  // was already in flight, the row has to say what the card was actually
  // charged, so that reconcileInstallments and the bookings page add up.
  //
  // The status guard makes a redelivered event a no-op, so the receipt below
  // goes out once.
  const { data: settled } = await admin
    .from("payments")
    .update({
      status: "succeeded",
      amount: paymentIntent.amount / 100,
      stripe_payment_intent_id: paymentIntent.id,
      paid_at: new Date().toISOString(),
    })
    .eq("id", paymentId)
    .neq("status", "succeeded")
    .select("id")
    .maybeSingle();

  // Moves the booking to paid_in_full once nothing is owed, and trims any
  // installment an early payment has made redundant.
  await reconcileInstallments(admin, bookingId);

  if (!settled) return;

  const context = await getBookingContext(admin, bookingId);
  if (context?.users?.email) {
    const remainingBalance = await getRemainingBalance(admin, bookingId, context.total_amount);

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
}

async function settleBalancePayment(
  admin: SupabaseClient<Database>,
  bookingId: string,
  paymentIntent: Stripe.PaymentIntent,
) {
  const amount = paymentIntent.amount / 100;
  const paidAt = new Date().toISOString();

  // Money has moved, so the row says succeeded whatever it said before. That
  // includes `canceled`: startBalancePayment cancels an abandoned attempt's
  // intent before starting a new one, and if the traveler's bank confirmed it
  // in the same moment, Stripe's answer wins over ours.
  const { data: moved } = await admin
    .from("payments")
    .update({ status: "succeeded", amount, paid_at: paidAt })
    .eq("stripe_payment_intent_id", paymentIntent.id)
    .neq("status", "succeeded")
    .select("id");

  let transitioned = Boolean(moved && moved.length > 0);

  if (!transitioned) {
    // Either a redelivery (the row is already succeeded) or the row was never
    // written because startBalancePayment failed after creating the intent.
    // ignoreDuplicates makes the first case a no-op and the second an insert.
    const { data: inserted } = await admin
      .from("payments")
      .upsert(
        {
          booking_id: bookingId,
          stripe_payment_intent_id: paymentIntent.id,
          amount,
          status: "succeeded",
          paid_at: paidAt,
        },
        { onConflict: "stripe_payment_intent_id", ignoreDuplicates: true },
      )
      .select("id");
    transitioned = Boolean(inserted && inserted.length > 0);
  }

  // Runs on every delivery, not only the first: if an earlier delivery died
  // between recording the payment and adjusting the schedule, this is what
  // finishes the job. It is idempotent (see lib/installments.ts).
  await reconcileInstallments(admin, bookingId);

  const context = await getBookingContext(admin, bookingId);

  if (context?.status === "cancelled") {
    console.error(
      `payment_intent.succeeded ${paymentIntent.id}: $${amount.toFixed(2)} balance payment on cancelled booking ${bookingId}. Refund by hand.`
    );
    return;
  }

  // One receipt per payment. A redelivery after the email already went out
  // finds the row succeeded and stops here.
  if (!transitioned || !context?.users?.email) return;

  const remainingBalance = await getRemainingBalance(admin, bookingId, context.total_amount);

  await sendEmailSafely(() =>
    sendInstallmentChargedEmail({
      to: context.users!.email,
      name: context.users!.name,
      bookingId,
      tripName: context.trips!.name,
      amount,
      remainingBalance,
      kind: "balance",
    })
  );
}

async function settleCheckoutPayment(
  admin: SupabaseClient<Database>,
  bookingId: string,
  paymentIntent: Stripe.PaymentIntent,
  kind: "deposit" | "full",
) {
  // Deposit charge. setup_future_usage was set when this PaymentIntent was
  // created (see bookings/actions.ts), so Stripe attaches the payment
  // method to the customer on success — save its id so the cron can charge
  // it off-session for installments later. A pay-in-full intent is created
  // without setup_future_usage (nothing is ever charged later), so its card
  // is not attached to the customer and there is nothing to save.
  const userId = paymentIntent.metadata.userId;
  if (kind === "deposit" && userId && paymentIntent.payment_method) {
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

  // Guard on the transition out of pending so a redelivered webhook can't
  // schedule a second set of installments or send a second confirmation. A
  // payment in full goes straight to paid_in_full and schedules nothing.
  const { data: booking } = await admin
    .from("bookings")
    .update({ status: kind === "full" ? "paid_in_full" : "deposit_paid" })
    .eq("id", bookingId)
    .eq("status", "pending")
    .select("id, trip_id, total_amount, deposit_amount")
    .maybeSingle();

  if (!booking) return;

  if (kind === "deposit") {
    await scheduleInstallments(admin, booking);
  }

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
        amountPaid: paymentIntent.amount / 100,
        paidInFull: kind === "full",
        groupCode: context.group_code,
        upcomingPayments: (upcoming ?? []).map((p) => ({
          amount: p.amount,
          scheduledDate: p.scheduled_date,
        })),
      })
    );
  }
}

export async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const bookingId = paymentIntent.metadata.bookingId;
  const paymentId = paymentIntent.metadata.paymentId;
  const reason = paymentIntent.last_payment_error?.message ?? "no error message from Stripe";
  console.error(`payment_intent.payment_failed ${paymentIntent.id} (booking ${bookingId ?? "unknown"}): ${reason}`);

  if (!bookingId) return;

  const admin = createAdminClient();
  const kind = paymentKindOf(paymentIntent);

  // A declined early payment is a traveler at the keyboard who has already
  // seen the error inline, and the same intent takes another card. Leaving
  // the row pending keeps it payable; marking it failed would also put it on
  // the admin's flagged list and the bookings page's "did not go through"
  // alert, which are for installments nobody was there to see fail.
  if (kind === "balance") return;

  if (kind !== "installment") {
    // Deposit or pay-in-full failure — no pre-existing row to key off besides
    // the intent id.
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

    // An early payment may already cover this installment. If so, reconcile
    // cancels it (and its intent), and there is nothing to ask the traveler
    // to verify.
    await reconcileInstallments(admin, bookingId);
    if (!(await stillOwed(admin, paymentId, "requires_action"))) return;

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

  // Same reasoning as above: no "payment failed" email for an installment an
  // early payment has since made unnecessary.
  await reconcileInstallments(admin, bookingId);
  if (!(await stillOwed(admin, paymentId, status))) return;

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

async function stillOwed(
  admin: SupabaseClient<Database>,
  paymentId: string,
  expected: Database["public"]["Enums"]["payment_status"],
) {
  const { data } = await admin.from("payments").select("status").eq("id", paymentId).maybeSingle();
  return data?.status === expected;
}
