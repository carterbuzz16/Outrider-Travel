import { NextResponse } from "next/server";
import { getAdminUserId } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppUrl } from "@/lib/site-url";
import { toCsv } from "@/app/admin/csv";
import { AMBASSADOR_GOAL, HOLD_STATUS_LABEL, SOURCE_LABEL, loadAmbassadors, referralLink } from "@/lib/ambassadors";
import { programFor } from "@/lib/ambassador-program";

/*
 * Everything on /admin/ambassadors as one CSV: a line per credited booking,
 * with its ambassador's totals repeated on each, and a line for an
 * ambassador with nothing credited yet, so nobody drops out of the sheet.
 *
 * A route handler never renders the admin layout, so the role is checked
 * here first, and anyone else gets a bare 404. The file carries phone numbers
 * and traveler emails, so each download is logged with the admin's id.
 */

export const dynamic = "force-dynamic";

const NO_STORE = {
  "Cache-Control": "no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Awaiting payment",
  deposit_paid: "Deposit paid",
  paid_in_full: "Paid in full",
  cancelled: "Cancelled",
};

export async function GET() {
  const adminId = await getAdminUserId();
  if (!adminId) return new NextResponse("Not found", { status: 404, headers: NO_STORE });

  const ambassadors = await loadAmbassadors(createAdminClient());
  if (!ambassadors) return new NextResponse("Ambassadors could not be loaded", { status: 500, headers: NO_STORE });
  console.info(`[admin-audit] ambassadors export: admin=${adminId} rows=${ambassadors.length} at=${new Date().toISOString()}`);

  const site = getAppUrl();
  const header = [
    "Ambassador",
    "School",
    "Chapter",
    "Status",
    "Agreed",
    "Code",
    "Referral link",
    "Phone",
    "Instagram",
    "Email",
    "Trip",
    "Deposit only",
    "Paid in full",
    `To ${AMBASSADOR_GOAL}`,
    "Held spot",
    "Payment link",
    "Traveler",
    "Traveler email",
    "Booking trip",
    "Package",
    "Discount",
    "Paid",
    "Balance",
    "Status",
    "Counts",
    "Note",
    "Attributed by",
    "Credited at",
  ];
  const rows = ambassadors.flatMap((a) => {
    const base = [
      a.name,
      a.school,
      a.chapter,
      a.status,
      a.agreedAt,
      a.code,
      referralLink(site, a.code, programFor(a.program)),
      a.phone,
      a.instagram ? `@${a.instagram}` : null,
      a.email,
      a.trip ? `${a.trip.name} (${a.trip.start_date})` : null,
      a.depositOnly,
      a.paidInFull,
      a.toGoal,
      a.holdStatus ? HOLD_STATUS_LABEL[a.holdStatus] : null,
      a.paymentLinkUrl,
    ];
    if (a.bookings.length === 0) return [[...base, ...Array<null>(12).fill(null)]];
    return a.bookings.map((b) => [
      ...base,
      b.traveler,
      b.email,
      `${b.tripName}${b.tripStart ? ` (${b.tripStart})` : ""}`,
      b.packageName,
      b.discount,
      (b.paidCents / 100).toFixed(2),
      (b.remainingCents / 100).toFixed(2),
      STATUS_LABEL[b.status] ?? b.status,
      b.counts,
      b.note,
      b.source ? SOURCE_LABEL[b.source] : null,
      b.creditedAt,
    ]);
  });

  return new NextResponse(toCsv(header, rows), {
    headers: {
      ...NO_STORE,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ambassadors-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
