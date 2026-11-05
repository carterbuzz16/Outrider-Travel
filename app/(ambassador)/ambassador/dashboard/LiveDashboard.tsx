"use client";

import { useEffect, useRef, useState } from "react";
import { Button, cn } from "@/components/ui";
import type { PortalSnapshot, PortalView } from "@/lib/ambassador-rules";
import { AMBASSADOR_PORTAL as COPY } from "@/lib/site-content";
import CopyValue from "./CopyValue";
import Countdown from "./Countdown";
import LeaderboardSwitch from "./LeaderboardSwitch";

/*
 * The dashboard as four tabs, the way an app on a phone works (Carter, 29
 * October 2026: "super easily navigated and sleek"): Home (the count, the
 * link, the perks), Friends, Rankings and Toolkit. On a phone the tabs sit
 * in a bar along the bottom, under the thumb; from md up they sit along the
 * top. The open tab is in the address (#friends), so a link or a refresh
 * lands on it, and the arrow keys move between tabs.
 *
 * The numbers move with every booking and payment: the server renders them
 * first (page.tsx), then this asks /api/ambassador/dashboard for fresh ones
 * every 60 seconds while the tab is visible, and again whenever the tab comes
 * back into view, so a payment shows within about a minute without a
 * refresh. Realtime is not used: the tables are service-role only, by design,
 * so there is no row-level subscription to give a browser. A 401 or 403 means
 * the session or the access changed under the page; it reloads, and the
 * server decides what to show.
 *
 * Above the tabs, a switch between programs (3 November 2026): one code sells
 * Telluride and spring break, so each is a whole dashboard of its own, in the
 * same place. The tab stays put when the program changes. The open program is
 * in the address (?program=), so a refresh or a redirect lands on it. A program
 * they haven't agreed to is its agreement, with no tabs, and never stands in
 * the way of the other.
 */

const POLL_MS = 60_000;

export type ProgramFacts = {
  goal: number;
  deadlineIso: string;
  deadlineLabel: string;
  /** The week the countdown is for: "December", then "January". */
  closingName: string;
  /** "December closes November 14 at 11:59 PM Central." */
  deadlineSpoken: string;
  /** Every week has closed: nothing is left to share, and the count is what it is. */
  closed: boolean;
  /** Whether the playbook PDF is about this program. */
  playbook: boolean;
  /** Whether the toolkit has graphics for this program. */
  graphics: boolean;
  /** The departures, for the free-trip pick: trip id, "December", "December 14 to 18", and its count deadline. */
  departures: { tripId: string; label: string; dates: string; countByLabel: string }[];
  freeTrip: { picksWeek: boolean; earned: string; locked: string; picked: string };
};

/** One program behind the switch: its dashboard, or its agreement until they have accepted it. */
export type ProgramPanel = { id: string; name: string } & (
  | { kind: "agreement"; agreement: React.ReactNode }
  | {
      kind: "dashboard";
      initial: PortalView;
      facts: ProgramFacts;
      /** Their referral link on this program, for the Share button at the top of Home. */
      shareUrl: string;
      /** Server-rendered: the link, code and QR, on Home under the count. */
      share: React.ReactNode;
      /** Server-rendered: the perk cards, on Home under the link. */
      perks: React.ReactNode;
      /** Server-rendered: graphics, scripts, questions and the agreement. */
      toolkit: React.ReactNode;
    }
);

const TABS = [
  { id: "home", label: "Home" },
  { id: "friends", label: "Friends" },
  { id: "rankings", label: "Rankings" },
  { id: "toolkit", label: "Toolkit" },
] as const;
type TabId = (typeof TABS)[number]["id"];

