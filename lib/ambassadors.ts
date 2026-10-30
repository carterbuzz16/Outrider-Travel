import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { readLedger, type LedgerPayment } from "@/app/admin/payment-ledger";
import { CHECKOUT_SANDBOX, isTestTrip } from "@/lib/booking-window";
import type { AttributionSource } from "@/lib/discount-codes";
import { OLD_DECEMBER_DATES } from "@/lib/installments";
import { tierDisplayName } from "@/lib/tier-display";
import { TELLURIDE_2026, programFor } from "@/lib/ambassador-program";
import { classifyFriend, isTestEmail, utcMs } from "@/lib/ambassador-rules";

type Admin = SupabaseClient<Database>;
type BookingStatus = Database["public"]["Enums"]["booking_status"];

/*
 * Ambassadors and what they have earned toward a free trip (27 October 2026).
 *
 * Each ambassador has a $0 code (tracking_only_codes) and a row in
 * public.ambassadors (referrals_and_ambassadors). A booking is theirs when it
 * holds their code as its attribution (lib/referral.ts). Whether it COUNTS
 * toward their goal is classifyFriend in lib/ambassador-rules.ts, the one rule
 * the admin page and the ambassador portal both use: paid in full by its
 * departure's deadline (lib/ambassador-program.ts: the end of November 14 for
 * December, December 4 for January), not cancelled or refunded, not a held
 * spot, not test data. A discount code on the booking (CHPTR) does not stop
 * it counting.
 *
 * Test bookings (a [seed] or [test] trip, or Carter's own test accounts) are
 * listed but never counted on the live site; on a checkout sandbox build they
 * count, so the rule can be tried end to end.
 *
 * At the deadline the team settles each held spot from /admin/ambassadors:
 * five or more and it is free; otherwise the ambassador is sent a Stripe
 * payment link for it, and a spot still unpaid after the deadline is
 * released.
 */

/** The Telluride goal, for the callers that predate lib/ambassador-program.ts. */
export const AMBASSADOR_GOAL = TELLURIDE_2026.goal;

/** ambassadors.status (ambassador_portal migration). Dropped loses the portal; released keeps it (lib/ambassador-program.ts). */
export const AMBASSADOR_STATUSES = ["onboarded", "accepted", "active", "earned", "released", "dropped", "code_only"] as const;
export type AmbassadorStatus = (typeof AMBASSADOR_STATUSES)[number];

export const AMBASSADOR_STATUS_LABEL: Record<AmbassadorStatus, string> = {
  onboarded: "Onboarded",
  accepted: "Accepted",
  active: "Active",
  earned: "Earned",
  released: "Released",
  dropped: "Dropped",
  code_only: "Code only, no portal",
};

export const HOLD_STATUSES = ["held", "free", "paying", "released"] as const;
export type HoldStatus = (typeof HOLD_STATUSES)[number];

export const HOLD_STATUS_LABEL: Record<HoldStatus, string> = {
  held: "Held",
  free: "Free",
  paying: "Payment link sent",
  released: "Released",
};

export const SOURCE_LABEL: Record<AttributionSource, string> = {
  link: "Link",
  typed: "Typed",
  admin: "Added by admin",
};

type BookingJoin = {
  id: string;
  status: BookingStatus;
  total_amount: number;
  deposit_amount: number;
  created_at: string;
  ambassador_hold: boolean;
  users: { email: string; name: string | null } | null;
  trips: { id: string; name: string; start_date: string } | null;
  tiers: { id: string; name: string } | null;
  payments: LedgerPayment[];
  discount_redemptions: { code: string; kind: string; amount: number }[];
};

const BOOKING_JOIN =
  "id, status, total_amount, deposit_amount, created_at, ambassador_hold, users(email, name), trips(id, name, start_date), tiers(id, name), payments(id, amount, status, scheduled_date, attempt_count, paid_at), discount_redemptions(code, kind, amount)";

export type AmbassadorBooking = {
  id: string;
  status: BookingStatus;
  traveler: string;
  email: string | null;
  tripName: string;
  tripStart: string | null;
  packageName: string;
  /** The discount beside the ambassador's code, if any: "CHPTR ($150)". */
  discount: string | null;
  total: number;
  paidCents: number;
  remainingCents: number;
  source: AttributionSource | null;
  /** When it was credited (the redemption row). */
  creditedAt: string;
  /** When the payment that cleared it landed, if it is paid in full. */
  paidInFullAt: string | null;
  refunded: boolean;
  isHold: boolean;
  isTest: boolean;
  /** Counts toward the five (see the rule above). */
  counts: boolean;
  /** Live, deposit in, balance still owed. */
  depositOnly: boolean;
  /** Why a paid or live booking does not count, for the detail table. */
  note: string | null;
};

export type AmbassadorHold = {
  bookingId: string;
  status: BookingStatus;
  paidCents: number;
  remainingCents: number;
};

