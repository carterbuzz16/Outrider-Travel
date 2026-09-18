import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { reconcileInstallments, scheduleInstallments } from "@/lib/installments";
import { owedCents, type PaymentKind } from "@/lib/balance";
import { refundOverpayment } from "@/lib/overpayment";
import {
  sendInstallmentChargedEmail,
  sendPaymentFailedEmail,
  sendActionRequiredEmail,
} from "@/lib/email/send";
import { sendConfirmationEmailOnce } from "@/lib/email/post-booking";
import { sendPenthouseFullEmailsFor } from "@/lib/email/penthouse";
import { hasAcceptedAll } from "@/lib/legal-acceptance";
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

// A row in either of these states records money that moved. The succeeded
// handlers below never write over one: a redelivered event, or the page-load
// sync in lib/stripe-sync.ts arriving after the webhook, must not undo an
// automatic refund lib/overpayment.ts has recorded by putting the row back to
// the full amount or back to `succeeded`.
const SETTLED_STATUSES = '("succeeded","refunded")';

// Rows that are finished one way or another: money moved, went back, or is no
// longer being asked for. A late failure event must not reopen any of them.
const CLOSED_STATUSES = '("succeeded","refunded","canceled")';

/*
 * Every PaymentIntent carries { bookingId } in metadata, and a kind (see
 * paymentKindOf above):
 *
 *   deposit     createBooking, the traveler chose to pay the deposit
 *   full        createBooking, the traveler chose to pay the whole trip
 *   balance     startBalancePayment, an early payment from the bookings page
 *   installment the cron, off-session, with { paymentId } of the row it pays
 *
 * Every branch is safe to run more than once for the same intent, and at the
 * same moment as another run of itself, because Stripe delivers at least once
 * and syncPaymentFromStripe (lib/stripe-sync.ts) runs this same handler from
 * the confirmation, balance and bookings pages and from the cron, for the
 * times the webhook is late or never comes. Each branch guards its receipt
 * email and any scheduling on a conditional transition only one caller can
 * win.
 *
 * Every branch also ends in refundOverpayment, which returns anything the
 * booking has now been paid beyond its price (see lib/overpayment.ts). It can
 * throw RefundContentionError; the webhook route lets that become a 500 so
 * Stripe delivers again, which is safe for the reasons above.
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
    .not("status", "in", SETTLED_STATUSES)
    .select("id")
    .maybeSingle();

  // Moves the booking to paid_in_full once nothing is owed, and trims any
  // installment an early payment has made redundant.
  await reconcileInstallments(admin, bookingId);

  // The receipt goes before the refund step, not after. It is gated on the
  // transition above, which only the first delivery wins, and the refund step
  // can throw to make Stripe deliver again; after it, a throw would have lost
  // the receipt for good, since the redelivery finds the row already settled.
  // The balance it quotes is the same either way: an overpaid booking owes
  // nothing before its refund and after it.
  if (settled) {
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

  // Runs on every delivery: an earlier one may have died before here.
  await refundOverpayment(admin, bookingId, paymentIntent);
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
    .not("status", "in", SETTLED_STATUSES)
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

  // One receipt per payment: a redelivery after the email already went out
  // finds the row succeeded, so `transitioned` is false. That is also why it
  // goes before the refund step below, which can throw to have Stripe deliver
  // again: the redelivery could never send a receipt lost after it.
  //
  // No "payment received" receipt on a cancelled booking: the payment is
  // either refunded below, with its own email, or waiting on a person.
  if (transitioned) {
    const context = await getBookingContext(admin, bookingId);
    if (context && context.status !== "cancelled" && context.users?.email) {
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
  }

  // Returns anything this took the booking past its price, and decides what
  // happens to money that landed on a cancelled booking (lib/overpayment.ts
  // logs the cases a person has to look at).
  await refundOverpayment(admin, bookingId, paymentIntent);
}

async function settleCheckoutPayment(
  admin: SupabaseClient<Database>,
  bookingId: string,
  paymentIntent: Stripe.PaymentIntent,
  kind: "deposit" | "full",
) {
  // Money should never reach a booking before its traveler agreed to the Terms
  // and the Assumption of Risk: CheckoutForm records that (acceptTermsForBooking)
  // before it confirms the card. If a payment lands without it anyway (a form
  // from before that change, or a confirm made outside the page), the booking
  // is still settled below, since the money has moved and undoing it is a
  // person's call, not this handler's. It is logged loudly for that person.
  if (!(await hasAcceptedAll(bookingId))) {
    console.error(
      `LEGAL ACCEPTANCE MISSING: ${kind} payment ${paymentIntent.id} settled on booking ${bookingId} ` +
        `with no recorded acceptance of the Terms and Assumption of Risk. Not refunded automatically; ` +
        `get the traveler to accept, or decide on a refund.`,
    );
  }

  // Deposit charge. setup_future_usage was set when this PaymentIntent was
  // created (see bookings/actions.ts), so Stripe attaches the payment
  // method to the customer on success — save its id so the cron can charge
  // it off-session for installments later. A pay-in-full intent is created
  // without setup_future_usage (nothing is ever charged later), so its card
  // is not attached to the customer and there is nothing to save.
  //
  // Only while the account still points at the customer this intent charged:
  // the card is attached to that customer and no other, and if
  // getOrCreateStripeCustomerId has since replaced it (see lib/customers.ts),
  // saving the card against the new one would hand the cron a card it cannot
  // use.
  const userId = paymentIntent.metadata.userId;
  const customerId =
    typeof paymentIntent.customer === "string" ? paymentIntent.customer : paymentIntent.customer?.id;
  if (kind === "deposit" && userId && customerId && paymentIntent.payment_method) {
    const paymentMethodId =
      typeof paymentIntent.payment_method === "string"
        ? paymentIntent.payment_method
        : paymentIntent.payment_method.id;
    await admin
      .from("users")
      .update({ stripe_default_payment_method_id: paymentMethodId })
      .eq("id", userId)
      .eq("stripe_customer_id", customerId);
  }

  // Records the payment on its row from booking creation, whatever that row
  // said before (pending, failed after an earlier decline, or canceled by a
  // cancellation that crossed with the payment): money moved. A row already
  // settled is left alone, which makes a redelivery a no-op and keeps an
  // automatic refund recorded; this used to be an unconditional upsert, which
  // would have put a refunded row back to the full amount. If the row is
  // missing altogether the insert restores it, and ignoreDuplicates makes that
  // a no-op when it is not.
  const paidAt = new Date().toISOString();
  const { data: moved } = await admin
    .from("payments")
    .update({ status: "succeeded", amount: paymentIntent.amount / 100, paid_at: paidAt })
    .eq("stripe_payment_intent_id", paymentIntent.id)
    .not("status", "in", SETTLED_STATUSES)
    .select("id");
  if (!moved || moved.length === 0) {
    await admin.from("payments").upsert(
      {
        booking_id: bookingId,
        stripe_payment_intent_id: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        status: "succeeded",
        paid_at: paidAt,
      },
      { onConflict: "stripe_payment_intent_id", ignoreDuplicates: true },
    );
  }

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

  // Before the refund step, which can throw to have Stripe deliver again. Only
  // the delivery that won the transition above can schedule, so a throw ahead
  // of this would have left a deposit_paid booking with no schedule at all.
  if (booking && kind === "deposit") {
    await scheduleInstallments(admin, booking);
  }

  // A checkout charge is a booking's first, so this only does anything in the
  // unusual cases: the booking was cancelled while its card form was still
  // open, or it had somehow been paid already.
  await refundOverpayment(admin, bookingId, paymentIntent);

  // The confirmation email, once per booking whoever gets here first. Every
  // caller asks, not only the one that confirmed the booking above: the email
  // is claimed on bookings.confirmation_email_sent_at, so a redelivery or the
  // sync can send one that failed, and none of them can send a second. The
  // confirming caller says it has finished scheduling; the others wait until
  // the schedule is visible. See lib/email/post-booking.ts.
  await sendEmailSafely(() =>
    sendConfirmationEmailOnce(admin, bookingId, { afterScheduling: Boolean(booking) })
  );

  // A penthouse this payment just filled tells its whole group. A no-op for
  // every other booking; claimed per recipient, so safe from any caller.
  await sendEmailSafely(() => sendPenthouseFullEmailsFor(admin, bookingId));
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
    // the intent id. Only a pending row becomes failed. The traveler can try
    // another card on the same intent, and if that went through first (or the
    // page-load sync read the decline just before it did), an unconditional
    // write of `failed` would bury a payment that succeeded.
    const { data: marked } = await admin
      .from("payments")
      .update({ status: "failed" })
      .eq("stripe_payment_intent_id", paymentIntent.id)
      .eq("status", "pending")
      .select("id");
    if (!marked || marked.length === 0) {
      await admin.from("payments").upsert(
        {
          booking_id: bookingId,
          stripe_payment_intent_id: paymentIntent.id,
          amount: paymentIntent.amount / 100,
          status: "failed",
        },
        { onConflict: "stripe_payment_intent_id", ignoreDuplicates: true },
      );
    }
    return;
  }

  // Installment. An off-session confirm that hits SCA/3DS surfaces here too
  // (Stripe's documented behavior for off-session payments) rather than as
  // a distinct event type — distinguish it from a real decline so it
  // doesn't count toward the retry/flag threshold and doesn't get
  // auto-retried off-session again (it would just fail the same way).
  //
  // Neither write below touches a row already settled. A failure event can
  // arrive after the row has moved on for good (a later attempt succeeded and
  // its webhook landed first, an early payment covered it, an automatic refund
  // was recorded on it), and putting it back to requires_action or scheduled
  // would ask the traveler for, or have the cron take, money already dealt with.
  if (paymentIntent.last_payment_error?.code === "authentication_required") {
    await admin
      .from("payments")
      .update({ status: "requires_action", stripe_payment_intent_id: paymentIntent.id })
      .eq("id", paymentId)
      .not("status", "in", CLOSED_STATUSES);

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
    .eq("id", paymentId)
    .not("status", "in", CLOSED_STATUSES);

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

/**
 * Stops the cron trying an installment it can never collect, and puts it in
 * front of people instead.
 *
 * For the cases where trying again cannot help: no usable saved card (the
 * card or the customer is gone at Stripe, or the card belongs to another
 * customer, as with a test-mode id carried over from the checkout sandbox), an
 * amount under Stripe's 50-cent minimum, or a request Stripe keeps refusing.
 * The row becomes `failed`, which is the status that already means "the cron
 * gave up": the admin's flagged list shows it, the bookings page tells the
 * traveler it did not go through, and it still counts as owed, so a payment
 * from the bookings page covers it (reconcileInstallments). Without this such a
 * row stayed `scheduled` and was skipped, or failed, again every day, with
 * nothing but a log line to show for it.
 *
 * Conditional on the row still being a scheduled installment with the
 * last_attempted_at the caller holds, so it never writes over a row another
 * run or a webhook has moved on. Returns whether it flagged the row.
 */
