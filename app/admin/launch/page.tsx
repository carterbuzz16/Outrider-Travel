import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderBookingOpenReminder, renderEarlyAccess } from "@/lib/email/send";
import { getAppUrl } from "@/lib/site-url";
import { PageHeader, Panel } from "../admin-ui";
import LaunchControls from "./LaunchControls";
import { bookingOpenReadiness, launchReadiness, type ReadinessCheck } from "./readiness";
import { bookingOpenRecipients } from "./booking-open";
import { earlyAccessFromPrice } from "@/lib/early-access";
import { isDeliverableEmail } from "@/lib/waitlist-signup";

export const metadata: Metadata = { title: "Launch" };

// Reads this environment's keys and the list on every request.
export const dynamic = "force-dynamic";
// The send runs inside this route's function. Batches of 100 take a second or
// two each, so a list of a few thousand still fits comfortably.
export const maxDuration = 60;

/*
 * Opening sales: the list's head start, then everyone, then one reminder to
 * anyone on the list who has not booked.
 *
 * For each email the page is the checklist, the numbers, the email as it will
 * look, and the two buttons. The reminder is first because it is the one that
 * can still go; the head start went on 25 September. The mechanics are in lib/early-access.ts; the checks, which
 * the send action repeats, in ./readiness.ts.
 */
export default async function LaunchPage() {
  await requireAdmin();

  const checks = launchReadiness();
  const ready = checks.every((check) => check.ok);

  const admin = createAdminClient();
  const [{ count: onList }, { count: sent }] = await Promise.all([
    admin.from("waitlist_signups").select("id", { count: "exact", head: true }).is("unsubscribed_at", null),
    admin
      .from("waitlist_signups")
      .select("id", { count: "exact", head: true })
      .is("unsubscribed_at", null)
      .not("early_access_sent_at", "is", null),
  ]);
  // The rows themselves, not a count: the button should say how many the
  // send will actually reach, and name any address it will skip.
  const { data: unsent } = await admin
    .from("waitlist_signups")
    .select("email")
    .is("unsubscribed_at", null)
    .is("early_access_sent_at", null)
    .or("email_consent.is.null,email_consent.eq.true");
  const pending = (unsent ?? []).filter((row) => isDeliverableEmail(row.email)).length;
  const undeliverable = (unsent ?? []).filter((row) => !isDeliverableEmail(row.email)).map((row) => row.email);

  const reminderChecks = bookingOpenReadiness();
  const recipients = await bookingOpenRecipients(admin);
  const reminderPending = recipients?.deliverable.length ?? 0;
  const reminderPreview = renderBookingOpenReminder({
    unsubscribeToken: "sample-preview-token",
    fromPrice: await earlyAccessFromPrice(),
  });

  const preview = renderEarlyAccess({
    bookingUrl: `${getAppUrl()}/early-access?t=sample`,
    unsubscribeToken: "sample-preview-token",
    fromPrice: await earlyAccessFromPrice(),
  });

  return (
    <main className="shell pb-20">
      <PageHeader
        eyebrow="Back office"
        title="Launch"
        lede="Open booking to the list first, then to everyone, then remind anyone on the list who hasn't booked. Each email goes once per person."
      />

      {/* ---- the reminder -------------------------------------------------- */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="flex flex-col gap-6">
          <Panel
            title="Booking is open: the reminder"
            description={
              recipients
                ? `${reminderPending} on the list haven't booked and haven't had it yet.${
                    recipients.alreadyBooked > 0 ? ` ${recipients.alreadyBooked} on the list already booked, so they're left out.` : ""
                  }`
                : "Couldn't read the list or the bookings, so the send is off until the next reload."
            }
          >
            <Checklist checks={reminderChecks} />
            <div className="mt-6 border-t border-[--rule] pt-6">
              <LaunchControls
                email="booking-open"
                pending={reminderPending}
                ready={recipients !== null && reminderChecks.every((check) => check.ok)}
              />
            </div>
            {recipients && recipients.undeliverable.length > 0 && (
              <p className="mt-6 border-t border-[--rule] pt-5 font-body text-body-s leading-[1.6] text-[--text-secondary]">
                Skipped, because mail can&rsquo;t reach{" "}
                {recipients.undeliverable.length === 1 ? "this address" : "these addresses"}:{" "}
                <span className="text-[--text]">{recipients.undeliverable.join(", ")}</span>.
              </p>
            )}
          </Panel>
        </div>

        <Panel title="The reminder email" description={`Subject: ${reminderPreview.subject}`} bleed>
          <iframe
            title="Preview: the booking is open reminder"
            srcDoc={reminderPreview.html}
            sandbox=""
            className="block h-[80vh] min-h-[560px] w-full bg-white"
          />
        </Panel>
      </div>

      {/* ---- the head start ------------------------------------------------ */}
      <div className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="flex flex-col gap-6">
          <Panel title="The head start: before you send">
            <Checklist checks={checks} />
          </Panel>

          <Panel
            title="The list"
            description={`${onList ?? 0} on the list. ${sent ?? 0} already have the head start, ${pending} still to send.`}
          >
            <LaunchControls pending={pending} ready={ready} />
            {undeliverable.length > 0 && (
              <p className="mt-6 border-t border-[--rule] pt-5 font-body text-body-s leading-[1.6] text-[--text-secondary]">
                Skipped, because mail can&rsquo;t reach {undeliverable.length === 1 ? "this address" : "these addresses"}:{" "}
                <span className="text-[--text]">{undeliverable.join(", ")}</span>. Fix it in the database, or send the
                link another way.
              </p>
            )}
          </Panel>

          <Panel title="When the head start is over">
            <ol className="m-0 flex list-decimal flex-col gap-2 pl-5 font-body text-body-s text-[--text-secondary]">
              <li>
                Set <code>LAUNCHED</code> to <code>true</code> in <code>lib/booking-window.ts</code>.
              </li>
              <li>Deploy. The site opens to everyone: prices, packages, the trip pages and Reserve.</li>
              <li>List members who haven&rsquo;t booked can keep using their link; it just stops mattering.</li>
            </ol>
          </Panel>
        </div>

        <Panel title="The email" description={`Subject: ${preview.subject}`} bleed>
          {/* sandbox="" : no scripts, no forms, no popups, a unique origin. */}
          <iframe
            title="Preview: the head-start email"
            srcDoc={preview.html}
            sandbox=""
            className="block h-[80vh] min-h-[560px] w-full bg-white"
          />
        </Panel>
      </div>
    </main>
  );
}

/** A readiness list: a filled square when done, an empty one and the fix when not. */
function Checklist({ checks }: { checks: ReadinessCheck[] }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-4 p-0">
      {checks.map((check) => (
        <li key={check.id} className="flex gap-3">
          <span
            aria-hidden="true"
            className={`mt-1.5 h-2 w-2 shrink-0 ${check.ok ? "bg-[--accent]" : "border border-[--text-secondary]"}`}
          />
          <div>
            <p className="font-body text-body text-[--text]">
              {check.label}
              <span className="sr-only">{check.ok ? ": done" : ": not yet"}</span>
            </p>
            {!check.ok && <p className="mt-1 font-body text-body-s text-[--text-secondary]">{check.fix}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}