export type Ambassador = {
  code: string;
  name: string;
  school: string | null;
  chapter: string | null;
  /** onboarded, accepted, active, earned, released or dropped (ambassador_portal migration). */
  status: string;
  program: string;
  /** The portal account, once linked. */
  userId: string | null;
  agreedAt: string | null;
  leaderboardHidden: boolean;
  /** The departure picked for an earned free trip. */
  rewardTrip: { id: string; name: string; start_date: string } | null;
  rewardClaimedAt: string | null;
  /** When "Welcome to Outrider" went out, or null (lib/email/ambassador-welcome.ts). */
  welcomeEmailSentAt: string | null;
  email: string | null;
  phone: string | null;
  instagram: string | null;
  trip: { id: string; name: string; start_date: string } | null;
  holdStatus: HoldStatus | null;
  hold: AmbassadorHold | null;
  paymentLinkUrl: string | null;
  paymentLinkId: string | null;
  bookings: AmbassadorBooking[];
  depositOnly: number;
  paidInFull: number;
  /** Paid-in-full bookings still needed to reach AMBASSADOR_GOAL. */
  toGoal: number;
};

function toBooking(
  b: BookingJoin,
  credit: { source: string | null; created_at: string },
  holdIds: Set<string>,
  today: string,
  program: ReturnType<typeof programFor>,
): AmbassadorBooking {
  const ledger = readLedger(b, today);
  const succeeded = b.payments.filter((p) => p.status === "succeeded");
  const refunded = b.payments.some((p) => p.status === "refunded") && succeeded.length === 0;
  // The payment that took it to paid in full is the last to land. A booking a
  // comp code paid for has no payment, and was confirmed when it was made.
  const paidMs =
    b.status === "paid_in_full"
      ? succeeded.length > 0
        ? Math.max(...succeeded.map((p) => utcMs(p.paid_at) ?? 0))
        : utcMs(b.created_at)
      : null;
  const isHold = b.ambassador_hold || holdIds.has(b.id);
  const isTest = isTestTrip(b.trips?.name ?? "") || isTestEmail(b.users?.email);
  const { counts, onTheWay: depositOnly, note } = classifyFriend(
    { status: b.status, isHold, isTest, refunded, paidInFullMs: paidMs, tripStart: b.trips?.start_date ?? null },
    program,
    CHECKOUT_SANDBOX,
  );
  const discount = b.discount_redemptions.find((r) => r.kind === "discount");

  return {
    id: b.id,
    status: b.status,
    traveler: b.users?.name?.trim() || b.users?.email || "Unknown",
    email: b.users?.email ?? null,
    tripName: b.trips?.name ?? "Unknown trip",
    tripStart: b.trips?.start_date ?? null,
    packageName: b.tiers ? tierDisplayName(b.tiers.name) : "Unknown",
    discount: discount ? `${discount.code} ($${Number(discount.amount).toLocaleString("en-US")})` : null,
    total: Number(b.total_amount),
    paidCents: ledger.paidCents,
    remainingCents: ledger.remainingCents,
    source: (credit.source as AttributionSource | null) ?? null,
    creditedAt: credit.created_at,
    paidInFullAt: paidMs !== null ? new Date(paidMs).toISOString() : null,
    refunded,
    isHold,
    isTest,
    counts,
    depositOnly,
    note,
  };
}

/**
 * Every ambassador with their bookings and counts, or one (`code`). Sorted
 * by paid in full, most first, then name. `null` when the table cannot be
 * read (the migration has not run, say), so the page can say so.
 */
