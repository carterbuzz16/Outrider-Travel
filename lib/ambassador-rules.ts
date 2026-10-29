import { countByFor, departureLabel, type AmbassadorProgram } from "@/lib/ambassador-program";

/*
 * The ambassador program's decisions, as pure functions (29 October 2026), so
 * the admin page, the portal and the tests all run the same code:
 *
 *   - whether a friend's booking counts toward the goal (classifyFriend);
 *   - which ambassador row a signed-in account is, and whether it may link
 *     one (decideLink, accessFor);
 *   - what one ambassador is allowed to see (buildPortalView): their own
 *     friends as first name and last initial, and a leaderboard that carries
 *     names, schools and counts and nothing else;
 *   - which toolkit files they may open (toolkitFolders, isToolkitPathAllowed).
 *
 * Nothing here reads the database or the session. lib/ambassadors.ts and
 * lib/ambassador-portal.ts do, and hand the rows in.
 */

type BookingStatus = "pending" | "deposit_paid" | "paid_in_full" | "cancelled";

/** Carter's test sign-ups (exclude-test-accounts): never counted as real. */
export function isTestEmail(email: string | null | undefined): boolean {
  const e = (email ?? "").toLowerCase();
  return e.startsWith("carterbusby1") || e.endsWith("@resend.dev");
}

/** Supabase hands back a timestamp without a zone as bare ISO; these are UTC. */
export function utcMs(stamp: string | null | undefined): number | null {
  if (!stamp) return null;
  const ms = Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(stamp) ? stamp : `${stamp}Z`);
  return Number.isFinite(ms) ? ms : null;
}

/* -- the friend-count rule -------------------------------------------------- */

export type FriendFacts = {
  status: BookingStatus;
  /** A held spot (bookings.ambassador_hold, or some ambassador's hold_booking_id). */
  isHold: boolean;
  /** A [seed] or [test] trip, or one of Carter's test accounts. */
  isTest: boolean;
  /** Every payment on it went back. */
  refunded: boolean;
  /** When the payment that cleared it landed; null unless paid in full. */
  paidInFullMs: number | null;
  /** The trip's start_date: which departure's count deadline applies. */
  tripStart: string | null;
};

export type FriendVerdict = {
  /** Counts toward the goal. */
  counts: boolean;
  /** Live, deposit in, balance still owed: "on the way". */
  onTheWay: boolean;
  /** Why a paid or live booking does not count, for the admin table. */
  note: string | null;
};

/**
 * A booking that carries the ambassador's code COUNTS when all of these hold:
 *
 *   - it is paid in full (status paid_in_full), and the payment that cleared it
 *     landed by its departure's count deadline (countByFor: the end of
 *     November 14 for December, December 4 for January);
 *   - it is not cancelled, and its money has not all gone back;
 *   - it is not a held spot, the ambassador's own or anyone's;
 *   - it is not test data, except on a checkout sandbox build, so the rule can
 *     be tried end to end there.
 *
 * A live booking with only its deposit in is "on the way". Pending checkouts,
 * cancellations and late payments are neither.
 */
export function classifyFriend(f: FriendFacts, program: AmbassadorProgram, sandbox = false): FriendVerdict {
  const countable = !f.isHold && !f.refunded && (!f.isTest || sandbox);
  const onTime = f.paidInFullMs !== null && f.paidInFullMs <= countByFor(program, f.tripStart).getTime();
  const counts = countable && f.status === "paid_in_full" && onTime;
  const onTheWay = countable && f.status === "deposit_paid";

  let note: string | null = null;
  if (f.isHold) note = "Held spot";
  else if (f.isTest && !sandbox) note = "Test booking";
  else if (f.status === "cancelled") note = "Cancelled";
  else if (f.refunded) note = "Refunded";
  else if (f.status === "paid_in_full" && !onTime) note = "Paid after the deadline";
  else if (f.status === "pending") note = "Checkout not finished";

  return { counts, onTheWay, note };
}

/* -- names -------------------------------------------------------------------- */

/**
 * First name and last initial, the most of a traveler's or an ambassador's
 * name that ever leaves the server for the portal: "Sarah Kim" is "Sarah K.",
 * "Isaac" stays "Isaac". Only letters survive in the initial, so an email or
 * a stray symbol in a name field never leaks through it. `fallback` when
 * there is no usable name.
 */