function tabFromHash(hash: string): TabId | null {
  const id = hash.replace(/^#/, "");
  return TABS.find((t) => t.id === id)?.id ?? null;
}

function viewsFrom(panels: ProgramPanel[]): Record<string, PortalView> {
  return Object.fromEntries(panels.flatMap((p) => (p.kind === "dashboard" ? [[p.id, p.initial] as const] : [])));
}

export default function LiveDashboard({
  panels,
  initialProgram,
  claimFreeTrip,
  announcement,
  notice,
}: {
  panels: ProgramPanel[];
  /** The id of the program to open on. */
  initialProgram: string;
  claimFreeTrip: (formData: FormData) => Promise<void>;
  /** Server-rendered: the team's latest note, at the top of Home. */
  announcement?: React.ReactNode;
  /** Server-rendered: the result of the last action, above whichever tab is open. */
  notice?: React.ReactNode;
}) {
  const [programId, setProgramId] = useState(initialProgram);
  const [views, setViews] = useState(() => viewsFrom(panels));
  const [tab, setTab] = useState<TabId>("home");
  const reloading = useRef(false);
  const tabRefs = useRef<Partial<Record<TabId, HTMLButtonElement | null>>>({});

  const panel = panels.find((p) => p.id === programId) ?? panels[0];
  // With nothing agreed the endpoint would answer 403, and 403 reloads the page.
  const polls = panels.some((p) => p.kind === "dashboard");

  // A server action redirects back here with fresh props; take them.
  useEffect(() => setViews(viewsFrom(panels)), [panels]);
  useEffect(() => setProgramId(initialProgram), [initialProgram]);

  useEffect(() => {
    const sync = () => setTab(tabFromHash(window.location.hash) ?? "home");
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  useEffect(() => {
    if (!polls) return;
    let stopped = false;
    async function refresh() {
      if (document.visibilityState !== "visible" || reloading.current) return;
      try {
        const res = await fetch("/api/ambassador/dashboard", { cache: "no-store", credentials: "same-origin" });
        if (res.status === 401 || res.status === 403) {
          reloading.current = true;
          window.location.reload();
          return;
        }
        if (!res.ok) return;
        const next = (await res.json()) as PortalSnapshot;
        if (!stopped && next.programs) setViews(next.programs);
      } catch {
        // Offline for a moment: the next tick tries again.
      }
    }
    const id = window.setInterval(refresh, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      window.clearInterval(id);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [polls]);

  function select(next: TabId, focus = false) {
    setTab(next);
    const { pathname, search } = window.location;
    window.history.replaceState(null, "", `${pathname}${search}${next === "home" ? "" : `#${next}`}`);
    window.scrollTo({ top: 0, behavior: "instant" });
    if (focus) tabRefs.current[next]?.focus();
  }

  function selectProgram(next: string) {
    setProgramId(next);
    const url = new URL(window.location.href);
    url.searchParams.set("program", next);
    // A result from the last action belongs to the program it was done on.
    url.searchParams.delete("error");
    url.searchParams.delete("done");
    window.history.replaceState(null, "", url);
  }

  function onTabKey(event: React.KeyboardEvent, index: number) {
    const to =
      event.key === "ArrowRight"
        ? (index + 1) % TABS.length
        : event.key === "ArrowLeft"
          ? (index - 1 + TABS.length) % TABS.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? TABS.length - 1
              : null;
    if (to === null) return;
    event.preventDefault();
    select(TABS[to].id, true);
  }

  const programSwitch = panels.length > 1 && <ProgramSwitch panels={panels} value={panel.id} onChange={selectProgram} />;

  if (panel.kind === "agreement") {
    return (
      <div className="[-webkit-tap-highlight-color:transparent]">
        {programSwitch}
        {panel.agreement}
      </div>
    );
  }

  const view = views[panel.id] ?? panel.initial;
  return (
    // Room at the foot on a phone, so the bar (and the home indicator under
    // it) never covers the last thing on the page. No grey flash on tap: every
    // control here draws its own pressed state.
    <div className="pb-[calc(5rem+env(safe-area-inset-bottom))] [-webkit-tap-highlight-color:transparent] md:pb-0">
      {programSwitch}
      <nav
        aria-label="Dashboard"
        // Deep espresso with a soft shadow, so the bar stays its own surface over
        // the espresso count on Home as well as over paper.
        className="scheme-espresso fixed inset-x-0 bottom-0 z-40 bg-[--surface-inset] pb-[env(safe-area-inset-bottom)] text-[--text] shadow-[0_-6px_24px_rgb(0_0_0/0.22)] md:sticky md:top-0 md:bottom-auto md:pb-0 md:shadow-none"
      >
        <div role="tablist" aria-label="Dashboard" className="shell-narrow grid grid-cols-4">
          {TABS.map((t, i) => {
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                ref={(el) => {
                  tabRefs.current[t.id] = el;
                }}
                type="button"
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={on}
                aria-controls={`panel-${t.id}`}
                tabIndex={on ? 0 : -1}
                onClick={() => select(t.id)}
                onKeyDown={(e) => onTabKey(e, i)}
                className={cn(
                  "t-micro flex min-h-16 flex-col items-center justify-center gap-2 transition-[color,transform] duration-fast active:scale-[0.96]",
                  on ? "text-[--text]" : "text-[--text-muted] hover:text-[--text]",
                )}
              >
                <span aria-hidden="true" className={cn("h-1.5 w-1.5", on ? "bg-[--accent-solid]" : "bg-transparent")} />
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>

      {panel.id === initialProgram && notice}

      <Panel id="home" open={tab === "home"}>
        {announcement}
        <Progress view={view} facts={panel.facts} claimFreeTrip={claimFreeTrip} go={select} shareUrl={panel.shareUrl} />
        <div className="shell-narrow flex flex-col gap-10 py-10 md:py-14">
          {panel.share}
          {panel.perks}
        </div>
      </Panel>

      <Panel id="friends" open={tab === "friends"}>
        <Friends view={view} />
      </Panel>

      <Panel id="rankings" open={tab === "rankings"}>
        <Rankings view={view} />
      </Panel>

      <Panel id="toolkit" open={tab === "toolkit"}>
        {panel.toolkit}
      </Panel>
    </div>
  );
}

/** Which program the page is showing: a plain two-way choice, under the thumb's reach at the top of the page. */
function ProgramSwitch({
  panels,
  value,
  onChange,
}: {
  panels: ProgramPanel[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="shell-narrow pb-3 md:pb-4">
      <div
        role="group"
        aria-label="Trip"
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${panels.length}, minmax(0, 1fr))` }}
      >
        {panels.map((p) => {
          const on = p.id === value;
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(p.id)}
              className={cn(
                "t-label min-h-11 px-2 transition-[background-color,transform] duration-fast active:scale-[0.98]",
                on ? "scheme-emphasis scheme-paint" : "bg-[--surface-raised] text-[--text-secondary] hover:text-[--text]",
              )}
            >
              {p.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Panel({ id, open, children }: { id: TabId; open: boolean; children: React.ReactNode }) {
  return (
    <div role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`} hidden={!open}>
      {children}
    </div>
  );
}

/* -- Home: the count ------------------------------------------------------------ */

function Progress({
  view,
  facts,
  claimFreeTrip,
  go,
  shareUrl,
}: {
  view: PortalView;
  facts: ProgramFacts;
  claimFreeTrip: (formData: FormData) => Promise<void>;
  go: (tab: TabId) => void;
  shareUrl: string;
}) {
  const reached = view.rewards.goal;
  const picked = view.rewards.picked;
  const segments = Array.from({ length: view.goal }, (_, i) => i < view.paid);
  const postToday = view.friends.length === 0 && !facts.closed;
  const line = picked
    ? facts.freeTrip.picked.replace("{departure}", picked)
    : reached
      ? facts.freeTrip.earned
      : facts.closed
        ? null
        : `${view.toGo} more and your trip is free.`;
  return (
    <section aria-labelledby="progress-title" className="scheme-espresso scheme-paint">
      <div className="shell-narrow pb-10 pt-8 md:pb-14 md:pt-12">
        {(facts.playbook || postToday) && (
          <div className="mb-8 flex flex-col gap-1.5">
            {/* The playbook, always first so it never moves. The browser opens
                or saves the PDF itself (Link steps aside for target and
                download). */}
            {facts.playbook && (
              <section aria-label={COPY.playbookTitle} className="bg-[rgb(var(--rgb-paper)/0.08)] px-4 py-5">
                <p className="t-rule-label text-[--accent]">{COPY.playbookTitle}</p>
                <p className="mt-2 font-body text-body text-[--text]">{COPY.playbookLine}</p>
                <div className="mt-4 grid grid-cols-2 gap-1.5">
                  <Button href={COPY.playbookPath} variant="secondary" size="sm" block target="_blank" rel="noopener">
                    {COPY.playbookView}
                  </Button>
                  <Button href={COPY.playbookPath} variant="secondary" size="sm" block download={COPY.playbookFileName}>
                    {COPY.playbookDownload}
                  </Button>
                </div>
              </section>
            )}

            {/* Until the first friend books, the one thing to do today. It goes
                the moment a booking shows up in the count. */}
            {postToday && (
              <div className="bg-[rgb(var(--rgb-paper)/0.08)] px-4 py-5">
                <p className="t-rule-label text-[--accent]">{COPY.postTodayTitle}</p>
                <p className="mt-2 font-body text-body text-[--text]">{COPY.postTodayLine(view.code, facts.graphics)}</p>
                <div className={cn("mt-4 grid gap-1.5", facts.graphics && "grid-cols-2")}>
                  {facts.graphics && (
                    <Button type="button" variant="secondary" size="sm" block onClick={() => go("toolkit")}>
                      {COPY.postTodayGraphic}
                    </Button>
                  )}
                  <Button href={COPY.instagramUrl} variant="secondary" size="sm" block target="_blank" rel="noopener noreferrer">
                    {COPY.postTodayInstagram}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
        <p className="t-rule-label text-[--text-secondary]">Hi, {view.firstName}</p>
        <h1 id="progress-title" className="sr-only">
          Your progress toward a free trip
        </h1>
        <p
          className="mt-4 flex items-baseline gap-3"
          aria-live="polite"
          aria-label={`${view.paid} of ${view.goal} friends paid in full`}
        >
          <span className="t-display text-[length:clamp(5rem,3.5rem+9vw,8.5rem)] leading-[0.8]">{view.paid}</span>
          <span className="t-display text-display-s">of {view.goal} paid</span>
        </p>

        <div
          aria-hidden="true"
          className="mt-6 grid gap-1.5"
          style={{ gridTemplateColumns: `repeat(${view.goal}, minmax(0, 1fr))` }}
        >
          {segments.map((on, i) => (
            <span
              key={i}
              className={cn(
                "h-2.5 transition-colors duration-[--dur]",
                on ? "bg-[--accent-solid]" : "bg-[rgb(var(--rgb-paper)/0.14)]",
              )}
            />
          ))}
        </div>

        {line && <p className="t-subheading mt-6">{line}</p>}

        {!reached && view.credit > 0 && (
          <p className="mt-2 font-body text-body text-[--accent]">
            ${view.credit.toLocaleString("en-US")} off your trip so far.
          </p>
        )}

        {!reached && !facts.closed && (
          <CopyValue
            value={shareUrl}
            label="Copy your link"
            copiedLabel="Link copied"
            shareFirst
            shareLabel="Share your link"
            asUrl
            primary
            block
            className="mt-5"
          />
        )}

        {reached && !picked && facts.freeTrip.picksWeek && facts.departures.length > 0 && (
          <form action={claimFreeTrip} className="mt-5 grid gap-2 sm:grid-cols-2">
            {facts.departures.map((d) => (
              <Button key={d.tripId} type="submit" name="trip_id" value={d.tripId} variant="primary" size="md" block>
                {d.dates}
              </Button>
            ))}
          </form>
        )}

        {!reached && (
          <div className="mt-6">
            <p className="t-micro mb-2 text-[--text-muted]">{facts.closingName} closes in</p>
            <Countdown to={facts.deadlineIso} spoken={facts.deadlineSpoken} closed="Bookings are closed." />
          </div>
        )}

        {/* Tight under the countdown, so the six tiles read as one block. */}
        <div className={cn("grid grid-cols-2 gap-1.5", reached ? "mt-8" : "mt-1.5")}>
          <Shortcut onClick={() => go("friends")} value={String(view.onTheWay)} label="On the way" />
          <Shortcut
            onClick={() => go("rankings")}
            value={`#${view.leaderboard.you.rank} of ${view.leaderboard.you.of}`}
            label="Rankings"
          />
        </div>

        {view.hold && (
          <p className="mt-6 font-body text-body-s text-[--text-secondary]">
            Your spot: {HOLD_WORDS[view.hold] ?? "held"}.
          </p>
        )}
        {facts.departures.some((d) => d.countByLabel !== facts.deadlineLabel) && (
          <p className="mt-2 font-body text-body-s text-[--text-muted]">
            {facts.departures.map((d) => `${d.label} friends count once paid in full by ${d.countByLabel}.`).join(" ")}
          </p>
        )}
      </div>
    </section>
  );
}

const HOLD_WORDS: Record<string, string> = {
  held: "held for you, no deposit",
  free: "free",
  paying: "we sent you a link to pay for it",
  released: "released",
};

/** A number on Home that opens the tab it summarizes. */
function Shortcut({ value, label, onClick }: { value: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-16 items-center justify-between gap-3 bg-[rgb(var(--rgb-paper)/0.08)] px-4 py-3 text-left transition-[background-color,transform] duration-fast hover:bg-[rgb(var(--rgb-paper)/0.14)] active:scale-[0.98]"
    >
      <span>
        <span className="t-subheading block tabular-nums">{value}</span>
        <span className="t-micro mt-1 block text-[--text-secondary]">{label}</span>
      </span>
      <span aria-hidden="true" className="text-[--accent] transition-transform duration-fast group-hover:translate-x-0.5">
        &rarr;
      </span>
    </button>
  );
}

/* -- Friends ----------------------------------------------------------------------- */

function TabHeader({ title, line }: { title: string; line: string }) {
  return (
    <>
      <h2 className="t-title text-[--text]">{title}</h2>
      <p className="mt-3 font-body text-body text-[--text-secondary]">{line}</p>
    </>
  );
}

function Friends({ view }: { view: PortalView }) {
  return (
    <div className="shell-narrow py-10 md:py-14">
      <TabHeader
        title={COPY.friendsTitle}
        line={`${view.paid} paid in full, ${view.onTheWay} on the way. A friend counts once their trip is paid in full.`}
      />
      {view.friends.length === 0 ? (
        <p className="t-body mt-8 text-[--text-secondary]">{COPY.friendsEmpty}</p>
      ) : (
        <ul className="mt-8 flex flex-col gap-1.5">
          {view.friends.map((f, i) => (
            <li key={i} className="flex items-center justify-between gap-4 bg-[--surface-raised] px-4 py-4">
              <span className="min-w-0">
                <span className="block truncate font-body text-body text-[--text]">{f.name}</span>
                <span className="block font-body text-body-s text-[--text-secondary]">{f.trip}</span>
              </span>
              <span
                className={cn("t-micro shrink-0 text-right", f.counts ? "text-[--accent]" : "text-[--text-secondary]")}
              >
                {f.note ?? f.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* -- Rankings -------------------------------------------------------------------------- */

function Rankings({ view }: { view: PortalView }) {
  const { top, you, hidden } = view.leaderboard;
  const youInTop = top.some((r) => r.isYou);
  return (
    <div className="shell-narrow py-10 md:py-14">
      <TabHeader title={COPY.leaderboardTitle} line="Friends paid in full, then friends on a deposit." />
      <p className="mt-6 flex items-baseline gap-3">
        <span className="t-display text-display-l">#{you.rank}</span>
        <span className="font-body text-body text-[--text-secondary]">of {you.of} ambassadors</span>
      </p>

      {top.length === 0 ? (
        <p className="t-body mt-8 text-[--text-secondary]">{COPY.leaderboardEmpty}</p>
      ) : (
        <ol className="mt-8 flex flex-col gap-1.5">
          {top.map((r, i) => (
            <LeaderRow key={i} {...r} />
          ))}
          {!youInTop && (
            <LeaderRow rank={you.rank} name="You" school={null} paid={view.paid} onTheWay={view.onTheWay} isYou />
          )}
        </ol>
      )}

      <div className="mt-8">
        <LeaderboardSwitch hidden={hidden} />
      </div>
    </div>
  );
}

function LeaderRow({
  rank,
  name,
  school,
  paid,
  onTheWay,
  isYou,
}: {
  rank: number;
  name: string;
  school: string | null;
  paid: number;
  onTheWay: number;
  isYou: boolean;
}) {
  return (
    <li
      className={cn(
        "grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 px-4 py-3.5",
        isYou ? "scheme-emphasis scheme-paint" : "bg-[--surface-raised]",
      )}
      aria-current={isYou ? "true" : undefined}
    >
      <span className="t-label tabular-nums text-[--text-secondary]">#{rank}</span>
      <span className="min-w-0">
        <span className="block truncate font-body text-body text-[--text]">
          {name}
          {isYou && name !== "You" && <span className="sr-only"> (you)</span>}
        </span>
        {school && <span className="block truncate font-body text-body-s text-[--text-secondary]">{school}</span>}
      </span>
      <span className="text-right font-body text-body-s tabular-nums text-[--text-secondary]">
        <span className="font-medium text-[--text]">{paid}</span> paid
        {onTheWay > 0 && <span className="block">{onTheWay} on the way</span>}
      </span>
    </li>
  );
}
