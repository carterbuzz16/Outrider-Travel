import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPortalAccess, listToolkit, loadAnnouncement, loadPortalView } from "@/lib/ambassador-portal";
import { programFor, type AmbassadorProgram } from "@/lib/ambassador-program";
import { referralPath } from "@/lib/ambassadors";
import { isTestTrip } from "@/lib/booking-window";
import { getAppUrl } from "@/lib/site-url";
import type { ProgramFacts } from "./LiveDashboard";
import { Agreement, DashboardBody, NotAmbassador, programFacts } from "./parts";

export const metadata: Metadata = { title: "Dashboard" };

// One person's numbers, read per request from their session.
export const dynamic = "force-dynamic";

/*
 * /ambassador/dashboard (29 October 2026). Who sees what is decided once, on
 * the server, from the session (lib/ambassador-portal.ts, getPortalAccess):
 *
 *   signed out          to /login, and back here after the emailed code;
 *   not an ambassador   a polite page that points at the application;
 *   not yet agreed      the agreement, and nothing else;
 *   agreed              the dashboard.
 *
 * Laid out for a phone first, since most arrive from a text: the count, then
 * the link to share, then friends, rewards, the leaderboard and the toolkit.
 */

const ERRORS: Readonly<Record<string, string>> = {
  agree: "Tick the box to agree, then continue.",
  save: "That didn't save. Try again in a moment.",
  busy: "That's a lot of changes at once. Try again in a few minutes.",
  not_yet: "The free trip opens once your count reaches the goal.",
  trip: "Pick December or January.",
};
const DONE: Readonly<Record<string, string>> = {
  hidden: "Your name is hidden on the leaderboard.",
  shown: "Your name is back on the leaderboard.",
  picked: "Got it. We'll be in touch about your free trip.",
};

export default async function AmbassadorDashboard(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  const access = await getPortalAccess();
  if (access.kind === "signed-out") redirect(`/login?next=${encodeURIComponent("/ambassador/dashboard")}`);
  if (access.kind === "not-ambassador") return <NotAmbassador email={access.email} />;

  const { ambassador } = access;
  const program = programFor(ambassador.program);
  const params = await props.searchParams;
  const error = (params.error && ERRORS[params.error]) || null;
  const done = (params.done && DONE[params.done]) || null;

  if (!ambassador.agreedAt) return <Agreement program={program} error={error} />;

  const [view, announcement, toolkit, departures] = await Promise.all([
    loadPortalView(ambassador.code),
    loadAnnouncement(),
    listToolkit(ambassador.school),
    loadDepartures(program),
  ]);

  if (!view) {
    return (
      <main className="shell-narrow py-16">
        <Alert tone="warning" title="Your numbers didn't load">
          Reload in a minute. If it keeps happening, message us in the GroupMe.
        </Alert>
      </main>
    );
  }

  return (
    <DashboardBody
      view={view}
      facts={programFacts(program, departures)}
      program={program}
      announcement={announcement}
      toolkit={toolkit}
      url={`${getAppUrl()}${referralPath(ambassador.code, program)}`}
      agreedAt={ambassador.agreedAt}
      error={error}
      done={done}
    />
  );
}

/** The program's departures that are on sale, for the free-trip pick. */
async function loadDepartures(program: AmbassadorProgram): Promise<ProgramFacts["departures"]> {
  const starts = Object.keys(program.departures);
  const { data, error } = await createAdminClient()
    .from("trips")
    .select("id, name, start_date")
    .eq("status", "published")
    .in("start_date", starts)
    .order("start_date");
  if (error) {
    console.error(`ambassador dashboard: departures: ${error.code} ${error.message}`);
    return [];
  }
  return (data ?? [])
    .filter((t) => !isTestTrip(t.name))
    .map((t) => {
      const d = program.departures[t.start_date];
      return { tripId: t.id, label: d.label, dates: d.dates, countByLabel: d.countByLabel };
    });
}
