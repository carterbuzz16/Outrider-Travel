"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { getAppUrl } from "@/lib/site-url";
import { isBookingId } from "@/lib/portal-token";
import { normalizeDiscountCode } from "@/lib/discount-codes";
import { resolveGroupCode } from "@/lib/group-code";
import { moveToSingleBalance } from "@/lib/installments";
import { tierDisplayName } from "@/lib/tier-display";
import { sendAmbassadorSpotEmail } from "@/lib/email/send";
import {
  AMBASSADOR_GOAL,
  AMBASSADOR_STATUSES,
  HOLD_STATUSES,
  loadAmbassadors,
  type AmbassadorStatus,
  type HoldStatus,
} from "@/lib/ambassadors";
import { ANNOUNCEMENT_MAX, TOOLKIT_BUCKET } from "@/lib/ambassador-rules";
import { friendCredit, programFor, spotPrice } from "@/lib/ambassador-program";
import { isToolkitObjectPath } from "@/lib/toolkit-upload";
import { LAST_SIGNUP_DEADLINE, LAST_SIGNUP_DEADLINE_DAY, signupsClosed } from "@/lib/signup-deadline";

/*
 * The back office's ambassador actions (/admin/ambassadors).
 *
 * Every one checks the role itself: a server action is a POST endpoint that
 * works whether or not the page was ever loaded (lib/admin.ts). Each reports
 * back by redirecting with a short code the page looks up (./flash.ts), never
 * with text from here.
 *
 * Nothing here moves money. A held spot that has taken any payment is left
 * for a person whenever settling or releasing it would mean a refund.
 */

function back(path: string, query: Record<string, string | number>): never {
  const params = new URLSearchParams(Object.entries(query).map(([k, v]) => [k, String(v)]));
  redirect(`${path}?${params.toString()}`);
}

function text(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value.length > 0 ? value : null;
}

/* -- add or edit an ambassador ---------------------------------------------- */

/**
 * Adds an ambassador, making their $0 code, or edits one. A new code is made
 * the way scripts/ambassador-codes.sql makes them: amount 0, 1,000 uses,
 * expiring at the signup deadline. A code that already exists is used as it
 * stands if it is a $0 one, and refused if it takes money off: a discount code
 * cannot double as someone's referral code.
 */
export async function saveAmbassador(formData: FormData) {
  await requireAdmin();
  const editing = text(formData, "existing_code");
  const code = editing ?? normalizeDiscountCode(formData.get("code"));
  const name = text(formData, "name");
  const listPath = "/admin/ambassadors";
  const path = editing ? `/admin/ambassadors/${editing}` : listPath;
  if (!code || !/^[A-Z0-9]{3,32}$/.test(code)) back(path, { error: "bad_code" });
  if (!name) back(path, { error: "missing_name" });

  const tripId = text(formData, "trip_id");
  const holdStatus = text(formData, "hold_status");
  if (holdStatus && !HOLD_STATUSES.includes(holdStatus as HoldStatus)) back(path, { error: "bad_status" });
  const status = text(formData, "status") ?? "accepted";
  if (!AMBASSADOR_STATUSES.includes(status as AmbassadorStatus)) back(path, { error: "bad_status" });
  const email = text(formData, "email")?.toLowerCase() ?? null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) back(path, { error: "bad_email" });

  const admin = createAdminClient();
  if (!editing) {
    const { data: existing } = await admin
      .from("discount_codes")
      .select("amount, percent_off")
      .eq("code", code)
      .maybeSingle();
    if (existing && !(Number(existing.amount) === 0 && existing.percent_off === null)) {
      back(listPath, { error: "code_is_discount" });
    }
    if (!existing) {
      const school = text(formData, "school");
      const { error } = await admin.from("discount_codes").insert({
        code,
        amount: 0,
        max_uses: 1000,
        once_per_person: false,
        active: true,
        expires_at: LAST_SIGNUP_DEADLINE.toISOString(),
        note: `Ambassador attribution code ($0) for ${name}${school ? `, ${school}` : ""}. Created ${new Date().toISOString().slice(0, 10)}.`,
      });
      if (error) {
        console.error(`saveAmbassador: code ${code}: ${error.code} ${error.message}`);
        back(listPath, { error: "save_failed" });
      }
    }
  }

  // A new email means a different person signs in: the account linked to the
  // old one loses the portal, and the new address links on its first sign-in
  // (lib/ambassador-portal.ts).
  let unlink = false;
  if (editing) {
    const { data: current } = await admin.from("ambassadors").select("email").eq("code", editing).maybeSingle();
    unlink = (current?.email ?? null) !== email;
  }

  const row = {
    code,
    name,
    school: text(formData, "school"),
    chapter: text(formData, "chapter"),
    status,
    email,
    phone: text(formData, "phone"),
    instagram: text(formData, "instagram")?.replace(/^@/, "") ?? null,
    trip_id: tripId,
    updated_at: new Date().toISOString(),
    ...(editing && formData.has("hold_status") ? { hold_status: holdStatus } : {}),
    ...(unlink ? { user_id: null } : {}),
  };
  const { error } = editing
    ? await admin.from("ambassadors").update(row).eq("code", editing)
    : await admin.from("ambassadors").insert(row);
  if (error) {
    console.error(`saveAmbassador ${code}: ${error.code} ${error.message}`);
    back(path, { error: error.code === "23505" ? "already_ambassador" : "save_failed" });
  }
  revalidatePath(listPath);
  back(`/admin/ambassadors/${code}`, { done: editing ? "saved" : "added" });
}