export async function flagInstallmentUncollectable(
  admin: SupabaseClient<Database>,
  opts: {
    paymentId: string;
    bookingId: string;
    lastAttemptedAt: string | null;
    reason: string;
    // Whether to tell the traveler. Yes when a charge was expected and did not
    // happen; no for a few leftover cents nobody tried to take.
    notifyTraveler: boolean;
    attemptCount?: number;
    paymentIntentId?: string;
  },
): Promise<boolean> {
  let update = admin
    .from("payments")
    .update({
      status: "failed",
      last_attempted_at: new Date().toISOString(),
      ...(opts.attemptCount !== undefined ? { attempt_count: opts.attemptCount } : {}),
      ...(opts.paymentIntentId ? { stripe_payment_intent_id: opts.paymentIntentId } : {}),
    })
    .eq("id", opts.paymentId)
    .eq("status", "scheduled");
  update = opts.lastAttemptedAt
    ? update.eq("last_attempted_at", opts.lastAttemptedAt)
    : update.is("last_attempted_at", null);
  const { data: flagged } = await update.select("amount").maybeSingle();
  if (!flagged) return false;

  console.error(`Installment ${opts.paymentId} on booking ${opts.bookingId} flagged for a person: ${opts.reason}`);

  // An early payment may already cover it, in which case reconcile cancels it
  // and there is nothing to tell anyone.
  await reconcileInstallments(admin, opts.bookingId);
  if (!opts.notifyTraveler || !(await stillOwed(admin, opts.paymentId, "failed"))) return true;

  const context = await getBookingContext(admin, opts.bookingId);
  if (context?.users?.email) {
    await sendEmailSafely(() =>
      sendPaymentFailedEmail({
        to: context.users!.email,
        name: context.users!.name,
        bookingId: opts.bookingId,
        tripName: context.trips!.name,
        amount: Number(flagged.amount),
        willRetry: false,
      })
    );
  }
  return true;
}
