import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, Badge, Button, Facts, ScheduleTable, cn, type BadgeTone } from "@/components/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { PORTAL_ANCHORS, verifyPortalToken } from "@/lib/portal-token";
import { formatDay } from "@/app/(protected)/dates";
import { formatDateRange } from "@/lib/trips";
import { formatAmount } from "@/lib/balance";
import { CONTACT } from "@/lib/site-content";
import { ABILITY_LEVELS, SKI_OR_BOARD, labelFor } from "./fields";
import { DetailsTask, FlightsToggle, FreshLinkForm, RoomingTask } from "./PortalForms";
import type { Database } from "@/types/supabase";
import PenthouseProgress from "@/components/PenthouseProgress";
import { getPenthouseProgress } from "@/lib/tier-claims";
import { penthouseInvitePath, toSnapshot } from "@/lib/penthouse";
import { roomKeyFor, tierDisplayName } from "@/lib/room-media";

/**
 * The trip portal: one booking's to-do list and payment picture, opened from a
 * signed link with no login (see lib/portal-token.ts).
 *
 * Dynamic on every request. The token has to be checked on each view, and a
 * cached copy of this page would be a copy of someone's booking.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your trip",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

type BookingStatus = Database["public"]["Enums"]["booking_status"];
type PaymentStatus = Database["public"]["Enums"]["payment_status"];

const OPEN_STATUSES: BookingStatus[] = ["deposit_paid", "paid_in_full"];

const STATUS: Record<BookingStatus, { tone: BadgeTone; label: string }> = {
  pending: { tone: "urgent", label: "Deposit due" },
  deposit_paid: { tone: "open", label: "Deposit paid" },
  paid_in_full: { tone: "new", label: "Paid in full" },
  cancelled: { tone: "closed", label: "Cancelled" },
};

const PAYMENT_LABEL: Partial<Record<PaymentStatus, string>> = {
  succeeded: "Paid",
  scheduled: "Scheduled",
  pending: "Processing",
  failed: "Did not go through",
  requires_action: "Needs verifying",
  refunded: "Refunded",
};

/*
 * Submission times are shown in Mountain time, the trip's own zone, with the
 * zone printed. The server renders in UTC on Vercel, so leaving the zone
 * implicit would show a late-evening submission as the next day.
 */
/**
 * Who to name, by package. The form always offers three name boxes
 * (MAX_ROOMMATES); this says how many of them a package can actually use, so a
 * Two to a Room traveler is not left wondering why there are three. Matched on
 * the raw tier name, like everything else in lib/room-media.ts.
 */
function roomingGuidance(tierName: string | null): string {
  switch (tierName ? roomKeyFor(tierName) : null) {
    case "BASE":
      return "Name up to three people you want to share your room with, or tell us you're happy anywhere. Rooms are same-gender.";
    case "MID":
      return "Name the one person you want to share your room with, or tell us you're happy anywhere. Rooms are same-gender.";
    case "PENTHOUSE":
    case "TOP":
      return "Your penthouse group rooms together. Name anyone in it you'd like to share a bedroom with, or tell us you're happy anywhere.";
    default:
      return "Name up to three people you want to share with, or tell us you're happy anywhere. Rooms are same-gender.";
  }
}