/* -- attributions -------------------------------------------------------------- */

/**
 * Credits a booking to an ambassador, for a friend who forgot the code. By
 * booking id, or by the traveler's email when they have exactly one live
 * booking. Written straight to discount_redemptions as source 'admin', so it
 * works after the code has expired too: the team decides, not the code's
 * dates. Replaces any other ambassador on that booking.
 */
export async function attachBooking(formData: FormData) {
  await requireAdmin();
  const code = normalizeDiscountCode(formData.get("code"));
  const path = `/admin/ambassadors/${code ?? ""}`;
  const ref = text(formData, "booking");
  if (!code || !ref) back(path, { error: "missing_booking" });

  const admin = createAdminClient();
  let bookingId: string | null = isBookingId(ref) ? ref : null;
  if (!bookingId) {
    const { data: user } = await admin.from("users").select("id").ilike("email", ref).maybeSingle();
    if (!user) back(path, { error: "no_account" });
    const { data: live } = await admin
      .from("bookings")
      .select("id")
      .eq("user_id", user.id)
      .in("status", ["deposit_paid", "paid_in_full"])
      .eq("ambassador_hold", false);
    if (!live || live.length === 0) back(path, { error: "no_live_booking" });
    if (live.length > 1) back(path, { error: "several_bookings" });
    bookingId = live[0].id;
  }

  const { data: booking } = await admin.from("bookings").select("id, ambassador_hold").eq("id", bookingId).maybeSingle();
  if (!booking) back(path, { error: "no_booking" });
  if (booking.ambassador_hold) back(path, { error: "is_hold" });

  await admin.from("discount_redemptions").delete().eq("booking_id", bookingId).eq("kind", "attribution");
  const { error } = await admin
    .from("discount_redemptions")
    .insert({ code, booking_id: bookingId, amount: 0, kind: "attribution", source: "admin" });
  if (error) {
    console.error(`attachBooking ${code} -> ${bookingId}: ${error.code} ${error.message}`);
    back(path, { error: "save_failed" });
  }
  revalidatePath("/admin/ambassadors");
  back(path, { done: "attached" });
}

/** Takes an ambassador's credit off a booking. The booking itself is untouched. */
export async function removeAttribution(formData: FormData) {
  await requireAdmin();
  const code = normalizeDiscountCode(formData.get("code"));
  const bookingId = String(formData.get("booking_id") ?? "");
  const path = `/admin/ambassadors/${code ?? ""}`;
  if (!code || !isBookingId(bookingId)) back(path, { error: "missing_booking" });

  const { error } = await createAdminClient()
    .from("discount_redemptions")
    .delete()
    .eq("booking_id", bookingId)
    .eq("code", code)
    .eq("kind", "attribution");
  if (error) {
    console.error(`removeAttribution ${code} <- ${bookingId}: ${error.code} ${error.message}`);
    back(path, { error: "save_failed" });
  }
  revalidatePath("/admin/ambassadors");
  back(path, { done: "removed" });
}

/* -- held spots ------------------------------------------------------------------- */

