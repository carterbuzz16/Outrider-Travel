"use client";

import { useEffect, useRef, useState } from "react";
import { Button, cn } from "@/components/ui";
import type { PortalView } from "@/lib/ambassador-rules";
import { AMBASSADOR_PORTAL as COPY } from "@/lib/site-content";
import Countdown from "./Countdown";

/*
 * The parts of the dashboard that move with every booking and payment: the
 * meter, the friends, the rewards and the leaderboard. The server renders
 * them first (page.tsx); this then asks /api/ambassador/dashboard for fresh
 * numbers every 60 seconds while the tab is visible, and again whenever the
 * tab comes back into view, so a payment shows within about a minute without
 * a refresh. Realtime is not used: the tables are service-role only, by
 * design, so there is no row-level subscription to give a browser.
 *
 * A 401 or 403 means the session or the access changed under the page; it
 * reloads, and the server decides what to show.
 */

const POLL_MS = 60_000;

export type ProgramFacts = {
  goal: number;
  deadlineIso: string;
  deadlineLabel: string;
  /** "Bookings close November 14 at 11:59 PM Central." */
  deadlineSpoken: string;
  /** The departures, for the free-trip pick: trip id, "December", "December 14 to 18", and its count deadline. */
  departures: { tripId: string; label: string; dates: string; countByLabel: string }[];
  rewards: {
    first: { title: string; earned: string; locked: string };
    goal: { title: string; earned: string; locked: string; picked: string };
    next: { title: string; line: string };
  };
};

export default function LiveDashboard({
  initial,
  facts,
  claimFreeTrip,
  setLeaderboardHidden,
  children,
  after,
}: {
  initial: PortalView;
  facts: ProgramFacts;
  claimFreeTrip: (formData: FormData) => Promise<void>;
  setLeaderboardHidden: (formData: FormData) => Promise<void>;
  /** Server-rendered, right under the meter: the link, code and QR. */
  children?: React.ReactNode;
  /** Server-rendered, after the leaderboard: the toolkit. */
  after?: React.ReactNode;
}) {
  const [view, setView] = useState(initial);
  const reloading = useRef(false);

  // A server action redirects back here with fresh props; take them.
  useEffect(() => setView(initial), [initial]);

  useEffect(() => {
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
        const next = (await res.json()) as PortalView;
        if (!stopped) setView(next);
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
  }, []);

  return (
    <>
      <Meter view={view} facts={facts} />
      <div className="shell-narrow flex flex-col gap-16 py-14 md:gap-20 md:py-20">
        {children}
        <Friends view={view} />
        <Rewards view={view} facts={facts} claimFreeTrip={claimFreeTrip} />
        <Leaderboard view={view} setLeaderboardHidden={setLeaderboardHidden} />
        {after}
      </div>
    </>
  );
}

/* -- progress toward the free trip -------------------------------------------- */

function Meter({ view, facts }: { view: PortalView; facts: ProgramFacts }) {
  const reached = view.paid >= view.goal;
  const segments = Array.from({ length: view.goal }, (_, i) => i < view.paid);
  return (
    <section aria-labelledby="progress-title" className="scheme-espresso scheme-paint">
      <div className="shell-narrow py-12 md:py-16">
        <p className="t-rule-label text-[--text-secondary]">Hi, {view.firstName}</p>
        <h1 id="progress-title" className="sr-only">
          Your progress
        </h1>
        <p
          className="t-display mt-5 leading-[0.86]"
          aria-live="polite"
          aria-label={`${view.paid} of ${view.goal} friends paid in full`}
        >
          <span className="block text-[length:clamp(5.5rem,4rem+10vw,10rem)]">{view.paid}</span>
          <span className="mt-2 block text-display-m">of {view.goal}</span>
        </p>

        <div aria-hidden="true" className="mt-8 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${view.goal}, minmax(0, 1fr))` }}>
          {segments.map((on, i) => (
            <span
              key={i}
              className={cn(
                "h-3 transition-colors duration-[--dur]",
                on ? "bg-[--accent-solid]" : "bg-[rgb(var(--rgb-paper)/0.14)]",
              )}
            />
          ))}
        </div>

        <p className="t-subheading mt-7">
          {reached ? "Your trip is free." : `${view.toGo} more by ${facts.deadlineLabel}.`}
        </p>
        {!reached && (
          <p className="mt-2 font-body text-body-s text-[--text-secondary]">
            Bookings close in <Countdown to={facts.deadlineIso} spoken={facts.deadlineSpoken} closed="Bookings are closed." />
          </p>
        )}
        <p className="mt-6 font-body text-body text-[--text-secondary]">
          {view.onTheWay === 0
            ? "No deposits on the way yet."
            : `On the way: ${view.onTheWay} ${view.onTheWay === 1 ? "friend" : "friends"} on a deposit. They count once paid in full.`}
        </p>
        {facts.departures.some((d) => d.countByLabel !== facts.deadlineLabel) && (
          <p className="mt-2 font-body text-body-s text-[--text-muted]">
            {facts.departures.map((d) => `${d.label} friends count if paid in full by ${d.countByLabel}.`).join(" ")}
          </p>
        )}
      </div>
    </section>
  );
}

