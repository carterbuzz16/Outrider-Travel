import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPortalAccess, listToolkit, loadAnnouncement, loadPortalSnapshot } from "@/lib/ambassador-portal";
import {
  PROGRAMS,
  SPRING_BREAK_2027,
  TELLURIDE_2026,
  defaultPortalProgram,
  programClosed,
  referralPath,
  type AmbassadorProgram,
} from "@/lib/ambassador-program";
import { SPRING_BREAK_DATES_CONFIRMED } from "@/lib/signup-deadline";
import { agreedAtFor, type PortalAmbassador } from "@/lib/ambassador-rules";
import { isTestTrip } from "@/lib/booking-window";
import { getAppUrl } from "@/lib/site-url";
import type { ProgramFacts } from "./LiveDashboard";
import { Agreement, DashboardBody, NotAmbassador, programFacts, type ProgramScreen } from "./parts";

export const metadata: Metadata = { title: "Dashboard" };

// One person's numbers, read per request from their session.
export const dynamic = "force-dynamic";

/*
 * /ambassador/dashboard (29 October 2026). Who sees what is decided once, on
 * the server, from the session (lib/ambassador-portal.ts, getPortalAccess):
 *
 *   signed out          to /login, and back here after the emailed code;
 *   not an ambassador   a polite page that points at the application;
 *   then, per program:
 *     not yet agreed    the agreement, and nothing else of that program;
 *     agreed            its dashboard.
 *
 * Laid out for a phone first, since most arrive from a text: the count, then
 * the link to share, then friends, rewards, the leaderboard and the toolkit.
 *
 * Two programs at once (3 November 2026). One code sells both Telluride and
 * spring break, and a small switch at the top moves between them, each with its
 * own count, goal, countdown, link, scripts and rankings. Both are rendered here,
 * so the switch is instant on a phone and the page polls for both
 * (lib/ambassador-rules.ts, PortalSnapshot). ?program= says only which of their
 * own programs is open; it can never reach anything else.
 */

const ERRORS: Readonly<Record<string, string>> = {
  agree: "Tick the box to agree, then continue.",
  save: "That didn't save. Try again in a moment.",
  busy: "That's a lot of changes at once. Try again in a few minutes.",
  not_yet: "The free trip opens once your count reaches the goal.",
  trip: "Pick December or January.",
};
const DONE: Readonly<Record<string, string>> = {
  picked: "Got it. We'll be in touch about your free trip.",
};

export default async function AmbassadorDashboard(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  const access = await getPortalAccess();
  if (access.kind === "signed-out") redirect(`/login?next=${encodeURIComponent("/ambassador/dashboard")}`);
  if (access.kind === "not-ambassador") return <NotAmbassador email={access.email} />;

  const { ambassador } = access;
  const params = await props.searchParams;
  const error = (params.error && ERRORS[params.error]) || null;
  const done = (params.done && DONE[params.done]) || null;

  const programs = programsOnPortal(ambassador);
  const selected =
    programs.find((p) => p.id === params.program) ??
    programs.find((p) => p.id === defaultPortalProgram().id) ??
    programs[0];
  const agreed = programs.filter((p) => agreedAtFor(ambassador, p));

  // Nothing of a program is loaded until it is agreed to, and with nothing
  // agreed the page is only agreements, so it asks the database for nothing.
  const [snapshot, announcement, toolkit, departures] = await Promise.all([
    agreed.length > 0 ? loadPortalSnapshot(ambassador) : null,
    agreed.length > 0 ? loadAnnouncement() : null,
    agreed.some((p) => p.graphics) ? listToolkit(ambassador.school) : [],
    Promise.all(agreed.map(loadDepartures)),
  ]);

  if (agreed.length > 0 && !snapshot) {
    return (
      <main className="shell-narrow py-16">
        <Alert tone="warning" title="Your numbers didn't load">
          Reload in a minute. If it keeps happening, message us in the GroupMe.
        </Alert>
      </main>
    );
  }

  const screens = programs.map((program): ProgramScreen => {
    const agreedAt = agreedAtFor(ambassador, program);
    const view = snapshot?.programs[program.id];
    if (!agreedAt || !view) {
      return {
        kind: "agreement",
        program,
        agreement: <Agreement program={program} error={program.id === selected.id ? error : null} />,
      };
    }
    return {
      kind: "dashboard",
      program,
      view,
      facts: programFacts(program, departures[agreed.indexOf(program)]),
      toolkit: program.graphics ? toolkit : [],
      url: `${getAppUrl()}${referralPath(ambassador.code, program)}`,
      agreedAt,
    };
  });

  return (
    <DashboardBody
      screens={screens}
      selected={selected.id}
      announcement={announcement}
      // An agreement shows its own error beside its form.
      error={agreedAtFor(ambassador, selected) ? error : null}
      done={done}
    />
  );
}

/**
 * The programs this ambassador has on the portal: every one, except a closed
 * Telluride they never agreed to. Nobody should be asked to sign up to a program
 * that has finished, and they then see spring break alone, with no switch.
 *
 * Spring break stays off the portal until its dates are confirmed: its countdown
 * and "count by" lines print the booking closes, which are placeholders until
 * then (lib/signup-deadline.ts). Until it opens the dashboard is what ambassadors
 * have today, with no switch. Telluride is the floor, so the list is never empty.
 */
function programsOnPortal(ambassador: PortalAmbassador): AmbassadorProgram[] {
  const programs = Object.values(PROGRAMS).filter(
    (p) =>
      (p.id !== SPRING_BREAK_2027.id || SPRING_BREAK_DATES_CONFIRMED) &&
      (p.id !== TELLURIDE_2026.id || !programClosed(p) || agreedAtFor(ambassador, p)),
  );
  return programs.length > 0 ? programs : [TELLURIDE_2026];
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