export function shortName(name: string | null | undefined, fallback = "A friend"): string {
  const parts = (name ?? "")
    .replace(/[^\p{L}\p{M}' -]/gu, " ")
    .split(/\s+/)
    .map((p) => p.replace(/^['-]+|['-]+$/g, ""))
    .filter(Boolean);
  if (parts.length === 0) return fallback;
  const first = parts[0].slice(0, 24);
  const firstCased = first.charAt(0).toUpperCase() + first.slice(1);
  if (parts.length === 1) return firstCased;
  const initial = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${firstCased} ${initial}.`;
}

/** The ambassador's own first name, for "Hi, Sarah". */
export function firstName(name: string | null | undefined): string {
  return shortName(name, "there").split(" ")[0];
}

/* -- who is signed in ------------------------------------------------------------ */

/** The ambassador row as the portal needs it to decide access. */
export type AmbassadorAccessRow = {
  code: string;
  email: string | null;
  user_id: string | null;
  status: string;
  program: string;
};

/** The signed-in account, as Supabase reports it after getUser(). */
export type SessionUser = {
  id: string;
  email: string | null | undefined;
  /** Set once Supabase has confirmed the address (the emailed code, or a confirmation link). */
  email_confirmed_at: string | null | undefined;
};

export type LinkDecision = { link: true; code: string } | { link: false; reason: "unverified" | "none" | "ambiguous" | "taken" };

/**
 * Whether to link this account to an ambassador row on its first visit, from
 * the rows whose email matches (the caller looks them up by the exact,
 * lowercased address). Only an address Supabase has confirmed counts: a
 * session for an unconfirmed address proves nothing about who owns it. A row
 * already linked to another account is never moved, and two rows with the
 * same address are refused rather than guessed between.
 */
export function decideLink(user: SessionUser, candidates: AmbassadorAccessRow[]): LinkDecision {
  if (!user.email || !user.email_confirmed_at) return { link: false, reason: "unverified" };
  const email = user.email.trim().toLowerCase();
  const matching = candidates.filter((c) => c.email !== null && c.email === email);
  if (matching.length === 0) return { link: false, reason: "none" };
  if (matching.length > 1) return { link: false, reason: "ambiguous" };
  const row = matching[0];
  if (row.user_id !== null && row.user_id !== user.id) return { link: false, reason: "taken" };
  return { link: true, code: row.code };
}

/** The ambassador the portal is showing, once access is decided. */
export type PortalAmbassador = {
  code: string;
  name: string;
  school: string | null;
  status: string;
  program: string;
  agreedAt: string | null;
};

/**
 * Who is asking, as the portal's pages, actions and endpoints see it. Every one
 * of them gets this from the session alone (lib/ambassador-portal.ts,
 * getPortalAccess) and acts on `ambassador.code`; none takes a code or an id
 * from the request.
 */
export type PortalAccess =
  | { kind: "signed-out" }
  | { kind: "not-ambassador"; email: string | null }
  | { kind: "ambassador"; userId: string; ambassador: PortalAmbassador };

/** Whether a row's status still opens the portal. Dropped never does; released does if the program says so. */
export function statusHasAccess(status: string, program: AmbassadorProgram): boolean {
  if (status === "dropped") return false;
  if (status === "released") return program.releasedKeepAccess;
  return true;
}

/* -- what one ambassador sees ------------------------------------------------------ */

/** One ambassador with their friends, as lib/ambassadors.ts loads them. */
export type AmbassadorForView = {
  code: string;
  name: string;
  school: string | null;
  status: string;
  program: string;
  leaderboardHidden: boolean;
  holdStatus: string | null;
  rewardTripStart: string | null;
  rewardClaimedAt: string | null;
  bookings: {
    status: BookingStatus;
    traveler: string;
    tripStart: string | null;
    counts: boolean;
    depositOnly: boolean;
    note: string | null;
  }[];
  paidInFull: number;
  depositOnly: number;
};

export type PortalFriend = {
  name: string;
  trip: string;
  status: "Paid in full" | "Deposit paid";
  counts: boolean;
  /** Why a paid friend does not count yet, in the ambassador's words. */
  note: string | null;
};

export type LeaderboardEntry = {
  rank: number;
  name: string;
  school: string | null;
  paid: number;
  onTheWay: number;
  isYou: boolean;
};

export type PortalView = {
  firstName: string;
  code: string;
  goal: number;
  paid: number;
  onTheWay: number;
  toGo: number;
  friends: PortalFriend[];
  leaderboard: {
    top: LeaderboardEntry[];
    you: { rank: number; of: number };
    hidden: boolean;
  };
  rewards: {
    first: boolean;
    goal: boolean;
    /** The departure they picked for the free trip, if they have. */
    picked: string | null;
  };
  /** Their own held spot: "held", "free", "paying", "released", or null. */
  hold: string | null;
  updatedAt: string;
};

export const LEADERBOARD_SIZE = 10;
/** What an ambassador who opted out is called on everyone else's board. */
export const HIDDEN_NAME = "An ambassador";

/**
 * Everything the portal shows one ambassador, built from every ambassador's
 * counts so the leaderboard is true, but carrying only:
 *
 *   - their own friends, as first name and last initial, with the trip and
 *     whether they are paid in full or on a deposit (no emails, amounts,
 *     dates or booking ids);
 *   - for everyone else, a rank, first name and last initial, school and two
 *     counts. Never another ambassador's code or friends.
 *
 * Ranks are by friends who count, then friends on the way, ties sharing a
 * rank (1, 2, 2, 4). The top of the board lists only ambassadors with at least
 * one friend; everyone, including those with none, has a rank of their own.
 * Dropped ambassadors and other programs are left off the board entirely.
 * `null` when `selfCode` is not in `all`.
 */
export function buildPortalView(
  selfCode: string,
  all: AmbassadorForView[],
  program: AmbassadorProgram,
  now: Date = new Date(),
): PortalView | null {
  const self = all.find((a) => a.code === selfCode);
  if (!self) return null;

  const friends: PortalFriend[] = self.bookings
    .filter((b) => b.note !== "Held spot" && b.note !== "Test booking" && (b.status === "paid_in_full" || b.status === "deposit_paid"))
    .filter((b) => b.counts || b.depositOnly || b.note === "Paid after the deadline")
    .map((b) => ({
      name: shortName(b.traveler),
      trip: departureLabel(program, b.tripStart),
      status: b.status === "paid_in_full" ? ("Paid in full" as const) : ("Deposit paid" as const),
      counts: b.counts,
      note: b.note === "Paid after the deadline" ? "Paid after the deadline" : null,
    }));

  const board = all
    .filter((a) => a.program === self.program && a.status !== "dropped")
    .map((a) => ({ a, paid: a.paidInFull, onTheWay: a.depositOnly }))
    .sort((x, y) => y.paid - x.paid || y.onTheWay - x.onTheWay || x.a.name.localeCompare(y.a.name));

  const ranked: LeaderboardEntry[] = [];
  board.forEach((row, i) => {
    const prev = board[i - 1];
    const rank = prev && prev.paid === row.paid && prev.onTheWay === row.onTheWay ? ranked[i - 1].rank : i + 1;
    const isYou = row.a.code === self.code;
    ranked.push({
      rank,
      // Opted out: still ranked, so everyone's rank is true, but nameless to
      // others. They always see their own name.
      name: row.a.leaderboardHidden && !isYou ? HIDDEN_NAME : shortName(row.a.name, "Ambassador"),
      school: row.a.leaderboardHidden && !isYou ? null : row.a.school,
      paid: row.paid,
      onTheWay: row.onTheWay,
      isYou,
    });
  });
  const mine = ranked.find((r) => r.isYou);

  return {
    firstName: firstName(self.name),
    code: self.code,
    goal: program.goal,
    paid: self.paidInFull,
    onTheWay: self.depositOnly,
    toGo: Math.max(0, program.goal - self.paidInFull),
    friends,
    leaderboard: {
      top: ranked.filter((r) => r.paid + r.onTheWay > 0).slice(0, LEADERBOARD_SIZE),
      you: { rank: mine?.rank ?? ranked.length + 1, of: ranked.length },
      hidden: self.leaderboardHidden,
    },
    rewards: {
      first: self.paidInFull + self.depositOnly > 0,
      goal: self.paidInFull >= program.goal,
      picked: self.rewardClaimedAt ? departureLabel(program, self.rewardTripStart) : null,
    },
    hold: self.holdStatus,
    updatedAt: now.toISOString(),
  };
}

/** The longest announcement, matching the table's CHECK (ambassador_portal migration). */
export const ANNOUNCEMENT_MAX = 600;

/* -- toolkit files ------------------------------------------------------------------- */

export const TOOLKIT_BUCKET = "ambassador-toolkit";
export const TOOLKIT_SHARED = "shared";

/** "Texas A&M" is "texas-a-m": a school's folder name under schools/. */
export function schoolSlug(school: string | null | undefined): string | null {
  const slug = (school ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug.length > 0 ? slug : null;
}

/** The folders one ambassador may open: shared/, and their school's own. */
export function toolkitFolders(school: string | null | undefined): string[] {
  const slug = schoolSlug(school);
  return slug ? [TOOLKIT_SHARED, `schools/${slug}`] : [TOOLKIT_SHARED];
}

/** A file name as the admin upload writes it: lowercase letters, digits, dashes, one image extension. */
const TOOLKIT_FILE = /^[a-z0-9][a-z0-9-]{0,80}\.(png|jpg|webp)$/;

/**
 * Whether `path` (as requested) is a file this ambassador may open: directly
 * inside one of their folders, with a name the upload could have written. No
 * "..", no nested folders, no other school.
 */
export function isToolkitPathAllowed(path: string, school: string | null | undefined): boolean {
  const slash = path.lastIndexOf("/");
  if (slash < 0) return false;
  const folder = path.slice(0, slash);
  const file = path.slice(slash + 1);
  return toolkitFolders(school).includes(folder) && TOOLKIT_FILE.test(file);
}
