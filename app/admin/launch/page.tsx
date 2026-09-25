import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderEarlyAccess } from "@/lib/email/send";
import { getAppUrl } from "@/lib/site-url";
import { PageHeader, Panel } from "../admin-ui";
import LaunchControls from "./LaunchControls";
import { launchReadiness } from "./readiness";
import { earlyAccessFromPrice } from "@/lib/early-access";

export const metadata: Metadata = { title: "Launch" };

// Reads this environment's keys and the list on every request.
export const dynamic = "force-dynamic";
// The send runs inside this route's function. Batches of 100 take a second or
// two each, so a list of a few thousand still fits comfortably.
export const maxDuration = 60;

/*
 * Opening sales: the list's head start, then everyone.
 *
 * The page is the checklist, the numbers, the email as it will look, and the
 * two buttons. The mechanics are in lib/early-access.ts; the checks, which
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
  const { count: pending } = await admin
    .from("waitlist_signups")
    .select("id", { count: "exact", head: true })
    .is("unsubscribed_at", null)
    .is("early_access_sent_at", null)
    .or("email_consent.is.null,email_consent.eq.true");

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
        lede="Open booking to the list first, then to everyone. The list gets an email with a private link that lets them book while the site still says coming soon."
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="flex flex-col gap-6">
          <Panel title="Before you send">
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
                    {!check.ok && (
                      <p className="mt-1 font-body text-body-s text-[--text-secondary]">{check.fix}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel
            title="The list"
            description={`${onList ?? 0} on the list. ${sent ?? 0} already have the head start, ${pending ?? 0} still to send.`}
          >
            <LaunchControls pending={pending ?? 0} ready={ready} />
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
