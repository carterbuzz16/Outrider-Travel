import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Button, Input, Select } from "@/components/ui";
import CopyLinkButton from "@/components/CopyLinkButton";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatAmount } from "@/lib/balance";
import { formatDay } from "@/app/(protected)/dates";
import { CHECKOUT_SANDBOX, isTestTrip } from "@/lib/booking-window";
import { normalizeDiscountCode } from "@/lib/discount-codes";
import {
  AMBASSADOR_GOAL,
  AMBASSADOR_STATUS_LABEL,
  HOLD_STATUSES,
  HOLD_STATUS_LABEL,
  SOURCE_LABEL,
  loadAmbassadors,
  referralPath,
  type AmbassadorStatus,
} from "@/lib/ambassadors";
import { programFor } from "@/lib/ambassador-program";
import {
  AdminField,
  BookingStatusBadge,
  DetailRow,
  EmptyState,
  PageHeader,
  Panel,
  Table,
  TableScroll,
  Td,
  Th,
} from "@/app/admin/admin-ui";
import { attachBooking, createHold, removeAttribution, saveAmbassador } from "../actions";
import AmbassadorFields from "../AmbassadorFields";
import { AMBASSADOR_ERRORS, ambassadorDone } from "../flash";

export const metadata: Metadata = {
  title: "Ambassador",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * One ambassador: who they are, every booking credited to them and how it
 * got there (link, typed, or added here), and the controls to credit a
 * booking by hand, take a credit off, hold their spot and edit their details.
 */
export default async function AmbassadorPage(props: {
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const code = normalizeDiscountCode((await props.params).code);
  if (!code) notFound();
  const params = await props.searchParams;
  const admin = createAdminClient();
  const [found, { data: tripRows }] = await Promise.all([
    loadAmbassadors(admin, code),
    admin.from("trips").select("id, name, start_date").eq("status", "published").order("start_date"),
  ]);
  const a = found?.[0];
  if (!a) notFound();
  const trips = (tripRows ?? []).filter((t) => CHECKOUT_SANDBOX || !isTestTrip(t.name));
  const done = ambassadorDone(params);
  const error = params.error ? (AMBASSADOR_ERRORS[params.error] ?? "That didn't go through.") : null;

  return (
    <main className="shell pb-16">
      <PageHeader
        eyebrow={a.school ?? "Ambassador"}
        title={a.name}
        lede={`${a.paidInFull} paid in full, ${a.depositOnly} on the deposit. ${a.toGoal === 0 ? `Reached ${AMBASSADOR_GOAL}.` : `${a.toGoal} more paid in full to reach ${AMBASSADOR_GOAL}.`}`}
        back={{ href: "/admin/ambassadors", label: "Ambassadors" }}
        actions={<CopyLinkButton path={referralPath(a.code, programFor(a.program))} label="Copy referral link" />}
      />

      {(done || error) && (
        <p
          role={error ? "alert" : "status"}
          className={
            error
              ? "mt-6 border border-[--flag] px-4 py-3 font-body text-body-s text-[--flag-ink]"
              : "mt-6 border border-[--rule] bg-[--surface-raised] px-4 py-3 font-body text-body-s text-[--text]"
          }
        >
          {error ?? done}
        </p>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Panel title={`Bookings credited to ${a.code}`} bleed={a.bookings.length > 0}>
          {a.bookings.length === 0 ? (
            <EmptyState title="Nothing credited yet">
              Bookings show here once someone books with {a.code}, by their link or typed at checkout, or once you
              credit one below.
            </EmptyState>
          ) : (
            <TableScroll label={`Bookings credited to ${a.code}`}>
              <Table>
                <thead>
                  <tr>
                    <Th>Traveler</Th>
                    <Th>Trip and package</Th>
                    <Th>Discount</Th>
                    <Th align="right">Paid</Th>
                    <Th align="right">Balance</Th>
                    <Th>Status</Th>
                    <Th>How</Th>
                    <Th>
                      <span className="sr-only">Remove</span>
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {a.bookings.map((b) => (
                    <tr key={b.id}>
                      <Td>
                        <Link href={`/admin/bookings/${b.id}`} className="text-[--text] underline underline-offset-4">
                          {b.traveler}
                        </Link>
                        {b.email && <span className="block text-[--text-secondary]">{b.email}</span>}
                      </Td>
                      <Td>
                        {b.tripStart ? formatDay(b.tripStart) : b.tripName}
                        <span className="block text-[--text-secondary]">{b.packageName}</span>
                      </Td>
                      <Td>{b.discount ?? <span className="text-[--text-muted]">None</span>}</Td>
                      <Td align="right">{formatAmount(b.paidCents / 100)}</Td>
                      <Td align="right">{formatAmount(b.remainingCents / 100)}</Td>
                      <Td>
                        <span className="flex flex-col items-start gap-1">
                          <BookingStatusBadge status={b.status} />
                          {b.counts ? (
                            <Badge tone="open">Counts</Badge>
                          ) : (
                            b.note && <span className="text-[--text-secondary]">{b.note}</span>
                          )}
                        </span>
                      </Td>
                      <Td>{b.source ? SOURCE_LABEL[b.source] : "Unknown"}</Td>
                      <Td align="right">
                        <form action={removeAttribution}>
                          <input type="hidden" name="code" value={a.code} />
                          <input type="hidden" name="booking_id" value={b.id} />
                          <Button type="submit" variant="ghost" size="sm">
                            Remove
                          </Button>
                        </form>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableScroll>
          )}
        </Panel>

        <div className="flex flex-col gap-8">
          <Panel title="Details">
            <dl className="m-0">
              <DetailRow label="Code">{a.code}</DetailRow>
              <DetailRow label="Status">{AMBASSADOR_STATUS_LABEL[a.status as AmbassadorStatus] ?? a.status}</DetailRow>
              <DetailRow label="Chapter">{a.chapter ?? "Not set"}</DetailRow>
              <DetailRow label="Portal">
                {!a.email
                  ? "Needs their email to sign in"
                  : !a.userId
                    ? "Hasn't signed in yet"
                    : a.agreedAt
                      ? `Agreed ${formatDay(a.agreedAt.slice(0, 10))}`
                      : "Signed in, hasn't agreed yet"}
                {a.leaderboardHidden && <span className="block text-[--text-secondary]">Hidden on the leaderboard</span>}
              </DetailRow>
              {a.rewardClaimedAt && (
                <DetailRow label="Free trip">
                  {a.rewardTrip ? `${a.rewardTrip.name}, ${formatDay(a.rewardTrip.start_date)}` : "Picked"}
                </DetailRow>
              )}
              <DetailRow label="Trip">{a.trip ? `${a.trip.name}, ${formatDay(a.trip.start_date)}` : "Not set"}</DetailRow>
              <DetailRow label="Email">{a.email ?? "Not set"}</DetailRow>
              <DetailRow label="Phone">{a.phone ?? "Not set"}</DetailRow>
              <DetailRow label="Instagram">
                {a.instagram ? (
                  <a
                    href={`https://www.instagram.com/${a.instagram}/`}
                    className="text-[--accent] underline underline-offset-4"
                    target="_blank"
                    rel="noreferrer"
                  >
                    @{a.instagram}
                  </a>
                ) : (
                  "Not set"
                )}
              </DetailRow>
              <DetailRow label="Held spot">
                {a.holdStatus ? HOLD_STATUS_LABEL[a.holdStatus] : "None"}
                {a.hold && (
                  <Link href={`/admin/bookings/${a.hold.bookingId}`} className="ml-2 text-[--accent] underline underline-offset-4">
                    Booking
                  </Link>
                )}
              </DetailRow>
              {a.hold && a.hold.remainingCents > 0 && a.holdStatus !== "released" && (
                <DetailRow label="Spot owes">{formatAmount(a.hold.remainingCents / 100)}</DetailRow>
              )}
              {a.paymentLinkUrl && (
                <DetailRow label="Payment link">
                  <a href={a.paymentLinkUrl} className="text-[--accent] underline underline-offset-4" target="_blank" rel="noreferrer">
                    Open
                  </a>
                </DetailRow>
              )}
            </dl>
            {!a.holdStatus && (
              <form action={createHold} className="mt-4">
                <input type="hidden" name="code" value={a.code} />
                <Button type="submit" variant="secondary" size="sm" disabled={!a.email || !a.trip}>
                  Hold a Four to a Room spot
                </Button>
                <p className="mt-2 font-body text-body-s text-[--text-muted]">
                  Booked on the account for their email, with nothing to pay yet. It never counts toward their{" "}
                  {AMBASSADOR_GOAL}.
                </p>
              </form>
            )}
          </Panel>

          <Panel title="Credit a booking" description="For a friend who forgot the code. Shows as added by admin.">
            <form action={attachBooking} className="flex flex-col gap-3">
              <input type="hidden" name="code" value={a.code} />
              <AdminField label="Booking id or traveler email" htmlFor="booking">
                <Input id="booking" name="booking" required autoComplete="off" className="py-2" />
              </AdminField>
              <div>
                <Button type="submit" variant="primary" size="sm">
                  Credit to {a.code}
                </Button>
              </div>
            </form>
          </Panel>
        </div>
      </div>

      <div className="mt-10">
        <Panel title="Edit details">
          <form action={saveAmbassador} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <input type="hidden" name="existing_code" value={a.code} />
            <AmbassadorFields
              trips={trips}
              values={{
                code: a.code,
                name: a.name,
                school: a.school,
                chapter: a.chapter,
                status: a.status,
                email: a.email,
                phone: a.phone,
                instagram: a.instagram,
                tripId: a.trip?.id ?? null,
              }}
            />
            <AdminField
              label="Held spot status"
              htmlFor="hold_status"
              hint="Set by holding and settling. Change it here only to correct a mistake."
            >
              <Select id="hold_status" name="hold_status" defaultValue={a.holdStatus ?? ""} className="py-2">
                <option value="">None</option>
                {HOLD_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {HOLD_STATUS_LABEL[s]}
                  </option>
                ))}
              </Select>
            </AdminField>
            <div className="sm:col-span-2 lg:col-span-3">
              <Button type="submit" variant="primary" size="sm">
                Save
              </Button>
            </div>
          </form>
        </Panel>
      </div>
    </main>
  );
}
