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
import { claimMatches, getTierClaims, normalizeGroupCode } from "@/lib/tier-claims";
import { hasAcceptedAll, recordAcceptance } from "@/lib/legal-acceptance";
import {
  abandonPendingBooking,
  cancelCheckoutIntents,
  chooseAgainPath,
  isStalePending,
  recheckStaleCheckout,
  releasePendingCheckout,
  staleCheckoutMessage,
} from "@/lib/stale-checkout";
import { BOOKINGS_OPEN, CHECKOUT_SANDBOX, isTestTrip } from "@/lib/booking-window";
import { hasDeparted } from "@/lib/mountain-time";
import { OPEN_INTENT_STATUSES, POSSIBLY_OPEN_PAYMENT_FILTER, cancelOpenIntent } from "@/lib/stripe-intents";
import type { AccountErrorCode, CheckoutErrorCode } from "@/lib/flash";

export async function createBooking(formData: FormData) {
  const tripId = String(formData.get("tripId") ?? "");
  const tierId = String(formData.get("tierId") ?? "");
  const requestedGroupCode = String(formData.get("group_code") ?? "").trim() || null;
  // Where a failure sends the traveler back to: the same trip, package and
  // group code, so they land where they were rather than on a blank start.
  const back = { tripId, tierId, groupCode: requestedGroupCode };
  // Neither the terms nor the text-message opt-in is asked for here any more.
  // The terms are agreed to in the one box on the payment step, recorded by
  // acceptTermsForBooking before the card is confirmed; texts are opted into
  // on the trip page, once there is a phone number to send them to. A form
  // rendered before this change still posts accept_terms and sms_consent, and
  // both are ignored.
  // The only thing taken from the form about money is which of two plans was
  // picked, and only if it is one of the two. Every figure is worked out below
  // from the tier row. A form rendered before this field existed sends nothing,
  // which means the deposit, the only plan there was.
  const requestedPlan = String(formData.get("payment_plan") ?? "deposit");
  if (!isPaymentPlan(requestedPlan)) {
    checkoutError("invalid_plan", back);
  }
  const plan: PaymentPlan = requestedPlan;

  // Bookings are not open yet. Checked here as well as in the UI, because a
  // hidden button is presentation, not a control: this action is a POST
  // endpoint that anyone can call directly. /bookings/new shows its "opens
  // soon" state whenever this is false, so that is where this goes.
  if (!BOOKINGS_OPEN) {
    redirect("/bookings/new?error=closed");
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
    checkoutError("rate_limited", back);
  }

  // Re-fetch the tier server-side rather than trusting a client-supplied
  // price, and confirm it still belongs to a published trip (RLS enforces
  // this too, but the explicit filter makes the intent clear and gives a
  // clean "no longer available" error instead of an RLS-shaped one).
  const { data: tier, error: tierError } = await supabase
    .from("tiers")
    .select("id, name, price, trip_id, group_exclusive, trips!inner(status, name, start_date)")
    .eq("id", tierId)
    .eq("trip_id", tripId)
    .eq("trips.status", "published")
    .single();

  if (tierError || !tier) {
    checkoutError("unavailable", { tripId, groupCode: requestedGroupCode });
  }

  // Test trips are published so the sandbox can book them, and hidden
  // everywhere else. Hiding them is the page's job; this is the control, since
  // a direct POST with a test tier's id would otherwise book one on the live
  // site and take real money for a trip that does not exist.
  if (isTestTrip(tier.trips.name) && !CHECKOUT_SANDBOX) {
    checkoutError("unavailable", back);
  }

  // A trip that leaves today, or has left, takes no new bookings. The pages
  // show it as closed (lib/trips.ts); this is the control, for the same reason
  // as BOOKINGS_OPEN above. Mountain Time, where the trips are, not the
  // server's UTC. Only new bookings: an existing booking's balance and
  // installments are not touched by this.
  if (hasDeparted(tier.trips.start_date)) {
    checkoutError("departed", { tripId });
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
  const chargeCents = Math.round(chargeAmount * 100);

  // Stripe will not take less than 50 cents. Only reachable with a tier priced
  // at or under the pay-in-full discount, which is a data-entry slip, not a
  // free trip.
  if (chargeCents < 50) {
    checkoutError("not_payable_online", back);
  }

  // Booking/payment writes use the service role: RLS intentionally has no
  // INSERT policy for these tables (see the booking_checkout_rls_policies
  // migration), since payment-relevant rows should never be writable
  // directly by an authenticated client.
  const admin = createAdminClient();

  /*
   * One live checkout per traveler per package.
   *
   * A pending booking holds a bed, and on a penthouse its group's claim, for
   * 30 minutes. If a second submit made a second pending booking, one account
   * could keep a bed or a whole penthouse held indefinitely by starting a new
   * checkout just before the last one lapsed, without ever paying. So a
   * traveler's earlier pending booking on this tier is either carried on or
   * released, never left alongside a new one:
   *
   *   - still within its 30 minutes, and for the same group (or no code was
   *     typed), it is carried on: same booking, same hold, same created_at, so
   *     the hold is never extended. If the plan changed, its card form is
   *     replaced below.
   *   - past its 30 minutes, or for a different group code, it is released
   *     (its card form cancelled at Stripe, then the booking undone), and a
   *     new booking has to win its place from the trigger like anyone else's.
   *
   * One whose payment is already moving money cannot be released, and then
   * nothing new is started: the traveler waits for that one to settle.
   */
  const own = await ownPendingCheckouts(admin, user.id, tierId);
  let carried: OwnPending | null = null;
  for (const earlier of own) {
    if (!carried && !isStalePending(earlier) && sameGroup(earlier.group_code, requestedGroupCode)) {
      carried = earlier;
      continue;
    }
    if (!(await releasePendingCheckout(admin, earlier.id))) {
      checkoutError("payment_moving", back);
    }
  }

  // A second press of the same button, or the back button and Pay again:
  // the carried booking's card form is still open for this exact charge, so
  // the traveler goes back to it rather than getting a second one.
  if (carried) {
    const open = await openCheckoutIntent(carried);
    if (open?.status === "open" && paymentKindOf(open.intent) === plan && open.intent.amount === chargeCents) {
      redirect(`/bookings/${carried.id}/pay`);
    }
    if (open?.status === "moving") {
      checkoutError("payment_moving", back);
    }
  }

  let groupCode: string | null = carried?.group_code ?? null;
  if (!carried) {
    /*
     * A penthouse (a group-exclusive tier) is bought out by one friend group:
     * once someone holds it, only their group code gets in. The
     * check_tier_capacity trigger is what enforces that, race-safely; this is
     * the read ahead of it, so the usual case gets a plain message and sends
     * nothing to Stripe. See lib/tier-claims.ts for what "holds" means.
     *
     * A traveler rebooking their own penthouse left the code box empty, and
     * resolveGroupCode would mint them a fresh code that their own booking then
     * locks out. So with no code typed, their own PAID booking on this tier
     * supplies it. Not an unpaid one: their fresh checkout is carried on above
     * instead, and a lapsed one holds nothing and must not be revived.
     */
    let groupCodeToUse = requestedGroupCode;
    if (tier.group_exclusive) {
      const penthouseClaim = (await getTierClaims(admin, [tierId])).get(tierId);
      if (penthouseClaim && !groupCodeToUse) {
        groupCodeToUse = await ownPaidGroupCode(admin, user.id, tierId);
      }
      if (penthouseClaim && !claimMatches(penthouseClaim, groupCodeToUse)) {
        redirectTierClaimed(tripId, tier);
      }
    }

    const groupCodeResult = await resolveGroupCode(admin, tripId, groupCodeToUse);
    if ("error" in groupCodeResult) {
      checkoutError("group_code_not_found", back);
    }
    groupCode = groupCodeResult.code;

    // A day's worth of unpaid checkouts. Each one holds a bed (or a penthouse)
    // for 30 minutes, so without this one account could hold a place all day
    // by starting a fresh checkout every half hour. Six is several honest
    // false starts; counted only when a new booking is about to be made.
    if (!(await checkRateLimit(`pending-booking:${user.id}`, 6, 24 * 60 * 60))) {
      checkoutError("daily_limit", back);
    }
  }

  // Before the booking exists, not after: this is the Stripe call most likely
  // to fail (an account carrying a customer id Stripe does not know, or Stripe
  // being unreachable), and failing here leaves nothing behind. Failing after
  // the insert used to strand a pending booking holding a place in the tier
  // with no card form.
  //
  // setup_future_usage (below) attaches the payment method used here to this
  // Customer on success, so the installment cron can charge it off-session
  // later.
  let stripeCustomerId: string;
  try {
    stripeCustomerId = await getOrCreateStripeCustomerId(admin, { id: user.id, email: user.email! });
  } catch (err) {
    console.error(`createBooking: no Stripe customer for user ${user.id}: ${err instanceof Error ? err.message : err}`);
    checkoutError("checkout_failed", back);
  }

  let bookingId: string;
  if (carried) {
    // The plan (or the price) changed on a checkout still inside its hold.
    // The old card form is stopped first, so it cannot also be paid, then the
    // booking takes the new figures. Its created_at, and so its hold, stay.
    if (!(await cancelCheckoutIntents(admin, carried.id))) {
      checkoutError("payment_moving", back);
    }
    const { data: updated } = await admin
      .from("bookings")
      .update({ total_amount: totalAmount, deposit_amount: depositAmount })
      .eq("id", carried.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    // Paid or cancelled in the meantime: the bookings page says which.
    if (!updated) redirect("/bookings");
    bookingId = carried.id;
  } else {
    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .insert({
        user_id: user.id,
        trip_id: tripId,
        tier_id: tierId,
        status: "pending",
        total_amount: totalAmount,
        deposit_amount: depositAmount,
        group_code: groupCode,
        // sms_consent and its evidence columns are left to their defaults (false
        // and null). The opt-in lives on the trip page now; see
        // app/trip/[bookingId]/actions.ts.
      })
      .select("id")
      .single();

    if (bookingError?.message === "tier_at_capacity") {
      checkoutError("sold_out", { tripId, groupCode: requestedGroupCode });
    }

    // Another group took the penthouse between the read above and this insert.
    if (bookingError?.message === "tier_claimed") {
      redirectTierClaimed(tripId, tier);
    }

    if (bookingError || !booking) {
      throw new Error(bookingError?.message ?? "Failed to create booking");
    }

    /*
     * The check above cannot see a twin submitted in the same instant, since
     * neither booking exists when the other looks. So each one looks again now
     * that it exists: if an earlier pending booking by this traveler, for this
     * tier, was made in the last minute, this one is the duplicate. It is
     * deleted (it has no payment or acceptance yet, so nothing is lost) and
     * the traveler goes to the earlier one's card form. Whichever was inserted
     * first is never the one that backs off, so at least one always survives.
     */
    const twin = await earlierTwin(admin, { userId: user.id, tierId, bookingId: booking.id });
    if (twin) {
      await admin.from("bookings").delete().eq("id", booking.id).eq("status", "pending");
      redirect((await waitForCheckoutRow(admin, twin)) ? `/bookings/${twin}/pay` : "/bookings");
    }
    bookingId = booking.id;
  }

  /*
   * Everything from here to the redirect either all happens or is undone, so
   * a failure part-way never leaves a pending booking holding a place in the
   * tier with no card form behind it. The undo is abandonPendingBooking.
   *
   * No acceptance is written here. It is recorded on the payment step, by
   * acceptTermsForBooking, after the traveler ticks the one box there and
   * before their card is confirmed, so a booking abandoned before that point
   * has nothing to agree to and nothing to keep.
   *
   * setup_future_usage attaches the card to the Customer on success, so the
   * cron can charge installments off-session later. No separate SetupIntent is
   * needed, since a real amount is being charged right now (a SetupIntent is
   * for saving a card with no charge). A payment in full has no later
   * charges, so its card is not kept.
   */
  let paymentIntent: Stripe.PaymentIntent | undefined;
  try {
    // metadata.kind is how the webhook tells a deposit from a payment in full
    // (see paymentKindOf in lib/payments.ts). bookingStatus is the status this
    // path saw before creating the intent, which lib/overpayment.ts relies on to
    // tell money taken on a live booking from money taken on a cancelled one.
    //
    // The idempotency key is per booking and per card form, so a retried
    // request (a network retry inside the Stripe SDK, say) gets the same intent
    // back rather than a second one, while a carried booking whose earlier form
    // was cancelled gets a fresh one rather than the cancelled one replayed.
    const attempt = carried ? carried.payments.filter(isCheckoutRow).length : 0;
    paymentIntent = await getStripe().paymentIntents.create(
      {
        amount: chargeCents,
        currency: "usd",
        customer: stripeCustomerId,
        ...(plan === "deposit" ? { setup_future_usage: "off_session" as const } : {}),
        automatic_payment_methods: { enabled: true },
        metadata: { bookingId, userId: user.id, kind: plan, bookingStatus: "pending" },
      },
      { idempotencyKey: `checkout-${bookingId}-${chargeCents}${attempt > 0 ? `-${attempt}` : ""}` },
    );

    const { error: paymentError } = await admin.from("payments").insert({
      booking_id: bookingId,
      stripe_payment_intent_id: paymentIntent.id,
      amount: chargeAmount,
      status: "pending",
    });

    if (paymentError) {
      // A twin submit on the same carried booking got the same intent from
      // Stripe and wrote its row first. That row is this one's card form.
      const { data: existing } = await admin
        .from("payments")
        .select("id")
        .eq("stripe_payment_intent_id", paymentIntent.id)
        .maybeSingle();
      if (!existing) throw new Error(paymentError.message);
    }
  } catch (err) {
    console.error(`createBooking: booking ${bookingId} could not be set up: ${err instanceof Error ? err.message : err}`);
    // An intent with no row has no page to pay it on, so it must not stay
    // payable. Cancelled before the booking goes, so a form somehow already
    // open cannot take money for a booking that no longer holds a place.
    if (paymentIntent) {
      await getStripe()
        .paymentIntents.cancel(paymentIntent.id)
        .catch(() => undefined);
    }
    await abandonPendingBooking(admin, bookingId);
    checkoutError("checkout_failed", back);
  }

  redirect(`/bookings/${bookingId}/pay`);
}

export type AcceptTermsResult =
  | { ok: true }
  /** `href`, when set, is where the traveler should go next (a released checkout). */
  | { ok: false; message: string; href?: string };

/**
 * Records that the traveler agreed to the Terms and the Assumption of Risk,
 * from the one box on the payment step.
 *
 * CheckoutForm calls this after Stripe has validated the card fields and
 * before it confirms the payment, and does not confirm if this fails. That
 * order is the point: no card is charged against a booking with no record of
 * what its traveler agreed to. The webhook checks the same thing afterwards
 * and logs loudly if it ever finds a payment without one (lib/payments.ts).
 *
 * Idempotent. A retry after a declined card, a second tab, or a double press
 * finds the rows already written and returns ok without writing again; the
 * rows are append-only evidence of the versions in force at the first tick.
 * The table's unique (booking_id, document_slug) catches a race between two
 * presses, and the loser reads the winner's rows and returns ok too.
 */
export async function acceptTermsForBooking(bookingId: string): Promise<AcceptTermsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Your session has ended. Log in again to finish paying." };
  }

  if (!(await checkRateLimit(`accept:${user.id}`, 30, 60 * 60))) {
    return { ok: false, message: "Too many attempts. Please try again in a bit." };
  }

  // Through the traveler's own client, so RLS ("Users can view own bookings")
  // is what proves the booking is theirs: someone else's id comes back empty.
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) {
    return { ok: false, message: "We couldn't find that booking. Reload the page and try again." };
  }
  // Only a booking still waiting on its first payment is agreed to here.
  if (booking.status !== "pending") {
    return { ok: false, message: "This booking isn't waiting for payment anymore. Reload the page." };
  }

  // The last server step before the card is confirmed, so the place to catch a
  // checkout left open past its 30-minute hold whose bed or penthouse has gone
  // since (lib/stale-checkout.ts). Before the acceptance shortcut below, which
  // a retry would otherwise take straight past this.
  const stale = await recheckStaleCheckout(createAdminClient(), booking.id);
  if (!stale.ok) {
    return { ok: false, message: staleCheckoutMessage(stale.reason), href: chooseAgainPath(stale.tripId) };
  }

  if (await hasAcceptedAll(booking.id)) return { ok: true };

  try {
    await recordAcceptance({ bookingId: booking.id, userId: user.id });
    return { ok: true };
  } catch (err) {
    // A concurrent press may have written them first, which is success.
    if (await hasAcceptedAll(booking.id)) return { ok: true };
    console.error(`acceptTermsForBooking(${booking.id}): ${err instanceof Error ? err.message : err}`);
    return {
      ok: false,
      message: "We couldn't record your agreement, so nothing was charged. Please try again.",
    };
  }
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
    fail("invalid_mode");
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
    fail("rate_limited");
  }

  // RLS ("Users can view own bookings") scopes this to the signed-in user, so
  // someone else's booking id comes back empty.
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, total_amount")
    .eq("id", bookingId)
    .single();

  if (!booking || booking.status !== "deposit_paid") {
    fail("no_balance");
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
    fail("payment_moving");
  }

  let cents: number;
  if (mode === "remaining") {
    cents = owed;
  } else {
    const parsed = parseAmountInput(rawAmount);
    if (parsed === null) {
      fail("invalid_amount");
    }
    cents = parsed;
  }

  const valid = validateBalanceAmount(cents, owed);
  if (!valid.ok) {
    fail(valid.code);
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
      fail("payment_moving");
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
    fail("start_failed");
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
    fail("start_failed_retry");
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
    fail(current?.status !== "deposit_paid" ? "no_balance" : "payment_moving");
  }

  redirect(`/bookings/${booking.id}/balance/${row.id}`);
}

