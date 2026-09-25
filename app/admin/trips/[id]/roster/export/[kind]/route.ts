import { NextResponse } from "next/server";
import { getAdminUserId } from "@/lib/admin";
import { isBookingId } from "@/lib/portal-token";
import { formatAmount, fromCents } from "@/lib/balance";
import { ABILITY_LEVELS, SKI_OR_BOARD, labelFor } from "@/app/trip/[bookingId]/fields";
import { readLedger } from "@/app/admin/payment-ledger";
import { toCsv } from "@/app/admin/csv";
import { gearComplete } from "@/lib/traveler-details";
import type { BookingStatus } from "@/app/admin/admin-ui";
import { loadRoster, loadTravelerPii, roomingOrder, type RosterBooking, type TravelerPiiRow } from "../../roster-data";

/*
 * The departure's CSV exports:
 *
 *   roster     everyone holding a spot, with money and task state
 *   rooming    for the Peaks: rooming requests in the order they arrived
 *   rentals    for the ski shop: ski or board, ability, height, weight, shoes
 *   insurance  legal name and date of birth
 *   dietary    anyone who listed a restriction
 *   emergency  phone and emergency contact
 *
 * A route handler never renders app/admin/layout.tsx, so the admin check is
 * made here, first, before anything is read. Anyone else gets a bare 404, which
 * says nothing about whether the trip exists. The last four files carry
 * traveler PII; each download is logged with the admin's id (ids only).
 */

export const dynamic = "force-dynamic";

const KINDS = ["roster", "rooming", "rentals", "insurance", "dietary", "emergency"] as const;
type Kind = (typeof KINDS)[number];
const PII_KINDS: Kind[] = ["rentals", "insurance", "dietary", "emergency"];

const NO_STORE = {
  "Cache-Control": "no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow",
};

export async function GET(_request: Request, props: { params: Promise<{ id: string; kind: string }> }) {
  const adminId = await getAdminUserId();
  if (!adminId) return new NextResponse("Not found", { status: 404, headers: NO_STORE });

  const { id, kind } = await props.params;
  if (!isBookingId(id) || !(KINDS as readonly string[]).includes(kind)) {
    return new NextResponse("Not found", { status: 404, headers: NO_STORE });
  }

  const roster = await loadRoster(id);
  if (!roster) return new NextResponse("Not found", { status: 404, headers: NO_STORE });

  const held = roster.held;
  let pii = new Map<string, TravelerPiiRow>();
  if (PII_KINDS.includes(kind as Kind)) {
    console.info(`[admin-audit] roster export: admin=${adminId} trip=${id} file=${kind} rows=${held.length} at=${new Date().toISOString()}`);
    pii = await loadTravelerPii(held.map((b) => b.id));
  }

  const csv = build(kind as Kind, held, pii);
  const filename = `${roster.filePrefix}-${kind}.csv`;

  return new NextResponse(csv, {
    headers: {
      ...NO_STORE,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

// Local rather than admin-ui's BOOKING_STATUS_META: that module is a
// component kit and pulls the design system's client components with it.
const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "Awaiting payment",
  deposit_paid: "Deposit paid",
  paid_in_full: "Paid in full",
  cancelled: "Cancelled",
};

const today = () => new Date().toISOString().slice(0, 10);

/** The name a supplier needs: the legal name once given, the account name before. */
function nameFor(booking: RosterBooking, details: TravelerPiiRow | undefined): string {
  return details?.legal_name || booking.name || booking.email || "";
}

function build(kind: Kind, held: RosterBooking[], pii: Map<string, TravelerPiiRow>): string {
  switch (kind) {
    case "roster":
      return toCsv(
        ["Confirmation", "Name", "School", "Email", "Package", "Status", "Plan", "Group code", "Paid", "Total", "Remaining", "Flights booked", "Rooming sent", "Sizes sent", "SMS opt-in", "Booked at (UTC)"],
        held.map((b) => {
          const ledger = readLedger(b, today());
          return [
            b.confirmation,
            b.name,
            pii.get(b.id)?.school,
            b.email,
            b.tierName,
            STATUS_LABEL[b.status],
            ledger.plan === "full" ? "Pay in full" : "Deposit",
            b.group_code,
            formatAmount(fromCents(ledger.paidCents)),
            formatAmount(Number(b.total_amount)),
            formatAmount(fromCents(ledger.remainingCents)),
            b.tasks.flights,
            b.tasks.rooming,
            b.tasks.details,
            b.sms_consent,
            b.created_at,
          ];
        }),
      );

    case "rooming":
      return toCsv(
        ["Order", "Name", "Package", "Group code", "Roommate requests", "Submitted at (UTC)"],
        roomingOrder(held).map((b, i) => [
          b.rooming ? i + 1 : "",
          b.name || b.email,
          b.tierName,
          b.group_code,
          !b.rooming ? "Not sent yet" : b.rooming.no_preference ? "No preference" : b.rooming.roommate_names.join("; "),
          b.rooming?.submitted_at ?? "",
        ]),
      );

    case "rentals":
      return toCsv(
        ["Name", "School", "Package", "Ski or snowboard", "Ability", "Height", "Weight", "Shoe size", "Sizes sent"],
        held.map((b) => {
          const d = pii.get(b.id);
          return [
            nameFor(b, d),
            d?.school,
            b.tierName,
            d ? labelFor(SKI_OR_BOARD, d.ski_or_board) : "",
            d ? labelFor(ABILITY_LEVELS, d.ability_level) : "",
            d?.height,
            d?.weight,
            d?.shoe_size,
            gearComplete(d ?? null),
          ];
        }),
      );

    case "insurance":
      return toCsv(
        ["Legal name", "Date of birth", "School", "Details sent"],
        held.map((b) => {
          const d = pii.get(b.id);
          return [nameFor(b, d), d?.date_of_birth, d?.school, Boolean(d)];
        }),
      );

    case "dietary":
      return toCsv(
        ["Name", "School", "Package", "Dietary restrictions"],
        held
          .map((b) => ({ b, d: pii.get(b.id) }))
          .filter(({ d }) => Boolean(d?.dietary_restrictions?.trim()))
          .map(({ b, d }) => [nameFor(b, d), d?.school, b.tierName, d!.dietary_restrictions]),
      );

    case "emergency":
      return toCsv(
        ["Name", "School", "Phone", "Emergency contact", "Emergency contact phone", "Details sent"],
        held.map((b) => {
          const d = pii.get(b.id);
          return [nameFor(b, d), d?.school, d?.phone, d?.emergency_contact_name, d?.emergency_contact_phone, Boolean(d)];
        }),
      );
  }
}
