"use client";

import { useEffect, useRef, useState } from "react";
import { Button, cn } from "@/components/ui";
import type { PortalView } from "@/lib/ambassador-rules";
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
  /** The departures, for the free-trip pick: trip id, "December", "December 14 to 18", and its count deadline. */
  departures: { tripId: string; label: string; dates: string; countByLabel: string }[];
  freeTrip: { earned: string; locked: string; picked: string };
};

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

export default function LiveDashboard({
  initial,
  facts,
  claimFreeTrip,
  announcement,
  notice,
  shareUrl,
  share,
  perks,
  toolkit,
}: {
  initial: PortalView;
  facts: ProgramFacts;
  claimFreeTrip: (formData: FormData) => Promise<void>;
  /** Server-rendered: the team's latest note, at the top of Home. */
  announcement?: React.ReactNode;
  /** Server-rendered: the result of the last action, above whichever tab is open. */
  notice?: React.ReactNode;
  /** Their referral link, for the Share button at the top of Home. */
  shareUrl: string;
  /** Server-rendered: the link, code and QR, on Home under the count. */
  share: React.ReactNode;
  /** Server-rendered: the perk cards, on Home under the link. */
  perks: React.ReactNode;
  /** Server-rendered: graphics, scripts, questions and the agreement. */
  toolkit: React.ReactNode;
}) {
  const [view, setView] = useState(initial);
  const [tab, setTab] = useState<TabId>("home");
  const reloading = useRef(false);
  const tabRefs = useRef<Partial<Record<TabId, HTMLButtonElement | null>>>({});

  // A server action redirects back here with fresh props; take them.
  useEffect(() => setView(initial), [initial]);

  useEffect(() => {
    const sync = () => setTab(tabFromHash(window.location.hash) ?? "home");
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

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

  function select(next: TabId, focus = false) {
    setTab(next);
    const { pathname, search } = window.location;
    window.history.replaceState(null, "", `${pathname}${search}${next === "home" ? "" : `#${next}`}`);
    window.scrollTo({ top: 0, behavior: "instant" });
    if (focus) tabRefs.current[next]?.focus();
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

  return (
    // Room at the foot on a phone, so the bar (and the home indicator under
    // it) never covers the last thing on the page. No grey flash on tap: every
    // control here draws its own pressed state.
    <div className="pb-[calc(5rem+env(safe-area-inset-bottom))] [-webkit-tap-highlight-color:transparent] md:pb-0">
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

      {notice}

      <Panel id="home" open={tab === "home"}>
        {announcement}
        <Progress view={view} facts={facts} claimFreeTrip={claimFreeTrip} go={select} shareUrl={shareUrl} />
        <div className="shell-narrow flex flex-col gap-10 py-10 md:py-14">
          {share}
          {perks}
        </div>
      </Panel>

      <Panel id="friends" open={tab === "friends"}>
        <Friends view={view} />
      </Panel>

      <Panel id="rankings" open={tab === "rankings"}>
        <Rankings view={view} />
      </Panel>

      <Panel id="toolkit" open={tab === "toolkit"}>
        {toolkit}
      </Panel>
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
  return (
    <section aria-labelledby="progress-title" className="scheme-espresso scheme-paint">
      <div className="shell-narrow pb-10 pt-8 md:pb-14 md:pt-12">
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

        <p className="t-subheading mt-6">
          {picked
            ? facts.freeTrip.picked.replace("{departure}", picked)
            : reached
              ? facts.freeTrip.earned
              : `${view.toGo} more and your trip is free.`}
        </p>

        {!reached && (
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

        {reached && !picked && facts.departures.length > 0 && (
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
