"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { computeDepositAmount, computePayInFullAmount } from "@/lib/deposit";
import {
  fromCents,
  isPaymentPlan,
  owedCents,
  parseAmountInput,
  validateBalanceAmount,
  type PaymentPlan,
} from "@/lib/balance";
import type Stripe from "stripe";
import { installmentInFlight } from "@/lib/installments";
import { paymentKindOf } from "@/lib/payments";
import { syncPaymentFromStripe } from "@/lib/stripe-sync";
import { getOrCreateStripeCustomerId } from "@/lib/customers";
import { checkRateLimit } from "@/lib/rate-limit";
import { resolveGroupCode } from "@/lib/group-code";
import { recordAcceptance } from "@/lib/legal-acceptance";
import { BOOKINGS_OPEN, CHECKOUT_SANDBOX, isTestTrip } from "@/lib/booking-window";
import { SMS_CONSENT_FIELD, SMS_CONSENT_VERSION } from "@/lib/sms-consent";

export async function createBooking(formData: FormData) {
  const tripId = String(formData.get("tripId") ?? "");
  const tierId = String(formData.get("tierId") ?? "");
  const requestedGroupCode = String(formData.get("group_code") ?? "").trim() || null;
  // Checked before anything is created. A booking that exists without an
  // acceptance record is exactly the situation this is here to prevent.
  const acceptedTerms = formData.get("accept_terms") === "on";
  // Optional, and never a reason to refuse a booking. Only an explicit tick
  // counts; anything else (including a form rendered before the box existed)
  // is no consent.
  const smsConsent = formData.get(SMS_CONSENT_FIELD) === "on";
  // The only thing taken from the form about money is which of two plans was
  // picked, and only if it is one of the two. Every figure is worked out below
  // from the tier row. A form rendered before this field existed sends nothing,
  // which means the deposit, the only plan there was.
  const requestedPlan = String(formData.get("payment_plan") ?? "deposit");
  if (!isPaymentPlan(requestedPlan)) {
    redirect("/bookings/new?error=" + encodeURIComponent("Choose the deposit or paying in full."));
  }
  const plan: PaymentPlan = requestedPlan;

  // Bookings are not open yet. Checked here as well as in the UI, because a
  // hidden button is presentation, not a control: this action is a POST
  // endpoint that anyone can call directly.
  if (!BOOKINGS_OPEN) {
    redirect(
      "/trips?error=" +
        encodeURIComponent("Booking is not open yet. Dates and pricing are final; we will be taking spots shortly."),
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // A legitimate customer books a handful of trips a year at most — this
  // is generous headroom for real usage while still blocking a scripted
  // loop hammering tier capacity / creating Stripe PaymentIntents.
  const allowed = await checkRateLimit(`booking:${user.id}`, 10, 60 * 60);
  if (!allowed) {
    redirect("/bookings/new?error=Too many booking attempts. Please try again in a bit.");
  }

  // Re-fetch the tier server-side rather than trusting a client-supplied
  // price, and confirm it still belongs to a published trip (RLS enforces
  // this too, but the explicit filter makes the intent clear and gives a
  // clean "no longer available" error instead of an RLS-shaped one).
  const { data: tier, error: tierError } = await supabase
    .from("tiers")
    .select("id, price, trip_id, trips!inner(status, name)")
    .eq("id", tierId)
    .eq("trip_id", tripId)
    .eq("trips.status", "published")
    .single();

  if (tierError || !tier) {
    redirect("/bookings/new?error=That trip or tier is no longer available.");
  }

  // Test trips are published so the sandbox can book them, and hidden
  // everywhere else. Hiding them is the page's job; this is the control, since
  // a direct POST with a test tier's id would otherwise book one on the live
  // site and take real money for a trip that does not exist.
  if (isTestTrip(tier.trips.name) && !CHECKOUT_SANDBOX) {
    redirect("/bookings/new?error=That trip or tier is no longer available.");
  }

  /*
   * Paying in full takes PAY_IN_FULL_DISCOUNT off the price, and the
   * discounted figure becomes the booking's total_amount: that is the price
   * this traveler agreed to, and there is no other column to put a discount
   * in. deposit_amount is still recorded for a pay-in-full booking, as the
   * share of what they paid that the Terms treat as the non-refundable
   * deposit. Nothing is scheduled against it.
   */
  const totalAmount = plan === "full" ? computePayInFullAmount(tier.price) : tier.price;
  const depositAmount = computeDepositAmount(totalAmount);
  const chargeAmount = plan === "full" ? totalAmount : depositAmount;

  // Stripe will not take less than 50 cents. Only reachable with a tier priced
  // at or under the pay-in-full discount, which is a data-entry slip, not a
  // free trip.
  if (Math.round(chargeAmount * 100) < 50) {
    redirect(
      "/bookings/new?error=" + encodeURIComponent("That package cannot be paid for online. Get in touch and we will sort it out."),
    );
  }

  // Booking/payment writes use the service role: RLS intentionally has no
  // INSERT policy for these tables (see the booking_checkout_rls_policies
  // migration), since payment-relevant rows should never be writable
  // directly by an authenticated client.
  const admin = createAdminClient();

  const groupCodeResult = await resolveGroupCode(admin, tripId, requestedGroupCode);
  if ("error" in groupCodeResult) {
    redirect(`/bookings/new?error=${encodeURIComponent(groupCodeResult.error)}`);
  }

  if (!acceptedTerms) {
    redirect(
      "/bookings/new?error=" +
        encodeURIComponent(
          "Please accept the Terms of Service and the Assumption of Risk to book.",
        ),
    );
  }

  /*
   * A second submit of the same form is the same booking, not another one.
   *
   * The button disables itself while the first is in flight (BookingForm), but
   * that is the browser's courtesy, and the back button, a slow network or a
   * second tab all get past it. Two pending bookings would each hold a place
   * in the tier and each carry a card form for the deposit. So if this
   * traveler already has a pending booking for this tier from the last few
   * minutes, on the same plan, with a card form still open, they are sent to
   * that one's card form instead.
   */
  const openCheckout = await findOpenCheckout(admin, user.id, tierId, plan);
  if (openCheckout) {
    redirect(`/bookings/${openCheckout}/pay`);
  }

  // Before the booking exists, not after: this is the Stripe call most likely
  // to fail (an account carrying a customer id Stripe does not know, or Stripe
  // being unreachable), and failing here leaves nothing behind. Failing after
  // the insert used to strand a pending booking holding a place in the tier,
  // with an acceptance record and no card form.
  //
  // setup_future_usage (below) attaches the payment method used here to this
  // Customer on success, so the installment cron can charge it off-session
  // later.
  let stripeCustomerId: string;
  try {
    stripeCustomerId = await getOrCreateStripeCustomerId(admin, { id: user.id, email: user.email! });
  } catch (err) {
    console.error(`createBooking: no Stripe customer for user ${user.id}: ${err instanceof Error ? err.message : err}`);
    redirect("/bookings/new?error=" + encodeURIComponent(CHECKOUT_FAILED_MESSAGE));
  }

  const { data: booking, error: bookingError } = await admin
    .from("bookings")
    .insert({
      user_id: user.id,
      trip_id: tripId,
      tier_id: tierId,
      status: "pending",
      total_amount: totalAmount,
      deposit_amount: depositAmount,
      group_code: groupCodeResult.code,
      // The evidence if consent to texts is ever questioned: the tick, the
      // server's clock (not the browser's), and which wording was on screen
      // (lib/sms-consent.ts). Written only with a yes: the columns default to
      // false and null, which is what a blank box means, and leaving them out
      // keeps an unticked booking working on a database the post-booking
      // migration has not reached yet.
      ...(smsConsent
        ? {
            sms_consent: true,
            sms_consent_at: new Date().toISOString(),
            sms_consent_text_version: SMS_CONSENT_VERSION,
          }
        : {}),
    })
    .select("id")
    .single();

  if (bookingError?.message === "tier_at_capacity") {
    redirect("/bookings/new?error=That tier just sold out. Please pick another.");
  }

  if (bookingError || !booking) {
    throw new Error(bookingError?.message ?? "Failed to create booking");
  }

  /*
   * The check above cannot see a twin submitted in the same instant, since
   * neither booking exists when the other looks. So each one looks again now
   * that it exists: if an earlier pending booking by this traveler, for this
   * tier and price, was made in the last minute, this one is the duplicate. It
   * is deleted (it has no payment or acceptance yet, so nothing is lost) and
   * the traveler goes to the earlier one's card form. Whichever was inserted
   * first is never the one that backs off, so at least one always survives.
   */
  const twin = await earlierTwin(admin, { userId: user.id, tierId, totalAmount, bookingId: booking.id });
  if (twin) {
    await admin.from("bookings").delete().eq("id", booking.id).eq("status", "pending");
    redirect((await waitForCheckoutRow(admin, twin)) ? `/bookings/${twin}/pay` : "/bookings");
  }

  /*
   * Everything from here to the redirect either all happens or is undone, so
   * a failure part-way never leaves a pending booking holding a place in the
   * tier with no card form behind it. The undo is abandonPendingBooking.
   *
   * The acceptance goes before the PaymentIntent, deliberately. If it fails,
   * no card has been charged, which is a far better failure than money taken
   * against a booking with no record of what the traveler agreed to.
   * recordAcceptance stores the document versions, not a boolean, so the
   * exact text accepted can be reproduced later.
   *
   * setup_future_usage attaches the card to the Customer on success, so the
   * cron can charge installments off-session later. No separate SetupIntent is
   * needed, since a real amount is being charged right now (a SetupIntent is
   * for saving a card with no charge). A payment in full has no later
   * charges, so its card is not kept.
   */
  let paymentIntent: Stripe.PaymentIntent | undefined;
  let accepted = false;
  try {
    await recordAcceptance({ bookingId: booking.id, userId: user.id });
    accepted = true;

    // metadata.kind is how the webhook tells a deposit from a payment in full
    // (see paymentKindOf in lib/payments.ts). bookingStatus is the status this
    // path saw before creating the intent, which lib/overpayment.ts relies on to
    // tell money taken on a live booking from money taken on a cancelled one.
    //
    // The idempotency key is per booking, so a retried request for this booking
    // (a network retry inside the Stripe SDK, say) gets the same intent back
    // rather than a second one.
    const chargeCents = Math.round(chargeAmount * 100);
    paymentIntent = await getStripe().paymentIntents.create(
      {
        amount: chargeCents,
        currency: "usd",
        customer: stripeCustomerId,
        ...(plan === "deposit" ? { setup_future_usage: "off_session" as const } : {}),
        automatic_payment_methods: { enabled: true },
        metadata: { bookingId: booking.id, userId: user.id, kind: plan, bookingStatus: "pending" },
      },
      { idempotencyKey: `checkout-${booking.id}-${chargeCents}` },
    );

    const { error: paymentError } = await admin.from("payments").insert({
      booking_id: booking.id,
      stripe_payment_intent_id: paymentIntent.id,
      amount: chargeAmount,
      status: "pending",
    });

    if (paymentError) {
      throw new Error(paymentError.message);
    }
  } catch (err) {
    console.error(`createBooking: booking ${booking.id} could not be set up: ${err instanceof Error ? err.message : err}`);
    // An intent with no row has no page to pay it on, so it must not stay
    // payable. Cancelled before the booking goes, so a form somehow already
    // open cannot take money for a booking that no longer holds a place.
    if (paymentIntent) {
      await getStripe()
        .paymentIntents.cancel(paymentIntent.id)
        .catch(() => undefined);
    }
    await abandonPendingBooking(admin, booking.id, { accepted });
    redirect("/bookings/new?error=" + encodeURIComponent(CHECKOUT_FAILED_MESSAGE));
  }

  redirect(`/bookings/${booking.id}/pay`);
}

/*
 * An early payment toward a booking's balance, from the bookings page: either
 * everything still owed, or an amount the traveler types.
 *
 * This only creates the PaymentIntent and a `pending` row for it. Nothing
 * about the schedule changes here, because nothing has been paid yet: the
 * installments are reduced by the payment_intent.succeeded webhook once Stripe
 * says the money moved (settleBalancePayment in lib/payments.ts). The card
 * form itself is /bookings/[id]/balance/[paymentId].
 */
export async function startBalancePayment(formData: FormData) {
  const bookingId = String(formData.get("booking_id") ?? "");
  const mode = String(formData.get("mode") ?? "");
  const rawAmount = String(formData.get("amount") ?? "");

  if (mode !== "remaining" && mode !== "custom") {
    fail("Choose the remaining balance or an amount.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Each submission creates a PaymentIntent, so this is capped the same way
  // createBooking is.
  const allowed = await checkRateLimit(`balance:${user.id}`, 10, 60 * 60);
  if (!allowed) {
    fail("Too many payment attempts. Please try again in a bit.");
  }

  // RLS ("Users can view own bookings") scopes this to the signed-in user, so
  // someone else's booking id comes back empty.
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, total_amount")
    .eq("id", bookingId)
    .single();

  if (!booking || booking.status !== "deposit_paid") {
    fail("That booking has no balance to pay online.");
  }

  const admin = createAdminClient();

  // What is owed is worked out here from the payments that have cleared. The
  // figure the bookings page showed is never read back.
  const { data: payments } = await admin
    .from("payments")
    .select("status, amount")
    .eq("booking_id", booking.id);

  const owed = owedCents(booking.total_amount, payments ?? []);
  const stripe = getStripe();

  /*
   * Only one early payment is open on a booking at a time, and none while
   * money is already moving.
   *
   * One that is processing or has succeeded without its webhook landing, or an
   * installment the cron is charging right now, would make `owed` above out of
   * date, so this stops rather than offer the wrong figure. (One that has
   * succeeded is settled on the spot, so a refresh shows the right balance.)
   *
   * An open one from the last few minutes is reused rather than replaced: it
   * is nearly always this same traveler pressing the button twice, and the
   * second press should land on the same card form as the first, not open a
   * second one that could be paid as well. Anything older is cancelled at
   * Stripe, so its card form stops working, before a new one exists.
   */
  const { data: openRows } = await admin
    .from("payments")
    .select("id, stripe_payment_intent_id")
    .eq("booking_id", booking.id)
    .eq("status", "pending")
    .is("scheduled_date", null)
    .not("stripe_payment_intent_id", "is", null);

  const live: { rowId: string; intent: Stripe.PaymentIntent }[] = [];
  let moving = false;
  for (const row of openRows ?? []) {
    let intent: Stripe.PaymentIntent;
    try {
      intent = await stripe.paymentIntents.retrieve(row.stripe_payment_intent_id!);
    } catch {
      moving = true;
      break;
    }
    if (intent.status === "succeeded" || intent.status === "processing") {
      if (intent.status === "succeeded") await syncPaymentFromStripe(intent);
      moving = true;
    } else if (intent.status === "canceled") {
      await admin.from("payments").update({ status: "canceled" }).eq("id", row.id).eq("status", "pending");
    } else {
      live.push({ rowId: row.id, intent });
    }
  }

  if (moving || (await installmentInFlight(admin, booking.id))) {
    fail("A payment on this booking is going through right now. Give it a few minutes, then refresh.");
  }

  let cents: number;
  if (mode === "remaining") {
    cents = owed;
  } else {
    const parsed = parseAmountInput(rawAmount);
    if (parsed === null) {
      fail("Enter an amount in dollars, like 250 or 250.50.");
    }
    cents = parsed;
  }

  const valid = validateBalanceAmount(cents, owed);
  if (!valid.ok) {
    fail(valid.message);
  }

  // Newest first: the one to reuse, if any, is the latest.
  live.sort((a, b) => b.intent.created - a.intent.created);
  // Reused only for the same figure. A different one gets a fresh intent, and
  // the old one is cancelled with the rest below rather than having its
  // amount changed: its card form may still be open in another tab showing the
  // old figure, and an intent whose amount moved underneath it would let that
  // form confirm a charge for an amount it never displayed. A cancelled
  // intent's form just stops working.
  const reuse = live.find(
    (l) => Date.now() - l.intent.created * 1000 < BALANCE_REUSE_WINDOW_MS && l.intent.amount === cents,
  );

  for (const l of live) {
    if (l === reuse) continue;
    if (!(await cancelOpenIntent(l.intent.id))) {
      fail("A payment on this booking is going through right now. Give it a few minutes, then refresh.");
    }
    await admin.from("payments").update({ status: "canceled" }).eq("id", l.rowId).eq("status", "pending");
  }

  if (reuse) {
    redirect(`/bookings/${booking.id}/balance/${reuse.rowId}`);
  }

  // A Stripe failure here (unreachable, or refusing the request) goes back to
  // the bookings page with a reason, like every other failure in this action,
  // rather than to an error page. Nothing exists yet that needs undoing.
  let paymentIntent: Stripe.PaymentIntent;
  try {
    const stripeCustomerId = await getOrCreateStripeCustomerId(admin, { id: user.id, email: user.email! });

    // No setup_future_usage: the installments that remain keep coming off the
    // card saved with the deposit, and this page says so. metadata.kind is what
    // routes the webhook to settleBalancePayment, and bookingStatus is read by
    // lib/overpayment.ts (see createBooking).
    //
    // The idempotency key catches two submits that both got past the reuse
    // check above because neither had written its row yet: for the same
    // booking and amount within the same couple of minutes, Stripe hands both
    // the one intent. Two submits either side of a bucket boundary still get two
    // intents; the check after the insert below handles those.
    paymentIntent = await stripe.paymentIntents.create(
      {
        amount: cents,
        currency: "usd",
        customer: stripeCustomerId,
        automatic_payment_methods: { enabled: true },
        metadata: { bookingId: booking.id, userId: user.id, kind: "balance", bookingStatus: booking.status },
      },
      { idempotencyKey: `balance-${booking.id}-${cents}-${Math.floor(Date.now() / BALANCE_IDEMPOTENCY_BUCKET_MS)}` },
    );
  } catch (err) {
    console.error(
      `startBalancePayment: could not start a payment on booking ${booking.id}: ${err instanceof Error ? err.message : err}`,
    );
    fail("That did not start, and nothing was charged. Please try again in a couple of minutes.");
  }

  const { data: row, error } = await admin
    .from("payments")
    .insert({
      booking_id: booking.id,
      stripe_payment_intent_id: paymentIntent.id,
      amount: fromCents(cents),
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !row) {
    // Usually the twin of this submit got the same intent from Stripe and
    // wrote the row first (the column is unique). Its card form is this one's.
    const { data: existing } = await admin
      .from("payments")
      .select("id, status")
      .eq("stripe_payment_intent_id", paymentIntent.id)
      .maybeSingle();
    if (existing?.status === "pending") {
      redirect(`/bookings/${booking.id}/balance/${existing.id}`);
    }
    // No row means no page to pay it on, so the intent must not stay payable.
    // Unless the row exists in some other state, in which case the intent is
    // an older one Stripe replayed for this key and is already dealt with.
    if (!existing) await stripe.paymentIntents.cancel(paymentIntent.id).catch(() => undefined);
    fail("That did not start. Please try again in a couple of minutes.");
  }

  /*
   * Checked again now that the row exists, for the races the checks above
   * cannot see because they ran before it did:
   *
   *   - The cron may have claimed an installment in between. It writes its
   *     claim and then looks for open early payments; this writes its row and
   *     then looks for claims. Whichever goes second sees the other, so the
   *     two can never both go ahead. If this one sees a claim, it stands down.
   *   - The booking may have been cancelled in between.
   *   - A near-simultaneous submit with a different amount may have opened its
   *     own form. The earlier of the two wins, and the later stands down and
   *     sends the traveler to the earlier one's form.
   */
  const [inFlight, { data: current }, earlier] = await Promise.all([
    installmentInFlight(admin, booking.id),
    admin.from("bookings").select("status").eq("id", booking.id).single(),
    earlierOpenBalancePayment(admin, booking.id, { rowId: row.id, intent: paymentIntent }),
  ]);

  if (inFlight || current?.status !== "deposit_paid" || earlier) {
    await stripe.paymentIntents.cancel(paymentIntent.id).catch(() => undefined);
    await admin.from("payments").update({ status: "canceled" }).eq("id", row.id).eq("status", "pending");
    if (earlier) redirect(`/bookings/${booking.id}/balance/${earlier}`);
    fail(
      current?.status !== "deposit_paid"
        ? "That booking has no balance to pay online."
        : "A payment on this booking is going through right now. Give it a few minutes, then refresh.",
    );
  }

  redirect(`/bookings/${booking.id}/balance/${row.id}`);
}

// Stripe states in which an intent can still take a card.
const OPEN_INTENT_STATUSES: readonly string[] = ["requires_payment_method", "requires_confirmation", "requires_action"];

// A second press within this long lands on the first press's card form.
const BALANCE_REUSE_WINDOW_MS = 10 * 60 * 1000;

// The time bucket in the balance idempotency key. Short, so a traveler who
// comes back later for the same amount after that intent was cancelled is not
// handed the cancelled one again.
const BALANCE_IDEMPOTENCY_BUCKET_MS = 2 * 60 * 1000;

// Shown when checkout could not be set up. Nothing was charged and nothing
// is held, so trying again is the right advice.
const CHECKOUT_FAILED_MESSAGE = "We could not start your checkout. Nothing was charged. Please try again in a minute.";

/**
 * Undoes a pending booking createBooking could not finish.
 *
 * Deleted when nothing points at it yet. Once the acceptance is recorded it is
 * never deleted (those rows are append-only evidence, and deleting the booking
 * would either fail on them or take them with it), so it is cancelled instead,
 * which frees its place in the tier just the same: the capacity trigger does
 * not count cancelled bookings. A delete that fails (a payment row already
 * points at it) falls back to the same. Both are conditional on the booking
 * still being pending, so a payment that somehow landed is never undone.
 */
async function abandonPendingBooking(
  admin: ReturnType<typeof createAdminClient>,
  bookingId: string,
  { accepted }: { accepted: boolean },
) {
  if (!accepted) {
    const { error } = await admin.from("bookings").delete().eq("id", bookingId).eq("status", "pending");
    if (!error) return;
  }
  const { error: cancelError } = await admin
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId)
    .eq("status", "pending");
  if (cancelError) {
    console.error(`createBooking: could not undo pending booking ${bookingId}: ${cancelError.message}`);
  }
}

// How recent a pending booking has to be to count as a duplicate submit.
const DUPLICATE_BOOKING_WINDOW_MS = 10 * 60 * 1000;
const TWIN_BOOKING_WINDOW_MS = 60 * 1000;

/** True once the intent can no longer take money: cancelled now, or already. */
async function cancelOpenIntent(paymentIntentId: string): Promise<boolean> {
  const stripe = getStripe();
  try {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (intent.status === "canceled") return true;
    if (!OPEN_INTENT_STATUSES.includes(intent.status)) return false;
    await stripe.paymentIntents.cancel(paymentIntentId);
    return true;
  } catch {
    return false;
  }
}

/**
 * Another open early payment on this booking that was started before this one
 * (by Stripe's clock, ties broken by id so both sides agree), if there is one.
 * Returns its row id.
 */
async function earlierOpenBalancePayment(
  admin: ReturnType<typeof createAdminClient>,
  bookingId: string,
  mine: { rowId: string; intent: Stripe.PaymentIntent },
): Promise<string | null> {
  const { data: others } = await admin
    .from("payments")
    .select("id, stripe_payment_intent_id")
    .eq("booking_id", bookingId)
    .eq("status", "pending")
    .is("scheduled_date", null)
    .neq("id", mine.rowId)
    .not("stripe_payment_intent_id", "is", null);

  for (const other of others ?? []) {
    if (other.stripe_payment_intent_id === mine.intent.id) continue;
    try {
      const intent = await getStripe().paymentIntents.retrieve(other.stripe_payment_intent_id!);
      if (!OPEN_INTENT_STATUSES.includes(intent.status)) continue;
      const before =
        intent.created < mine.intent.created || (intent.created === mine.intent.created && intent.id < mine.intent.id);
      if (before) return other.id;
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * A pending booking by this traveler for this tier, from the last few
 * minutes, whose card form is still open and on the same plan. Returns its id.
 */
async function findOpenCheckout(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  tierId: string,
  plan: PaymentPlan,
): Promise<string | null> {
  const { data: recent } = await admin
    .from("bookings")
    .select("id, payments(status, scheduled_date, stripe_payment_intent_id)")
    .eq("user_id", userId)
    .eq("tier_id", tierId)
    .eq("status", "pending")
    .gte("created_at", new Date(Date.now() - DUPLICATE_BOOKING_WINDOW_MS).toISOString())
    .order("created_at", { ascending: false })
    .limit(3);

  for (const booking of recent ?? []) {
    const row = booking.payments.find(
      (p) => p.scheduled_date === null && p.status === "pending" && p.stripe_payment_intent_id,
    );
    if (!row) continue;
    try {
      const intent = await getStripe().paymentIntents.retrieve(row.stripe_payment_intent_id!);
      if (OPEN_INTENT_STATUSES.includes(intent.status) && paymentKindOf(intent) === plan) return booking.id;
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * The earliest pending booking by this traveler for this tier and price from
 * the last minute, if it is not this one. Ordered by created_at then id, so
 * two twins looking at the same moment agree on which is first.
 */
async function earlierTwin(
  admin: ReturnType<typeof createAdminClient>,
  { userId, tierId, totalAmount, bookingId }: { userId: string; tierId: string; totalAmount: number; bookingId: string },
): Promise<string | null> {
  const { data: twins } = await admin
    .from("bookings")
    .select("id")
    .eq("user_id", userId)
    .eq("tier_id", tierId)
    .eq("status", "pending")
    .eq("total_amount", totalAmount)
    .gte("created_at", new Date(Date.now() - TWIN_BOOKING_WINDOW_MS).toISOString())
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(1);

  const first = twins?.[0]?.id;
  return first && first !== bookingId ? first : null;
}

/**
 * The twin that survives may not have written its payment row yet, and its
 * pay page has nothing to show until it has. Waits a few seconds for it.
 */
async function waitForCheckoutRow(admin: ReturnType<typeof createAdminClient>, bookingId: string): Promise<boolean> {
  for (let i = 0; i < 10; i++) {
    const { data } = await admin
      .from("payments")
      .select("id")
      .eq("booking_id", bookingId)
      .is("scheduled_date", null)
      .not("stripe_payment_intent_id", "is", null)
      .limit(1);
    if (data && data.length > 0) return true;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return false;
}

// Back to the bookings page with the reason on show. A plain function, not a
// const arrow, so TypeScript knows the code after a call is unreachable.
function fail(message: string): never {
  redirect(`/bookings?error=${encodeURIComponent(message)}`);
}

// Self-service cancellation only covers pending/deposit_paid — a
// paid_in_full booking needs human judgment (how much of the trip cost is
// recoverable this close to departure), not a button. Status-only: no
// Stripe refund is issued automatically. If a deposit was already charged,
// treat it as non-refundable unless a refund is handled manually — wire in
// stripe.refunds.create() here instead if that's not the intended policy.
export async function cancelBooking(formData: FormData) {
  const bookingId = String(formData.get("booking_id") ?? "");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // RLS ("Users can view own bookings") already scopes this to the
  // signed-in user's own rows.
  const { data: booking } = await supabase.from("bookings").select("id, status").eq("id", bookingId).single();

  if (!booking || !["pending", "deposit_paid"].includes(booking.status)) {
    redirect("/bookings?error=That booking can't be cancelled online. Get in touch and we'll sort it out.");
  }

  const admin = createAdminClient();

  // Conditional on the status read above still holding. Between that read and
  // this write the deposit webhook can move the booking on, or the last
  // installment can make it paid_in_full, and a paid_in_full booking is not
  // one this button may cancel. No row back means it moved: same answer as if
  // it had been in that state to begin with.
  const { data: cancelled, error: bookingError } = await admin
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId)
    .in("status", ["pending", "deposit_paid"])
    .select("id");
  if (bookingError) {
    throw new Error(bookingError.message);
  }
  if (!cancelled || cancelled.length === 0) {
    redirect("/bookings?error=That booking can't be cancelled online. Get in touch and we'll sort it out.");
  }

  // Stop the installment cron from charging a cancelled booking's
  // remaining scheduled payments. Runs after the status write above, which is
  // half of how a deposit webhook scheduling at this same moment is caught:
  // scheduleInstallments writes its rows and then reads the status, this
  // writes the status and then sweeps the rows, so whichever goes second sees
  // the other and the rows end up canceled either way.
  const { error: paymentsError } = await admin
    .from("payments")
    .update({ status: "canceled" })
    .eq("booking_id", bookingId)
    .eq("status", "scheduled");
  if (paymentsError) {
    throw new Error(paymentsError.message);
  }

  /*
   * Stop every card form still open on the booking as well: the deposit form
   * of a pending booking, an early payment the traveler started, a scheduled
   * payment waiting on their bank's check. Each is cancelled at Stripe so its
   * form stops taking money. Otherwise a form left open in another tab could
   * still be paid after the booking is gone, which leaves a person to sort
   * out the refund. One Stripe will not cancel is already moving money; its
   * row is left as it is for the webhook to settle, and lib/overpayment.ts
   * logs it for review.
   */
  const { data: open } = await admin
    .from("payments")
    .select("id, stripe_payment_intent_id")
    .eq("booking_id", bookingId)
    .in("status", ["pending", "requires_action"])
    .not("stripe_payment_intent_id", "is", null);

  await Promise.all(
    (open ?? []).map(async (row) => {
      if (await cancelOpenIntent(row.stripe_payment_intent_id!)) {
        await admin
          .from("payments")
          .update({ status: "canceled" })
          .eq("id", row.id)
          .in("status", ["pending", "requires_action"]);
      } else {
        console.error(`cancelBooking: could not stop ${row.stripe_payment_intent_id} on cancelled booking ${bookingId}`);
      }
    }),
  );

  redirect("/bookings");
}