/* -- their friends --------------------------------------------------------------- */

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="t-heading text-[--text]">
      {children}
    </h2>
  );
}

function Friends({ view }: { view: PortalView }) {
  return (
    <section aria-labelledby="friends-title">
      <SectionTitle id="friends-title">{COPY.friendsTitle}</SectionTitle>
      {view.friends.length === 0 ? (
        <p className="t-body mt-4 text-[--text-secondary]">{COPY.friendsEmpty}</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {view.friends.map((f, i) => (
            <li key={i} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 bg-[--surface-raised] px-4 py-3.5">
              <span className="font-body text-body text-[--text]">
                {f.name}
                <span className="ml-2 font-body text-body-s text-[--text-secondary]">{f.trip}</span>
              </span>
              <span className={cn("t-micro", f.counts ? "text-[--accent]" : "text-[--text-secondary]")}>
                {f.note ?? f.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* -- rewards ------------------------------------------------------------------------ */

function RewardRow({ title, line, earned, children }: { title: string; line: string; earned: boolean; children?: React.ReactNode }) {
  return (
    <li className={cn("px-4 py-5 sm:px-6", earned ? "scheme-emphasis scheme-paint" : "bg-[--surface-raised]")}>
      <p className="t-label flex items-center gap-2.5 text-[--text]">
        <span aria-hidden="true" className={cn("h-2 w-2", earned ? "bg-[--accent-solid]" : "border border-[--control-rule]")} />
        {title}
        <span className="sr-only">{earned ? ", earned" : ", not yet"}</span>
      </p>
      <p className="mt-2.5 font-body text-body text-[--text-secondary]">{line}</p>
      {children}
    </li>
  );
}

function Rewards({
  view,
  facts,
  claimFreeTrip,
}: {
  view: PortalView;
  facts: ProgramFacts;
  claimFreeTrip: (formData: FormData) => Promise<void>;
}) {
  const { first, goal, next } = facts.rewards;
  const pickNow = view.rewards.goal && !view.rewards.picked;
  return (
    <section id="rewards" aria-labelledby="rewards-title" className="scroll-mt-24">
      <SectionTitle id="rewards-title">{COPY.rewardsTitle}</SectionTitle>
      <ul className="mt-6 flex flex-col gap-2">
        <RewardRow title={first.title} line={view.rewards.first ? first.earned : first.locked} earned={view.rewards.first} />
        <RewardRow
          title={goal.title}
          line={view.rewards.picked ? goal.picked.replace("{departure}", view.rewards.picked) : view.rewards.goal ? goal.earned : goal.locked}
          earned={view.rewards.goal}
        >
          {pickNow && facts.departures.length > 0 && (
            <form action={claimFreeTrip} className="mt-5 flex flex-wrap gap-3">
              {facts.departures.map((d) => (
                <Button key={d.tripId} type="submit" name="trip_id" value={d.tripId} variant="primary" size="md">
                  {d.dates}
                </Button>
              ))}
            </form>
          )}
        </RewardRow>
        <RewardRow title={next.title} line={next.line} earned={false} />
      </ul>
      {view.hold && (
        <p className="mt-4 font-body text-body-s text-[--text-secondary]">
          Your spot: {HOLD_WORDS[view.hold] ?? "held"}.
        </p>
      )}
    </section>
  );
}

const HOLD_WORDS: Record<string, string> = {
  held: "held for you, no deposit",
  free: "free",
  paying: "we sent you a link to pay for it",
  released: "released",
};

/* -- leaderboard ---------------------------------------------------------------------- */

function Leaderboard({
  view,
  setLeaderboardHidden,
}: {
  view: PortalView;
  setLeaderboardHidden: (formData: FormData) => Promise<void>;
}) {
  const { top, you, hidden } = view.leaderboard;
  const youInTop = top.some((r) => r.isYou);
  return (
    <section id="leaderboard" aria-labelledby="leaderboard-title" className="scroll-mt-24">
      <SectionTitle id="leaderboard-title">{COPY.leaderboardTitle}</SectionTitle>
      <p className="mt-3 font-body text-body-s text-[--text-secondary]">
        Friends paid in full, then friends on a deposit. You&rsquo;re #{you.rank} of {you.of}.
      </p>
      {top.length === 0 ? (
        <p className="t-body mt-5 text-[--text-secondary]">{COPY.leaderboardEmpty}</p>
      ) : (
        <ol className="mt-6 flex flex-col gap-1.5">
          {top.map((r, i) => (
            <LeaderRow key={i} {...r} />
          ))}
          {!youInTop && (
            <LeaderRow rank={you.rank} name="You" school={null} paid={view.paid} onTheWay={view.onTheWay} isYou />
          )}
        </ol>
      )}

      <form action={setLeaderboardHidden} className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
        <input type="hidden" name="hidden" value={hidden ? "no" : "yes"} />
        <Button type="submit" variant="ghost" size="sm">
          {hidden ? "Show my name on the leaderboard" : COPY.leaderboardHide}
        </Button>
        {hidden && <span className="font-body text-body-s text-[--text-secondary]">{COPY.leaderboardHiddenNote}</span>}
      </form>
    </section>
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
        "grid grid-cols-[2.5rem_1fr_auto] items-baseline gap-3 px-4 py-3",
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
