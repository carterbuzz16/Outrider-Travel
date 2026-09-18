import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, Badge, Button, type BadgeTone } from "@/components/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { PORTAL_ANCHORS, verifyPortalToken } from "@/lib/portal-token";
import { formatDay } from "@/app/(protected)/dates";
import { formatDateRange, formatPrice } from "@/lib/trips";
import { CONTACT } from "@/lib/site-content";
import { ABILITY_LEVELS, SKI_OR_BOARD, labelFor } from "./fields";
import { DetailsTask, FlightsToggle, FreshLinkForm, RoomingTask } from "./PortalForms";
import type { Database } from "@/types/supabase";

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
      `id, status, total_amount, deposit_amount, flights_booked,
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
      <section className="shell max-w-[56rem] pb-10 pt-14 md:pt-20">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            <p className="stamp-type text-[--text-muted]">{trip?.destination ?? "Your trip"}</p>
            <h1 className="t-title mt-5 text-[--text]">{trip?.name ?? "Your trip"}</h1>
            <p className="mt-4 font-body text-body text-[--text-secondary]">
              {trip ? formatDateRange(trip.start_date, trip.end_date) : "Dates to be confirmed"}
              {booking.tiers?.name ? ` · ${booking.tiers.name}` : ""}
            </p>
          </div>
          <Badge tone={STATUS[booking.status].tone}>{STATUS[booking.status].label}</Badge>
        </div>

        <p className="mt-8 max-w-measure font-body text-body leading-[1.7] text-[--text-secondary]">
          {open
            ? `Three things to sort before you go. ${tasksDone} of 3 done. This page opens without a password, so keep the link to yourself.`
            : "This page opens without a password, so keep the link to yourself."}
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
      </section>

      {/* -- tasks ----------------------------------------------------------- */}
      <section className="shell max-w-[56rem] pb-14" aria-labelledby="tasks-heading">
        <h2 id="tasks-heading" className="t-rule-label text-[--text-muted]">
          Before you go
        </h2>

        <ol className="mt-2 flex list-none flex-col p-0">
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
              Name up to three people you want to share with, or tell us you are happy anywhere.
              Requests are assigned in the order they arrive.
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
              Your legal name and date of birth for the trip insurance, a number to reach you and
              someone at home, and your sizes so rentals are ready when you arrive.
            </p>

            {details && (
              <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3">
                <Fact label="Riding" value={labelFor(SKI_OR_BOARD, details.ski_or_board)} />
                <Fact label="Ability" value={labelFor(ABILITY_LEVELS, details.ability_level)} />
                <Fact label="Height" value={details.height ?? "Not given"} />
                <Fact label="Weight" value={details.weight ?? "Not given"} />
                <Fact label="Shoe size" value={details.shoe_size ?? "Not given"} />
                <Fact label="Dietary" value={details.dietary_restrictions ?? "None"} />
              </dl>
            )}

            {open ? (
              <DetailsTask
                bookingId={booking.id}
                token={token}
                submitted={detailsLabel ? { label: detailsLabel } : null}
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
        <section className="shell max-w-[56rem] pb-20 md:pb-28" aria-labelledby="payments-heading">
          <h2 id="payments-heading" className="t-rule-label text-[--text-muted]">
            Payments
          </h2>

          <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 lg:grid-cols-3">
            <Fact label="Paid" value={formatPrice(paid)} note={`of ${formatPrice(total)}`} />
            <Fact label="Remaining" value={formatPrice(remaining)} />
            <Fact
              label="Next payment"
              value={nextInstallment ? formatPrice(Number(nextInstallment.amount)) : "None"}
              note={
                nextInstallment?.scheduled_date
                  ? formatDay(nextInstallment.scheduled_date)
                  : remaining > 0
                    ? undefined
                    : "balance settled"
              }
            />
          </dl>

          {schedule.length > 0 && (
            <ul className="mt-8 flex list-none flex-col border-t border-[--rule-faint] p-0">
              {schedule.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-[--rule-faint] py-3.5"
                >
                  <span className="font-body text-body-s text-[--text-secondary]">
                    {p.scheduled_date ? formatDay(p.scheduled_date) : "Date to be set"}
                  </span>
                  <span className="flex items-baseline gap-4">
                    <span className="t-micro text-[--text-muted]">{PAYMENT_LABEL[p.status] ?? p.status}</span>
                    <span className="font-display font-medium text-body-s tracking-title text-[--text]">
                      {formatPrice(Number(p.amount))}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-6 max-w-measure font-body text-body-s leading-[1.7] text-[--text-muted]">
            Scheduled payments are taken automatically from the card you booked with. To pay ahead
            or change anything, log in to your bookings.
          </p>
          <div className="mt-6">
            <Button href="/bookings" variant="secondary" size="sm">
              Manage payments
            </Button>
          </div>
        </section>
      )}
    </main>
  );
}

/* -- pieces ----------------------------------------------------------------- */

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
    <li id={id} className="scroll-mt-8 border-b border-[--rule] py-8 last:border-0">
      <div className="flex items-baseline justify-between gap-6">
        <h3 className="t-heading text-[--text]">
          <span className="t-micro mr-3 align-middle text-[--text-muted]">{String(number).padStart(2, "0")}</span>
          {title}
        </h3>
        {/* A filled square for done, an open one for to do: the same marker
            vocabulary as Alert, and the word beside it so colour is never the
            only signal. */}
        <p className="flex shrink-0 items-center gap-2.5 t-micro text-[--text-secondary]">
          <span
            aria-hidden="true"
            className={
              done ? "h-2 w-2 bg-[--accent]" : "h-2 w-2 border border-[--rule-strong] bg-transparent"
            }
          />
          {done ? "Done" : "To do"}
        </p>
      </div>
      <div className="mt-4">{children}</div>
    </li>
  );
}

function Fact({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="min-w-0">
      <dt className="stamp-type text-[--text-muted]">{label}</dt>
      <dd className="mt-3 break-words font-display font-medium text-body tracking-title text-[--text]">
        {value}
        {note && <span className="t-micro mt-2 block text-[--text-secondary]">{note}</span>}
      </dd>
    </div>
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