function formatSubmitted(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Denver",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export default async function TripPortalPage(props: {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<{ t?: string | string[] }>;
}) {
  const [{ bookingId: rawId }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const bookingId = rawId.toLowerCase();
  const token = typeof searchParams.t === "string" ? searchParams.t : "";

  // Nothing is read from the database until the token checks out, so a bad
  // link cannot be used to learn whether a booking id exists.
  const verdict = verifyPortalToken(bookingId, token);
  if (!verdict.ok) {
    return <LinkProblem bookingId={bookingId} reason={verdict.reason} />;
  }

  const admin = createAdminClient();
  // traveler_details: only the columns that may be shown back. The legal
  // name, date of birth, phone and emergency contact are never selected, so
  // they cannot end up in the rendered page or the RSC payload by accident.
  const { data: booking, error } = await admin
    .from("bookings")
    .select(
      `id, trip_id, tier_id, group_code, status, total_amount, deposit_amount, flights_booked, sms_consent,
       trips(name, destination, start_date, end_date),
       tiers(name),
       payments(id, status, amount, scheduled_date),
       rooming_requests(roommate_names, no_preference, submitted_at),
       traveler_details(submitted_at, updated_at, height, weight, shoe_size, ski_or_board, ability_level, dietary_restrictions)`
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (error) {
    console.error(`trip portal load(${bookingId}) failed: ${error.code} ${error.message}`);
    throw new Error("Could not load this trip.");
  }
  if (!booking) notFound();

  const trip = booking.trips;
  const open = OPEN_STATUSES.includes(booking.status);
  const rooming = booking.rooming_requests;
  const details = booking.traveler_details;

  /*
   * Money, derived the way BookingsView does it: only `succeeded` rows count
   * as paid, and the schedule is the dated rows minus those an early payment
   * cancelled.
   */
  const total = Number(booking.total_amount);
  const paid = booking.payments
    .filter((p) => p.status === "succeeded")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = Math.max(0, Math.round((total - paid) * 100) / 100);
  const schedule = booking.payments
    .filter((p) => p.scheduled_date && p.status !== "canceled")
    .sort((a, b) => (a.scheduled_date ?? "").localeCompare(b.scheduled_date ?? ""));
  const nextInstallment = schedule.find((p) => p.status === "scheduled");

  const tasksDone = [booking.flights_booked, Boolean(rooming), Boolean(details)].filter(Boolean).length;

  // A penthouse booking shows how full the group's penthouse is, with the
  // invite. Counts only (getPenthouseProgress), and only once this booking
  // holds a place.
  const penthouse = open ? (await getPenthouseProgress(admin, [booking])).get(booking.id) : undefined;

  let detailsLabel: string | null = null;
  if (details) {
    detailsLabel = `Submitted on ${formatSubmitted(details.submitted_at)}.`;
    // The trigger bumps updated_at on every replace; a minute's grace keeps
    // the first save from reading as an edit.
    if (new Date(details.updated_at).getTime() - new Date(details.submitted_at).getTime() > 60_000) {
      detailsLabel = `Submitted on ${formatSubmitted(details.submitted_at)}, last replaced ${formatSubmitted(details.updated_at)}.`;
    }
  }

  return (
    <main>
      <section className="shell max-w-[48rem] pb-10 pt-12 md:pt-20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
          <div className="min-w-0">
            <p className="stamp-type text-[--text-muted]">{trip?.destination ?? "Your trip"}</p>
            <h1 className="t-title mt-5 text-[--text]">{trip?.name ?? "Your trip"}</h1>
            <p className="mt-4 font-body text-body text-[--text]">
              {trip ? formatDateRange(trip.start_date, trip.end_date) : "Dates to be confirmed"}
              {booking.tiers?.name && <span className="text-[--text-secondary]"> · {tierDisplayName(booking.tiers.name)}</span>}
            </p>
          </div>
          <Badge tone={STATUS[booking.status].tone} className="self-start">
            {STATUS[booking.status].label}
          </Badge>
        </div>

        <p className="mt-6 max-w-measure font-body text-body-s leading-[1.7] text-[--text-secondary]">
          This page opens without a password, so keep the link to yourself.
        </p>

        {booking.status === "pending" && (
          <div className="mt-8">
            <Alert tone="info" title="Waiting on your deposit">
              The forms below open once your deposit has cleared.{" "}
              <Link href="/bookings" className="text-[--accent] decoration-[--accent]">
                Log in to pay it
              </Link>
              .
            </Alert>
          </div>
        )}
        {booking.status === "cancelled" && (
          <div className="mt-8">
            <Alert tone="warning" title="This booking was cancelled">
              Nothing here can be changed. If that is a surprise, write to{" "}
              <a href={`mailto:${CONTACT.email}`} className="text-[--accent] decoration-[--accent]">
                {CONTACT.email}
              </a>
              .
            </Alert>
          </div>
        )}

        {penthouse && booking.group_code && (
          <PenthouseProgress
            className="mt-8"
            initial={toSnapshot(penthouse)}
            renderedAt={new Date().toISOString()}
            tierId={booking.tier_id}
            groupCode={booking.group_code}
            invitePath={penthouseInvitePath(booking.trip_id, booking.tier_id, booking.group_code)}
          />
        )}
      </section>

      {/* -- tasks ----------------------------------------------------------- */}
      <section className="shell max-w-[48rem] pb-16" aria-labelledby="tasks-heading">
        <div className="flex items-end justify-between gap-6 border-b border-[--rule-strong] pb-3.5">
          <h2 id="tasks-heading" className="t-label text-[--text]">
            Before you go
          </h2>
          {open && (
            <p className="t-micro tabular-nums text-[--text-secondary]">
              {tasksDone === 3 ? "All done" : `${tasksDone} of 3 done`}
            </p>
          )}
        </div>
        {/* The same hairline meter as the bookings card, counting tasks
            rather than dollars. The count beside the heading says it in words. */}
        {open && (
          <div aria-hidden="true" className="h-[3px] w-full bg-[--rule-faint]">
            <div
              className="h-full bg-[--accent] transition-[width] duration-slow ease-out"
              style={{ width: `${Math.round((tasksDone / 3) * 100)}%` }}
            />
          </div>
        )}

        <ol className="m-0 flex list-none flex-col p-0">
          <Task id={PORTAL_ANCHORS.flights} number={1} title="Flights" done={booking.flights_booked}>
            <p className="max-w-measure font-body text-body-s leading-[1.7] text-[--text-secondary]">
              Flights are yours to book. The{" "}
              <Link href="/flights" className="text-[--accent] decoration-[--accent]">
                flight guide
              </Link>{" "}
              has the airports and the times to land and leave by. Tell us here once they are
              booked.
            </p>
            {open && <FlightsToggle bookingId={booking.id} token={token} booked={booking.flights_booked} />}
          </Task>

          <Task id={PORTAL_ANCHORS.rooming} number={2} title="Roommate request" done={Boolean(rooming)}>
            <p className="max-w-measure font-body text-body-s leading-[1.7] text-[--text-secondary]">
              {roomingGuidance(booking.tiers?.name ?? null)} Requests are assigned in the order they
              arrive.
            </p>
            {open ? (
              <RoomingTask
                bookingId={booking.id}
                token={token}
                existing={
                  rooming
                    ? {
                        names: rooming.roommate_names,
                        noPreference: rooming.no_preference,
                        submittedLabel: formatSubmitted(rooming.submitted_at),
                      }
                    : null
                }
              />
            ) : (
              rooming && (
                <p className="mt-4 font-body text-body-s text-[--text-secondary]">
                  Received {formatSubmitted(rooming.submitted_at)}.
                </p>
              )
            )}
          </Task>

          <Task id={PORTAL_ANCHORS.details} number={3} title="Traveler details" done={Boolean(details)}>
            <p className="max-w-measure font-body text-body-s leading-[1.7] text-[--text-secondary]">
              Your legal name and date of birth, for your lift tickets and lodging records and for
              travel insurance if you choose to add it. A number to reach you and someone at home,
              and your sizes so your ski or snowboard rentals are ready when you arrive.
            </p>

            {details && (
              <Facts
                className="mt-6"
                columns={3}
                items={[
                  { label: "Riding", value: labelFor(SKI_OR_BOARD, details.ski_or_board) },
                  { label: "Ability", value: labelFor(ABILITY_LEVELS, details.ability_level) },
                  { label: "Height", value: details.height ?? "Not given" },
                  { label: "Weight", value: details.weight ?? "Not given" },
                  { label: "Shoe size", value: details.shoe_size ?? "Not given" },
                  { label: "Dietary", value: details.dietary_restrictions ?? "None" },
                ]}
              />
            )}

            {open ? (
              <DetailsTask
                bookingId={booking.id}
                token={token}
                submitted={detailsLabel ? { label: detailsLabel } : null}
                smsConsented={booking.sms_consent}
              />
            ) : (
              detailsLabel && (
                <p className="mt-4 font-body text-body-s text-[--text-secondary]">{detailsLabel}</p>
              )
            )}
          </Task>
        </ol>
      </section>

      {/* -- payments -------------------------------------------------------- */}
      {booking.status !== "cancelled" && (
        <section className="shell max-w-[48rem] pb-20 md:pb-28" aria-labelledby="payments-heading">
          <h2 id="payments-heading" className="t-label border-b border-[--rule-strong] pb-3.5 text-[--text]">
            Payments
          </h2>

          <Facts
            className="mt-6"
            size="l"
            columns={3}
            items={[
              { label: "Paid", value: formatAmount(paid), note: `of ${formatAmount(total)}` },
              { label: "Remaining", value: formatAmount(remaining) },
              {
                label: "Next payment",
                value: nextInstallment ? formatAmount(Number(nextInstallment.amount)) : "None",
                note: nextInstallment?.scheduled_date
                  ? formatDay(nextInstallment.scheduled_date)
                  : remaining > 0
                    ? undefined
                    : "Balance settled",
              },
            ]}
          />

          {schedule.length > 0 && (
            <ScheduleTable
              className="mt-8"
              caption="Payment schedule"
              rows={schedule.map((p) => ({
                key: p.id,
                date: p.scheduled_date ? formatDay(p.scheduled_date) : "Date to be set",
                status: PAYMENT_LABEL[p.status] ?? p.status,
                amount: formatAmount(Number(p.amount)),
              }))}
            />
          )}

          <p className="mt-6 max-w-measure font-body text-body-s leading-[1.7] text-[--text-secondary]">
            Scheduled payments are taken automatically from the card you booked with. To pay ahead
            or change anything, log in to your bookings.
          </p>
          <div className="mt-6">
            <Button href="/bookings" variant="secondary" size="md">
              Manage payments
            </Button>
          </div>
        </section>
      )}
    </main>
  );
}

/* -- pieces ----------------------------------------------------------------- */

/*
 * One task on the checklist. The marker is the state: an open square with the
 * task's number while it is to do, a filled square with a tick once it is
 * done, and the word beside the title so the state is never carried by the
 * mark alone. A done task keeps its content (it can still be edited), and
 * only its title steps back to the secondary ink.
 */
function Task({
  id,
  number,
  title,
  done,
  children,
}: {
  /** The fragment the emails link to (rooming_url, traveler_details_url). */
  id: string;
  number: number;
  title: string;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <li id={id} className="scroll-mt-8 border-b border-[--rule] py-8 last:border-0 sm:py-10">
      <div className="flex items-start gap-4 sm:gap-5">
        <span
          aria-hidden="true"
          className={cn(
            "grid h-8 w-8 shrink-0 place-items-center border",
            done
              ? "border-[--accent-solid] bg-[--accent-solid] text-[--accent-contrast]"
              : "border-[--text-secondary] text-[--text-secondary]",
          )}
        >
          {done ? (
            <svg
              viewBox="0 0 12 10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="square"
              className="h-3 w-3.5"
            >
              <path d="M1.5 5.25 4.5 8.25 10.5 1.75" />
            </svg>
          ) : (
            <span className="t-micro tabular-nums">{number}</span>
          )}
        </span>

        <div className="flex min-h-8 min-w-0 flex-1 flex-wrap items-center justify-between gap-x-6 gap-y-1">
          <h3 className="t-subheading text-[--text]">{title}</h3>
          <p className={cn("t-micro", done ? "text-[--accent]" : "text-[--text-secondary]")}>
            {done ? "Done" : "To do"}
          </p>
        </div>
      </div>
      {/* Indented under the title once there is room; full width on a phone,
          where 52px of indent would squeeze the forms. */}
      <div className="mt-4 sm:pl-[3.25rem]">{children}</div>
    </li>
  );
}

function LinkProblem({
  bookingId,
  reason,
}: {
  bookingId: string;
  reason: "invalid" | "expired" | "disabled";
}) {
  return (
    <main>
      <section className="shell flex min-h-[60vh] flex-col justify-center py-20 md:py-28">
        <div className="max-w-measure">
          <h1 className="t-title text-[--text]">
            {reason === "expired" ? "This link has expired" : "This link does not open a trip"}
          </h1>
          {reason === "disabled" ? (
            <p className="mt-6 font-body text-body leading-[1.8] text-[--text-secondary]">
              Trip pages are unavailable at the moment. You can still see your booking by logging in.
            </p>
          ) : (
            <>
              <p className="mt-6 font-body text-body leading-[1.8] text-[--text-secondary]">
                {reason === "expired"
                  ? "Trip links stop working after a while, since they open a booking without a password."
                  : "It may have been copied only in part, or it may be for a different booking."}{" "}
                We can send a fresh one to the email address the booking was made with.
              </p>
              <FreshLinkForm bookingId={bookingId} />
            </>
          )}
          <p className="mt-10 font-body text-body-s text-[--text-secondary]">
            Or{" "}
            <Link href="/bookings" className="text-[--accent] decoration-[--accent]">
              log in to your bookings
            </Link>{" "}
            instead.
          </p>
        </div>
      </section>
    </main>
  );
}