export async function loadAmbassadors(admin: Admin, code?: string): Promise<Ambassador[] | null> {
  let query = admin
    .from("ambassadors")
    .select(
      "code, name, school, chapter, status, program, user_id, agreed_at, leaderboard_hidden, reward_claimed_at, welcome_email_sent_at, email, phone, instagram, hold_status, hold_booking_id, payment_link_id, payment_link_url, trips!ambassadors_trip_id_fkey(id, name, start_date), reward:trips!ambassadors_reward_trip_id_fkey(id, name, start_date)",
    )
    .order("name");
  if (code) query = query.eq("code", code);
  const { data: rows, error } = await query;
  if (error) {
    console.error(`loadAmbassadors: ${error.code} ${error.message}`);
    return null;
  }
  if (!rows || rows.length === 0) return [];

  const codes = rows.map((r) => r.code);
  const programByCode = new Map(rows.map((r) => [r.code, programFor(r.program)]));
  const holdIds = new Set(rows.map((r) => r.hold_booking_id).filter((id): id is string => Boolean(id)));

  const [{ data: credits, error: creditError }, { data: holds }] = await Promise.all([
    admin
      .from("discount_redemptions")
      .select(`code, source, created_at, bookings(${BOOKING_JOIN})`)
      .eq("kind", "attribution")
      .in("code", codes),
    holdIds.size > 0
      ? admin.from("bookings").select(BOOKING_JOIN).in("id", [...holdIds])
      : Promise.resolve({ data: [] as unknown[] }),
  ]);
  if (creditError) console.error(`loadAmbassadors: credits: ${creditError.code} ${creditError.message}`);

  const today = new Date().toISOString().slice(0, 10);
  const byCode = new Map<string, AmbassadorBooking[]>();
  for (const credit of (credits ?? []) as unknown as {
    code: string;
    source: string | null;
    created_at: string;
    bookings: BookingJoin | null;
  }[]) {
    if (!credit.bookings) continue;
    const list = byCode.get(credit.code) ?? [];
    list.push(toBooking(credit.bookings, credit, holdIds, today, programByCode.get(credit.code) ?? TELLURIDE_2026));
    byCode.set(credit.code, list);
  }
  const holdById = new Map(((holds ?? []) as unknown as BookingJoin[]).map((b) => [b.id, b]));

  const ambassadors = rows.map((r): Ambassador => {
    const bookings = (byCode.get(r.code) ?? []).sort((a, b) => b.creditedAt.localeCompare(a.creditedAt));
    const paidInFull = bookings.filter((b) => b.counts).length;
    const holdRow = r.hold_booking_id ? holdById.get(r.hold_booking_id) : undefined;
    const holdLedger = holdRow ? readLedger(holdRow, today) : null;
    const program = programFor(r.program);
    return {
      code: r.code,
      name: r.name,
      school: r.school,
      chapter: r.chapter,
      status: r.status,
      program: program.id,
      userId: r.user_id,
      agreedAt: r.agreed_at,
      leaderboardHidden: r.leaderboard_hidden,
      rewardTrip: r.reward,
      rewardClaimedAt: r.reward_claimed_at,
      welcomeEmailSentAt: r.welcome_email_sent_at,
      email: r.email,
      phone: r.phone,
      instagram: r.instagram,
      trip: r.trips,
      holdStatus: (r.hold_status as HoldStatus | null) ?? null,
      hold:
        holdRow && holdLedger
          ? {
              bookingId: holdRow.id,
              status: holdRow.status,
              paidCents: holdLedger.paidCents,
              remainingCents: holdLedger.remainingCents,
            }
          : null,
      paymentLinkUrl: r.payment_link_url,
      paymentLinkId: r.payment_link_id,
      bookings,
      depositOnly: bookings.filter((b) => b.depositOnly).length,
      paidInFull,
      toGoal: Math.max(0, program.goal - paidInFull),
    };
  });

  return ambassadors.sort((a, b) => b.paidInFull - a.paidInFull || b.depositOnly - a.depositOnly || a.name.localeCompare(b.name));
}

export type OldScheduleBooking = {
  id: string;
  traveler: string;
  email: string | null;
  packageName: string;
  scheduled: { date: string; amount: number }[];
};

/**
 * December bookings still on the 10 November and 1 December installments
 * (OLD_DECEMBER_DATES), for the "move to the new schedule" list. Only
 * bookings on the deposit with one of those still scheduled; a held spot has
 * no installments, so never appears.
 */
export async function loadOldScheduleBookings(admin: Admin, decemberStart = "2026-12-14"): Promise<OldScheduleBooking[]> {
  const { data, error } = await admin
    .from("bookings")
    .select("id, status, users(email, name), tiers(name), trips!inner(start_date), payments(status, amount, scheduled_date)")
    .eq("status", "deposit_paid")
    .eq("trips.start_date", decemberStart)
    .order("created_at");
  if (error) {
    console.error(`loadOldScheduleBookings: ${error.code} ${error.message}`);
    return [];
  }
  return (data ?? [])
    .map((b) => ({
      id: b.id,
      traveler: b.users?.name?.trim() || b.users?.email || "Unknown",
      email: b.users?.email ?? null,
      packageName: b.tiers ? tierDisplayName(b.tiers.name) : "Unknown",
      scheduled: b.payments
        .filter((p) => p.status === "scheduled" && p.scheduled_date)
        .map((p) => ({ date: p.scheduled_date!, amount: Number(p.amount) }))
        .sort((x, y) => x.date.localeCompare(y.date)),
    }))
    .filter((b) => b.scheduled.some((p) => OLD_DECEMBER_DATES.includes(p.date)));
}

/** The referral link for a code, as ambassadors share it: their program's landing page with ?ref=. */
export function referralLink(siteUrl: string, code: string, program = TELLURIDE_2026): string {
  return `${siteUrl.replace(/\/$/, "")}${referralPath(code, program)}`;
}

/** The same link as a path, for the copy buttons that add the origin themselves. */
export function referralPath(code: string, program = TELLURIDE_2026): string {
  return `${program.landingPath}?ref=${code.toLowerCase()}`;
}