// A second press within this long lands on the first press's card form.
const BALANCE_REUSE_WINDOW_MS = 10 * 60 * 1000;

// The time bucket in the balance idempotency key. Short, so a traveler who
// comes back later for the same amount after that intent was cancelled is not
// handed the cancelled one again.
const BALANCE_IDEMPOTENCY_BUCKET_MS = 2 * 60 * 1000;

/**
 * Back to the package step with a reason, keeping the trip, the package and
 * the group code where they are known so the traveler lands where they were.
 * The reason is a code, which the page turns into words (lib/flash.ts); the
 * query string never carries a sentence. A plain function so TypeScript knows
 * it ends.
 */
function checkoutError(
  code: CheckoutErrorCode,
  where: { tripId?: string; tierId?: string; groupCode?: string | null } = {},
): never {
  const params = new URLSearchParams();
  if (where.tripId) params.set("trip", where.tripId);
  if (where.tierId) params.set("package", where.tierId);
  if (where.groupCode) params.set("group", where.groupCode);
  params.set("error", code);
  redirect(`/bookings/new?${params.toString()}`);
}

/**
 * Back to the package step when a penthouse is held by another group. Keeps
 * the trip and the package in the link so the traveler lands where they were,
 * with room to type the code; the page names the penthouse from the package.
 */
