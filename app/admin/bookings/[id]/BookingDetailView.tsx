import Link from "next/link";
import { Alert, Badge } from "@/components/ui";
import { formatAmount, fromCents } from "@/lib/balance";
import { formatDateRange } from "@/lib/trips";
import { formatDay } from "@/app/(protected)/dates";
import { ABILITY_LEVELS, SKI_OR_BOARD, labelFor } from "@/app/trip/[bookingId]/fields";
import { cancelBookingAsAdmin, deletePendingBooking } from "@/app/admin/actions";
import {
  BookingStatusBadge,
  DetailRow,
  Fill,
  PageHeader,
  Panel,
  Table,
  TableScroll,
  Td,
  Th,
  type BookingStatus,
  type PaymentStatus,
} from "@/app/admin/admin-ui";
import { readLedger, type LedgerLine, type LineTone } from "@/app/admin/payment-ledger";
import { Missing, TaskTicks, YesNo, linkClass } from "../bits";
import { nextPaymentDate, tasksFor } from "../booking-rows";
import { formatStamp } from "../format";

/**
 * One booking, everything about it, with no data access (page.tsx loads).
 *
 * Laid out as a column of panels in the order the owner asks about a
 * booking: who and what, the money, the group, the three tasks, then the
 * paper trail (consent, terms, emails). The traveler's personal details sit
 * last, behind an explicit reveal that page.tsx logs.
 */

export type DetailPayment = {
  id: string;
  amount: number;
  status: PaymentStatus;
  scheduled_date: string | null;
  attempt_count: number;
  paid_at: string | null;
  last_attempted_at: string | null;
  stripe_payment_intent_id: string | null;
};

export type DetailBooking = {
  id: string;
  user_id: string;
  trip_id: string;
  tier_id: string;
  status: BookingStatus;
  total_amount: number;
  deposit_amount: number;
  group_code: string | null;
  created_at: string;
  flights_booked: boolean;
  rooming_submitted: boolean;
  rooming_submitted_at: string | null;
  details_submitted: boolean;
  sms_consent: boolean;
  sms_consent_at: string | null;
  sms_consent_text_version: string | null;
  confirmation_email_sent_at: string | null;
  chase_email_sent_at: string | null;
  users: { email: string; name: string | null } | null;
  trips: { id: string; name: string; destination: string; start_date: string; end_date: string } | null;
  tiers: { id: string; name: string; max_capacity: number | null } | null;
  payments: DetailPayment[];
  rooming_requests: {
    roommate_names: string[];
    no_preference: boolean;
    submitted_at: string;
    updated_at: string;
  } | null;
  traveler_details: { submitted_at: string; updated_at: string } | null;
};

export type GroupMember = {
  id: string;
  status: BookingStatus;
  created_at: string;
  users: { name: string | null; email: string } | null;
  tiers: { name: string } | null;
};

export type PenthouseClaim = {
  tierName: string;
  capacity: number | null;
  held: number;
  pending: number;
  groupCodes: string[];
};

export type TravelerPii = {
  legal_name: string;
  date_of_birth: string;
  phone: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  ski_or_board: string;
  ability_level: string;
  height: string | null;
  weight: string | null;
  shoe_size: string | null;
  dietary_restrictions: string | null;
};

type Acceptance = { document_slug: string; document_version: string; accepted_at: string };

const DOCUMENT_NAMES: Record<string, string> = {
  terms: "Terms of Service",
  "assumption-of-risk": "Assumption of Risk",
  privacy: "Privacy Policy",
};