/**
 * Holds a Four to a Room place on the ambassador's trip, on the account their
 * email belongs to. The booking is deposit_paid with nothing paid, owing the
 * whole price, so check_tier_capacity counts it, and ambassador_hold, so it
 * never counts toward anyone's five. No installments are written, so the cron
 * never charges it. The ambassador needs an account first: one is never made
 * for them from here.
 */
export async function createHold(formData: FormData) {
  await requireAdmin();
  const code = normalizeDiscountCode(formData.get("code"));
  const path = `/admin/ambassadors/${code ?? ""}`;
  if (!code) back("/admin/ambassadors", { error: "bad_code" });

  const admin = createAdminClient();
  const { data: amb } = await admin
    .from("ambassadors")
    .select("email, trip_id, hold_status, hold_booking_id")
    .eq("code", code)
    .maybeSingle();
  if (!amb) back("/admin/ambassadors", { error: "bad_code" });
  if (amb.hold_booking_id && amb.hold_status !== "released") back(path, { error: "has_hold" });
  if (!amb.email) back(path, { error: "no_email" });
  if (!amb.trip_id) back(path, { error: "no_trip" });

  const { data: user } = await admin.from("users").select("id").ilike("email", amb.email).maybeSingle();
  if (!user) back(path, { error: "no_account" });

  // Four to a Room is BASE on every departure (lib/tier-display.ts).
  const { data: tiers } = await admin.from("tiers").select("id, name, price").eq("trip_id", amb.trip_id);
  const base = (tiers ?? []).find((t) => tierDisplayName(t.name) === tierDisplayName("BASE"));
  if (!base) back(path, { error: "no_base_tier" });

  const group = await resolveGroupCode(admin, amb.trip_id, null);
  const { data: booking, error } = await admin
    .from("bookings")
    .insert({
      user_id: user.id,
      trip_id: amb.trip_id,
      tier_id: base.id,
      status: "deposit_paid",
      total_amount: Number(base.price),
      deposit_amount: 0,
      group_code: "code" in group ? group.code : null,
      ambassador_hold: true,
    })
    .select("id")
    .single();
  if (error || !booking) {
    console.error(`createHold ${code}: ${error?.code} ${error?.message}`);
    back(path, { error: error?.message === "tier_at_capacity" ? "sold_out" : "save_failed" });
  }

  await admin
    .from("ambassadors")
    .update({
      hold_booking_id: booking.id,
      hold_status: "held",
      payment_link_id: null,
      payment_link_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq("code", code);
  revalidatePath("/admin/ambassadors");
  back(path, { done: "held" });
}

async function deactivateLink(linkId: string | null) {
  if (!linkId) return;
  try {
    await getStripe().paymentLinks.update(linkId, { active: false });
  } catch (err) {
    console.error(`ambassadors: could not switch off payment link ${linkId}: ${err instanceof Error ? err.message : err}`);
  }
}

/**
 * Settles every held spot: AMBASSADOR_GOAL or more paid in full by the
 * deadline and the spot is free (the booking becomes a $0 paid-in-full one,
 * like a comp, and any link sent earlier is switched off); fewer, and a spot
 * still only held gets a Stripe payment link for what it owes, emailed to the
 * ambassador and shown on the page to text as well. Safe to run again: a
 * link already sent is not sent twice, and someone who reaches five after
 * being sent one is made free on the next run.
 *
 * The link is a Stripe Payment Link for one payment whose PaymentIntent says
 * kind "balance" with the booking's id, so it is settled by the same webhook
 * code as a balance payment from the bookings page (lib/payments.ts): the
 * payment is recorded and the booking moves to paid in full.
 */
export async function settleHolds(formData: FormData) {
  await requireAdmin();
  const path = "/admin/ambassadors";
  const payByDay = text(formData, "pay_by") ?? LAST_SIGNUP_DEADLINE_DAY;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payByDay)) back(path, { error: "bad_date" });
  const payBy = new Date(`${payByDay}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  const admin = createAdminClient();
  const ambassadors = await loadAmbassadors(admin);
  if (!ambassadors) back(path, { error: "load_failed" });

  let free = 0;
  let sent = 0;
  let skipped = 0;
  for (const a of ambassadors) {
    if (!a.hold || (a.holdStatus !== "held" && a.holdStatus !== "paying")) continue;
    if (a.hold.status !== "deposit_paid") continue; // paid in full by now, or cancelled

    if (a.paidInFull >= AMBASSADOR_GOAL) {
      // Money already on it would need refunding to make it free: a person decides.
      if (a.hold.paidCents > 0) {
        skipped += 1;
        continue;
      }
      const { error } = await admin
        .from("bookings")
        .update({ status: "paid_in_full", total_amount: 0, deposit_amount: 0 })
        .eq("id", a.hold.bookingId)
        .eq("status", "deposit_paid");
      if (error) {
        console.error(`settleHolds: free ${a.code}: ${error.code} ${error.message}`);
        skipped += 1;
        continue;
      }
      await deactivateLink(a.paymentLinkId);
      await admin
        .from("ambassadors")
        .update({ hold_status: "free", updated_at: new Date().toISOString() })
        .eq("code", a.code);
      free += 1;
      continue;
    }

    if (a.holdStatus === "paying" || !a.email || !a.trip) {
      if (a.holdStatus !== "paying") skipped += 1;
      continue;
    }

    // Short of the goal, each friend who counts takes $100 off the spot
    // (lib/ambassador-program.ts, friendCredit). The spot's price is set
    // outright, the package price less the credit, so running this again
    // never takes the credit twice, and everything downstream (the link, the
    // receipt, paid in full) reads the price actually owed.
    const { data: holder } = await admin
      .from("bookings")
      .select("user_id, tiers(price)")
      .eq("id", a.hold.bookingId)
      .single();
    const listPrice = Number(holder?.tiers?.price ?? Number.NaN);
    if (!Number.isFinite(listPrice)) {
      skipped += 1;
      continue;
    }
    const program = programFor(a.program);
    const newTotal = spotPrice(program, listPrice, a.paidInFull);
    const { error: priceError } = await admin
      .from("bookings")
      .update({ total_amount: newTotal })
      .eq("id", a.hold.bookingId)
      .eq("status", "deposit_paid");
    if (priceError) {
      console.error(`settleHolds: price ${a.code}: ${priceError.code} ${priceError.message}`);
      skipped += 1;
      continue;
    }
    const owedCents = Math.round(newTotal * 100) - a.hold.paidCents;
    // Stripe charges 50 cents at least; anything less is a person's call.
    if (owedCents < 50) {
      skipped += 1;
      continue;
    }
    try {
      const stripe = getStripe();
      const price = await stripe.prices.create({
        currency: "usd",
        unit_amount: owedCents,
        product_data: { name: `${a.trip.name}, Four to a Room` },
      });
      const metadata = { bookingId: a.hold.bookingId, userId: holder?.user_id ?? "", kind: "balance", ambassadorHold: a.code };
      const link = await stripe.paymentLinks.create({
        line_items: [{ price: price.id, quantity: 1 }],
        metadata,
        payment_intent_data: { metadata },
        restrictions: { completed_sessions: { limit: 1 } },
        after_completion: { type: "redirect", redirect: { url: `${getAppUrl()}/bookings` } },
      });
      await admin
        .from("ambassadors")
        .update({
          hold_status: "paying",
          payment_link_id: link.id,
          payment_link_url: link.url,
          updated_at: new Date().toISOString(),
        })
        .eq("code", a.code);
      await sendAmbassadorSpotEmail({
        to: a.email,
        name: a.name,
        tripName: a.trip.name,
        amount: owedCents / 100,
        payBy,
        url: link.url,
        friends: a.paidInFull,
        credit: friendCredit(program, a.paidInFull),
      }).catch((err) => console.error(`settleHolds: email to ${a.code} failed: ${err instanceof Error ? err.message : err}`));
      sent += 1;
    } catch (err) {
      console.error(`settleHolds: link for ${a.code}: ${err instanceof Error ? err.message : err}`);
      skipped += 1;
    }
  }

  revalidatePath(path);
  back(path, { done: "settled", free, sent, skipped });
}

/**
 * After the deadline: every held spot whose payment link was not paid is
 * released. The booking is cancelled (it has nothing scheduled and no card
 * form, so that is all a release needs) and the link switched off. One with
 * part of its price paid is left for a person, since letting it go means a
 * refund.
 */
export async function releaseUnpaidHolds() {
  await requireAdmin();
  const path = "/admin/ambassadors";
  if (!signupsClosed()) back(path, { error: "too_early" });

  const admin = createAdminClient();
  const ambassadors = await loadAmbassadors(admin);
  if (!ambassadors) back(path, { error: "load_failed" });

  let released = 0;
  let skipped = 0;
  for (const a of ambassadors) {
    if (!a.hold || (a.holdStatus !== "held" && a.holdStatus !== "paying")) continue;
    if (a.hold.status !== "deposit_paid") continue;
    if (a.hold.paidCents > 0) {
      skipped += 1;
      continue;
    }
    const { error } = await admin
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", a.hold.bookingId)
      .eq("status", "deposit_paid");
    if (error) {
      console.error(`releaseUnpaidHolds ${a.code}: ${error.code} ${error.message}`);
      skipped += 1;
      continue;
    }
    await deactivateLink(a.paymentLinkId);
    await admin
      .from("ambassadors")
      // Their program status follows, unless the team has already dropped
      // them. Released ambassadors keep the portal (lib/ambassador-program.ts).
      .update({
        hold_status: "released",
        status: a.status === "dropped" ? "dropped" : "released",
        updated_at: new Date().toISOString(),
      })
      .eq("code", a.code);
    released += 1;
  }
  revalidatePath(path);
  back(path, { done: "released", released, skipped });
}

/* -- the December schedule ---------------------------------------------------------- */

/** Moves one December booking to the single balance payment, once its traveler has agreed. */
export async function moveToNewSchedule(formData: FormData) {
  await requireAdmin();
  const path = "/admin/ambassadors";
  const bookingId = String(formData.get("booking_id") ?? "");
  if (!isBookingId(bookingId)) back(path, { error: "missing_booking" });
  const result = await moveToSingleBalance(createAdminClient(), bookingId);
  revalidatePath(path);
  if (!result.ok) {
    console.error(`moveToNewSchedule ${bookingId}: ${result.message}`);
    back(path, { error: "move_failed" });
  }
  back(path, { done: "moved" });
}

/* -- announcements ---------------------------------------------------------------- */

/**
 * Posts a short plain-text note to the top of every ambassador's dashboard.
 * Stored as typed and always rendered as text, so markup in it is shown, not
 * run. Control characters other than line breaks are dropped.
 */
export async function postAnnouncement(formData: FormData) {
  await requireAdmin();
  const body = String(formData.get("body") ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, "")
    .trim();
  if (body.length === 0 || body.length > ANNOUNCEMENT_MAX) back("/admin/ambassadors", { error: "bad_announcement" });
  const { error } = await createAdminClient()
    .from("ambassador_announcements")
    .insert({ body, published: formData.get("published") !== "no" });
  if (error) {
    console.error(`postAnnouncement: ${error.code} ${error.message}`);
    back("/admin/ambassadors", { error: "save_failed" });
  }
  revalidatePath("/admin/ambassadors");
  back("/admin/ambassadors", { done: "announced" });
}

/** Shows or hides one announcement. */
export async function setAnnouncementPublished(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) back("/admin/ambassadors", { error: "save_failed" });
  const { error } = await createAdminClient()
    .from("ambassador_announcements")
    .update({ published: formData.get("published") === "yes" })
    .eq("id", id);
  if (error) {
    console.error(`setAnnouncementPublished: ${error.code} ${error.message}`);
    back("/admin/ambassadors", { error: "save_failed" });
  }
  revalidatePath("/admin/ambassadors");
  back("/admin/ambassadors", { done: "announcement_saved" });
}

/* -- toolkit graphics -------------------------------------------------------------- */

/** Removes one graphic from the toolkit bucket. Uploads go through ./toolkit/route.ts. */
export async function deleteToolkitFile(formData: FormData) {
  await requireAdmin();
  const path = String(formData.get("path") ?? "");
  if (!isToolkitObjectPath(path)) back("/admin/ambassadors", { error: "bad_file" });
  const { error } = await createAdminClient().storage.from(TOOLKIT_BUCKET).remove([path]);
  if (error) {
    console.error(`deleteToolkitFile(${path}): ${error.message}`);
    back("/admin/ambassadors", { error: "save_failed" });
  }
  revalidatePath("/admin/ambassadors");
  back("/admin/ambassadors", { done: "file_deleted" });
}