function redirectTierClaimed(tripId: string, tier: { id: string }): never {
  checkoutError("tier_claimed", { tripId, tierId: tier.id });
}

/**
 * The group code on this traveler's own PAID booking for this tier, if they
 * have one. Only their own rows are read, so this never hands anyone another
 * group's code. Unpaid ones are left out on purpose: a fresh one is carried on
 * by createBooking instead, and a lapsed one holds nothing and reviving its
 * code would let an unpaid checkout re-open a claim that had run out.
 */
async function ownPaidGroupCode(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  tierId: string,
): Promise<string | null> {
  const { data } = await admin
    .from("bookings")
    .select("group_code")
    .eq("user_id", userId)
    .eq("tier_id", tierId)
    .in("status", ["deposit_paid", "paid_in_full"])
    .not("group_code", "is", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.group_code ?? null;
}

// How recent another pending booking has to be to count as a twin submit.
const TWIN_BOOKING_WINDOW_MS = 60 * 1000;

type OwnPending = {
  id: string;
  status: string;
  created_at: string;
  group_code: string | null;
  payments: { id: string; status: string; scheduled_date: string | null; stripe_payment_intent_id: string | null }[];
};

/** This traveler's pending bookings on this tier, oldest first. */
async function ownPendingCheckouts(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  tierId: string,
): Promise<OwnPending[]> {
  const { data } = await admin
    .from("bookings")
    .select("id, status, created_at, group_code, payments(id, status, scheduled_date, stripe_payment_intent_id)")
    .eq("user_id", userId)
    .eq("tier_id", tierId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(20);
  return data ?? [];
}

/** A booking's checkout rows: the payments with an intent and no scheduled date. */
function isCheckoutRow(p: OwnPending["payments"][number]): boolean {
  return p.scheduled_date === null && Boolean(p.stripe_payment_intent_id);
}

/** No code typed means "the group I already have"; a typed one must be that group. */
function sameGroup(existing: string | null, typed: string | null): boolean {
  if (!normalizeGroupCode(typed)) return true;
  return normalizeGroupCode(existing) === normalizeGroupCode(typed);
}

/**
 * The newest checkout intent on a pending booking, as far as it matters here:
 * open (can still take a card), moving (processing or succeeded: money is on
 * its way, settled on the spot if it has succeeded), or null for none usable.
 */
async function openCheckoutIntent(
  booking: OwnPending,
): Promise<{ status: "open"; intent: Stripe.PaymentIntent } | { status: "moving" } | null> {
  // A failed checkout row counts too: a declined card leaves the intent at
  // requires_payment_method, still able to take another card.
  const rows = booking.payments.filter(
    (p) => isCheckoutRow(p) && (p.status === "pending" || p.status === "requires_action" || p.status === "failed"),
  );
  for (const row of rows.reverse()) {
    try {
      const intent = await getStripe().paymentIntents.retrieve(row.stripe_payment_intent_id!);
      if (OPEN_INTENT_STATUSES.includes(intent.status)) return { status: "open", intent };
      if (intent.status === "succeeded" || intent.status === "processing") {
        if (intent.status === "succeeded") await syncPaymentFromStripe(intent);
        return { status: "moving" };
      }
    } catch {
      return { status: "moving" };
    }
  }
  return null;
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
 * The earliest pending booking by this traveler for this tier from the last
 * minute, if it is not this one. Ordered by created_at then id, so two twins
 * looking at the same moment agree on which is first. Any plan: one traveler
 * has one live checkout per package (see createBooking).
 */
async function earlierTwin(
  admin: ReturnType<typeof createAdminClient>,
  { userId, tierId, bookingId }: { userId: string; tierId: string; bookingId: string },
): Promise<string | null> {
  const { data: twins } = await admin
    .from("bookings")
    .select("id")
    .eq("user_id", userId)
    .eq("tier_id", tierId)
    .eq("status", "pending")
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

// Back to the bookings page with the reason on show, as a code the page turns
// into words (lib/flash.ts). A plain function, not a const arrow, so
// TypeScript knows the code after a call is unreachable.
function fail(code: AccountErrorCode): never {
  redirect(`/bookings?error=${code}`);
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
    fail("cannot_cancel");
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
    fail("cannot_cancel");
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
    .or(POSSIBLY_OPEN_PAYMENT_FILTER)
    .not("stripe_payment_intent_id", "is", null);

  await Promise.all(
    (open ?? []).map(async (row) => {
      if (await cancelOpenIntent(row.stripe_payment_intent_id!)) {
        await admin
          .from("payments")
          .update({ status: "canceled" })
          .eq("id", row.id)
          .or(POSSIBLY_OPEN_PAYMENT_FILTER);
      } else {
        console.error(`cancelBooking: could not stop ${row.stripe_payment_intent_id} on cancelled booking ${bookingId}`);
      }
    }),
  );

  redirect("/bookings");
}