export default function BookingDetailView({
  booking,
  confirmation,
  today,
  stripeTestMode,
  acceptances,
  group,
  penthouse,
  pii,
  showPii,
  message,
  error,
}: {
  booking: DetailBooking;
  confirmation: string;
  today: string;
  stripeTestMode: boolean;
  acceptances: Acceptance[];
  group: GroupMember[];
  penthouse: PenthouseClaim | null;
  pii: TravelerPii | null;
  showPii: boolean;
  message?: string;
  error?: string;
}) {
  const ledger = readLedger(booking, today);
  const tasks = tasksFor(booking);
  const next = nextPaymentDate(ledger, booking.status);
  const nextLine = next
    ? ledger.lines.find((line) => line.kind === "installment" && line.date === next)
    : undefined;
  const email = booking.users?.email;
  const name = booking.users?.name;
  const trip = booking.trips;
  const stripeBase = `https://dashboard.stripe.com/${stripeTestMode ? "test/" : ""}payments/`;
  const upcoming = ledger.lines.filter(
    (line) => line.kind === "installment" && (line.payment.status === "scheduled" || line.tone === "flag"),
  );

  return (
    <main className="shell pb-16">
      <PageHeader
        eyebrow={`Booking ${confirmation}`}
        title={name || email || "Unnamed traveler"}
        lede={
          <>
            {email ? (
              <a href={`mailto:${email}`} className={linkClass}>
                {email}
              </a>
            ) : (
              "No email on the account"
            )}
            {" · "}Booked {formatStamp(booking.created_at)}
          </>
        }
        back={{ href: "/admin/bookings", label: "All bookings" }}
        actions={<BookingStatusBadge status={booking.status} plan={ledger.plan} />}
      />

      {message && (
        <div className="mt-6">
          <Alert tone="success">{message}</Alert>
        </div>
      )}
      {error && (
        <div className="mt-6">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* -- the trip ------------------------------------------------------ */}
        <Panel title="Trip">
          <dl>
            <DetailRow label="Confirmation">
              <span className="font-mono">{confirmation}</span>
            </DetailRow>
            <DetailRow label="Departure">
              {trip ? (
                <>
                  {trip.name}
                  <span className="block text-[--text-muted]">{formatDateRange(trip.start_date, trip.end_date)}</span>
                </>
              ) : (
                <Missing />
              )}
            </DetailRow>
            <DetailRow label="Package">{booking.tiers?.name ?? <Missing />}</DetailRow>
            <DetailRow label="Plan">{ledger.plan === "full" ? "Paid in full at booking" : "Deposit, then installments"}</DetailRow>
            <DetailRow label="Status">
              <BookingStatusBadge status={booking.status} plan={ledger.plan} />
            </DetailRow>
            {trip && (
              <DetailRow label="Roster">
                <Link href={`/admin/trips/${trip.id}/roster`} className={linkClass}>
                  Departure roster
                </Link>
              </DetailRow>
            )}
          </dl>
        </Panel>

        {/* -- money --------------------------------------------------------- */}
        <Panel title="Money">
          <dl>
            <DetailRow label="Total">{formatAmount(Number(booking.total_amount))}</DetailRow>
            <DetailRow label="Paid">{formatAmount(fromCents(ledger.paidCents))}</DetailRow>
            <DetailRow label="Remaining">
              {booking.status === "cancelled" ? (
                <Missing>Nothing further due, cancelled</Missing>
              ) : ledger.remainingCents > 0 ? (
                formatAmount(fromCents(ledger.remainingCents))
              ) : (
                <Missing>Nothing owed</Missing>
              )}
            </DetailRow>
            {ledger.overpaidCents > 0 && (
              <DetailRow label="Overpaid">
                <span className="text-[--flag-ink]">{formatAmount(fromCents(ledger.overpaidCents))}</span>
              </DetailRow>
            )}
            {ledger.refundedCents > 0 && (
              <DetailRow label="Refunded">{formatAmount(fromCents(ledger.refundedCents))}</DetailRow>
            )}
            <DetailRow label="Deposit">{formatAmount(Number(booking.deposit_amount))}</DetailRow>
            <DetailRow label="Next payment">
              {next && nextLine ? (
                <>
                  {formatAmount(Number(nextLine.payment.amount))} on {formatDay(next)}
                  {nextLine.tone === "flag" && <span className="block text-[--flag-ink]">{nextLine.label}</span>}
                </>
              ) : (
                <Missing>None scheduled</Missing>
              )}
            </DetailRow>
            <DetailRow label="Still scheduled">
              {upcoming.length > 0 ? `${upcoming.length} installment${upcoming.length === 1 ? "" : "s"}` : <Missing>None</Missing>}
            </DetailRow>
          </dl>
        </Panel>
      </div>

      {/* -- payment timeline -------------------------------------------------- */}
      <div className="mt-8">
        <Panel
          title="Payments"
          description={
            ledger.abandoned > 0
              ? `Oldest first. ${ledger.abandoned} early payment${ledger.abandoned === 1 ? " was" : "s were"} started and abandoned, never charged.`
              : "Oldest first. Each links to the charge in Stripe."
          }
          bleed
        >
          {ledger.lines.length === 0 ? (
            <p className="p-5 font-body text-body-s text-[--text-muted]">No payments recorded.</p>
          ) : (
            <TableScroll label="Payments">
              <Table>
                <thead>
                  <tr>
                    <Th>Kind</Th>
                    <Th align="right">Amount</Th>
                    <Th>Status</Th>
                    <Th>Date</Th>
                    <Th>Stripe</Th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.lines.map((line) => (
                    <PaymentRow key={line.payment.id} line={line} stripeBase={stripeBase} payments={booking.payments} />
                  ))}
                </tbody>
              </Table>
            </TableScroll>
          )}
        </Panel>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* -- group --------------------------------------------------------- */}
        <Panel title="Group">
          <dl>
            <DetailRow label="Group code">
              {booking.group_code ? (
                <Link href={`/admin/bookings?q=${encodeURIComponent(booking.group_code)}`} className={`font-mono ${linkClass}`}>
                  {booking.group_code}
                </Link>
              ) : (
                <Missing />
              )}
            </DetailRow>
          </dl>
          {booking.group_code && (
            <div className="mt-4">
              <p className="t-micro text-[--text-secondary]">
                {group.length === 0 ? "Nobody else has used this code yet" : `${group.length} other${group.length === 1 ? "" : "s"} in the group`}
              </p>
              {group.length > 0 && (
                <ul className="mt-2 list-none divide-y divide-[--rule-faint] p-0">
                  {group.map((member) => (
                    <li key={member.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                      <Link href={`/admin/bookings/${member.id}`} className={`font-body text-body-s ${linkClass}`}>
                        {member.users?.name || member.users?.email || "Unnamed"}
                      </Link>
                      <span className="flex items-center gap-2 font-body text-body-s text-[--text-muted]">
                        {member.tiers?.name}
                        <BookingStatusBadge status={member.status} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {penthouse && (
            <div className="mt-5 border-t border-[--rule] pt-4">
              <p className="t-micro text-[--text-secondary]">{penthouse.tierName} claim</p>
              <div className="mt-2.5">
                <Fill booked={penthouse.held} capacity={penthouse.capacity} />
              </div>
              <p className="mt-2 font-body text-body-s text-[--text-secondary]">
                {penthouse.capacity !== null && penthouse.held >= penthouse.capacity
                  ? "Claimed in full."
                  : penthouse.held === 0
                    ? "Nobody has paid for it yet."
                    : `${penthouse.capacity === null ? "" : `${penthouse.capacity - penthouse.held} spot${penthouse.capacity - penthouse.held === 1 ? "" : "s"} left to fill. `}`}
                {penthouse.pending > 0 && ` ${penthouse.pending} checkout${penthouse.pending === 1 ? "" : "s"} started, not paid.`}
                {penthouse.groupCodes.length > 0 && (
                  <span className="block text-[--text-muted]">
                    Held by group{penthouse.groupCodes.length === 1 ? "" : "s"} {penthouse.groupCodes.join(", ")}
                    {penthouse.groupCodes.length > 1 && ", which is more than one group in a whole-group penthouse"}
                  </span>
                )}
              </p>
            </div>
          )}
        </Panel>

        {/* -- tasks --------------------------------------------------------- */}
        <Panel title="Trip page tasks" actions={<TaskTicks tasks={tasks} />}>
          <dl>
            <DetailRow label="Flights booked">
              <YesNo value={tasks.flights} yes="Yes" no="Not yet" />
            </DetailRow>
            <DetailRow label="Rooming request">
              {booking.rooming_requests ? (
                <>
                  {booking.rooming_requests.no_preference
                    ? "No preference"
                    : booking.rooming_requests.roommate_names.join(", ") || "No names given"}
                  <span className="block text-[--text-muted]">
                    First sent {formatStamp(booking.rooming_requests.submitted_at)}
                  </span>
                </>
              ) : tasks.rooming ? (
                <>Submitted {formatStamp(booking.rooming_submitted_at)}</>
              ) : (
                <Missing>Not yet</Missing>
              )}
            </DetailRow>
            <DetailRow label="Traveler details">
              {booking.traveler_details ? (
                <>
                  Submitted {formatStamp(booking.traveler_details.submitted_at)}
                  {new Date(booking.traveler_details.updated_at).getTime() -
                    new Date(booking.traveler_details.submitted_at).getTime() >
                    60_000 && (
                    <span className="block text-[--text-muted]">
                      Last replaced {formatStamp(booking.traveler_details.updated_at)}
                    </span>
                  )}
                </>
              ) : (
                <Missing>Not yet</Missing>
              )}
            </DetailRow>
          </dl>
        </Panel>

        {/* -- paper trail --------------------------------------------------- */}
        <Panel title="Consent and terms">
          <dl>
            <DetailRow label="Text messages">
              {booking.sms_consent ? (
                <>
                  Opted in {formatStamp(booking.sms_consent_at)}
                  {booking.sms_consent_text_version && (
                    <span className="block font-mono text-[--text-muted]">{booking.sms_consent_text_version}</span>
                  )}
                </>
              ) : (
                <Missing>Not opted in</Missing>
              )}
            </DetailRow>
            {acceptances.length === 0 ? (
              <DetailRow label="Terms accepted">
                <span className="text-[--flag-ink]">No acceptance on record</span>
              </DetailRow>
            ) : (
              acceptances
                .slice()
                .sort((a, b) => a.accepted_at.localeCompare(b.accepted_at))
                .map((a) => (
                  <DetailRow key={`${a.document_slug}-${a.document_version}`} label={DOCUMENT_NAMES[a.document_slug] ?? a.document_slug}>
                    Version {a.document_version}
                    <span className="block text-[--text-muted]">{formatStamp(a.accepted_at)}</span>
                  </DetailRow>
                ))
            )}
          </dl>
        </Panel>

        <Panel title="Emails sent">
          <dl>
            <DetailRow label="Confirmation">
              {formatStamp(booking.confirmation_email_sent_at) ?? <Missing>Not sent</Missing>}
            </DetailRow>
            <DetailRow label="72-hour follow-up">
              {formatStamp(booking.chase_email_sent_at) ?? (
                <Missing>{tasks.flights && tasks.rooming && tasks.details ? "Not needed" : "Not sent"}</Missing>
              )}
            </DetailRow>
          </dl>
        </Panel>
      </div>

      {/* -- traveler PII ------------------------------------------------------- */}
      <div className="mt-8">
        <Panel
          title="Traveler details"
          description="Legal name, date of birth, phone, emergency contact, rental sizing and dietary needs. For the insurer and the rental shop. Each time this is shown, it is logged against your account."
          actions={
            showPii ? (
              <Link href={`/admin/bookings/${booking.id}`} prefetch={false} className={`t-micro ${linkClass}`}>
                Hide
              </Link>
            ) : undefined
          }
        >
          {!showPii ? (
            // A plain link, not prefetched: a prefetch would render the
            // details, and log a reveal, for a click that never happened.
            <Link
              href={`/admin/bookings/${booking.id}?details=show`}
              prefetch={false}
              className="t-micro inline-block border border-[--rule-strong] px-3 py-2 text-[--text] no-underline transition-colors duration-fast hover:border-[--text]"
            >
              Show traveler details
            </Link>
          ) : !pii ? (
            <p className="font-body text-body-s text-[--text-muted]">
              {booking.traveler_details ? "The details could not be read. Try again." : "The traveler has not sent their details yet."}
            </p>
          ) : (
            <dl>
              <DetailRow label="Legal name">{pii.legal_name}</DetailRow>
              <DetailRow label="Date of birth">{formatDay(pii.date_of_birth)}</DetailRow>
              <DetailRow label="Phone">
                <a href={`tel:${pii.phone}`} className={linkClass}>
                  {pii.phone}
                </a>
              </DetailRow>
              <DetailRow label="Emergency contact">
                {pii.emergency_contact_name}
                <span className="block">
                  <a href={`tel:${pii.emergency_contact_phone}`} className={linkClass}>
                    {pii.emergency_contact_phone}
                  </a>
                </span>
              </DetailRow>
              <DetailRow label="Ski or board">{labelFor(SKI_OR_BOARD, pii.ski_or_board)}</DetailRow>
              <DetailRow label="Ability">{labelFor(ABILITY_LEVELS, pii.ability_level)}</DetailRow>
              <DetailRow label="Height">{pii.height || <Missing>Not given</Missing>}</DetailRow>
              <DetailRow label="Weight">{pii.weight || <Missing>Not given</Missing>}</DetailRow>
              <DetailRow label="Shoe size">{pii.shoe_size || <Missing>Not given</Missing>}</DetailRow>
              <DetailRow label="Dietary">{pii.dietary_restrictions || <Missing>None given</Missing>}</DetailRow>
            </dl>
          )}
        </Panel>
      </div>

      {/* -- cancel ------------------------------------------------------------ */}
      {booking.status !== "cancelled" && (
        <div className="mt-8">
          <Panel title={booking.status === "pending" ? "Remove this booking" : "Cancel this booking"}>
            {/* Behind a disclosure so a stray tap on a phone cannot do it. */}
            <details>
              <summary className="t-micro cursor-pointer text-[--text-secondary]">
                {booking.status === "pending" ? "Remove unpaid booking…" : "Cancel booking and stop payments…"}
              </summary>
              <p className="mt-3 max-w-measure font-body text-body-s text-[--text-secondary]">
                {booking.status === "pending"
                  ? "No money was taken, so the booking is deleted outright."
                  : "The spot is released and every scheduled payment is stopped. Nothing is refunded automatically: refund in Stripe if one is owed."}
              </p>
              <form action={booking.status === "pending" ? deletePendingBooking : cancelBookingAsAdmin} className="mt-3">
                <input type="hidden" name="booking_id" value={booking.id} />
                <button
                  type="submit"
                  className="t-micro border border-[--flag] px-3 py-2 text-[--flag-ink] transition-colors duration-fast hover:bg-[--surface]"
                >
                  {booking.status === "pending" ? "Remove booking" : "Cancel booking"}
                </button>
              </form>
            </details>
          </Panel>
        </div>
      )}
    </main>
  );
}

const TONE_CLASS: Record<LineTone, string> = {
  normal: "text-[--text-secondary]",
  flag: "text-[--flag-ink]",
  muted: "text-[--text-muted]",
  notice: "text-[--accent]",
};

function PaymentRow({
  line,
  stripeBase,
  payments,
}: {
  line: LedgerLine;
  stripeBase: string;
  payments: DetailPayment[];
}) {
  const payment = payments.find((p) => p.id === line.payment.id);
  const intent = payment?.stripe_payment_intent_id ?? null;
  return (
    <tr>
      <Td className="whitespace-nowrap">{line.what}</Td>
      <Td align="right" className="whitespace-nowrap">
        {formatAmount(Number(line.payment.amount))}
      </Td>
      <Td className="whitespace-nowrap">
        <span className={TONE_CLASS[line.tone]}>{line.label}</span>
      </Td>
      <Td className="whitespace-nowrap text-[--text-secondary]">
        {line.payment.paid_at
          ? formatStamp(line.payment.paid_at)
          : line.date
            ? `Due ${formatDay(line.date)}`
            : payment?.last_attempted_at
              ? `Tried ${formatStamp(payment.last_attempted_at)}`
              : "—"}
      </Td>
      <Td className="whitespace-nowrap">
        {intent ? (
          <a href={`${stripeBase}${intent}`} target="_blank" rel="noopener noreferrer" className={`font-mono ${linkClass}`}>
            {intent.slice(0, 14)}…
          </a>
        ) : (
          <Badge tone="neutral" plain>
            Not charged yet
          </Badge>
        )}
      </Td>
    </tr>
  );
}
