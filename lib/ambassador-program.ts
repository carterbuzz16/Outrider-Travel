import {
  JANUARY_DEADLINE,
  LAST_SIGNUP_DEADLINE,
  SIGNUP_DEADLINE,
  SIGNUP_DEADLINE_LABEL,
  bookingsCloseAt,
  departureClosed,
  labelFor,
  tellurideClosed,
} from "@/lib/signup-deadline";

/*
 * The ambassador program's rules, in one place (29 October 2026).
 *
 * Everything that would change when spring break opens with its own terms
 * lives here, keyed by program: the goal, the dates a friend has to be paid
 * by, the rewards, the agreement an ambassador accepts, and where their link
 * points. ambassadors.program names the entry that applies to each row. The
 * counting itself (lib/ambassador-rules.ts) and every page read from this, so
 * no component carries a number or a date of its own.
 *
 * Telluride 2026 (Carter's brief, 29 October 2026): five friends booked with
 * the ambassador's $0 code and paid in full earns a free trip. Their own spot
 * is held with no deposit; short of five when the count closes, they pay for
 * it or release it. On 29 October Carter also said January money "isn't due
 * till December 4", so a friend on the January departure counts if they are
 * paid in full by the end of December 4, Central; a December friend by the
 * end of November 14. Bookings close on the same two dates, each week its own
 * (Carter, 29 October 2026: "split by trip", lib/signup-deadline.ts).
 *
 * Spring break 2027 at Zemi Miches (3 November 2026). Carter's words: "Ten
 * friends and your trip is free." Released Telluride ambassadors keep the
 * portal for it. Nothing else about it is decided, so nothing else is promised:
 * no per-friend credit, no held spot, no pick of a week (lib/ambassador-rules.ts
 * and the dashboard read those from here), and a friend counts by their own
 * week's booking close, which is itself a placeholder until Carter confirms it
 * (lib/signup-deadline.ts). Still to decide: the credit, a held spot, the
 * paid-by date, which week a free trip is for, and whether everyone moves over
 * automatically. Today everyone with the portal sees it and agrees on their own.
 *
 * One ambassador, one code, both programs (3 November 2026). ambassadors.program
 * holds one value and Telluride sells beside spring break until it closes, so a
 * friend is not counted by that column but by the trip they booked: the program
 * that names the departure, and only that one (programForDeparture). The
 * column is never written with anything but Telluride today; it decides who
 * keeps the portal (statusHasAccess) and nothing about a count.
 *
 * Pure and client-safe.
 */

export type Departure = {
  /** How the portal names it: "December", "March 8". */
  label: string;
  /** How a countdown names it, when the label alone doesn't read: "March 8 week". */
  closingName?: string;
  /** The dates, for the picker: "December 14 to 18". */
  dates: string;
  /** A friend on this departure counts if paid in full by this instant. */
  countBy: Date;
  /** That day, for copy: "November 14". */
  countByLabel: string;
};

/**
 * One perk card on the dashboard. `look` is its panel: club blue, warm gray,
 * espresso, or a photograph over espresso (small text always sits on the
 * solid part, never on the picture). `action` is a button on the card.
 */
export type Perk = {
  title: string;
  line: string;
  look: "club" | "stone" | "espresso" | "photo";
  /** For a "photo" card: a path under public/. */
  image?: string;
  action?: { label: string; href: string; detail?: string };
};

/** Carter's own number, for ambassadors only (the portal is sign-in only; the public site publishes no texting number). */
export const FOUNDER_TEXT = { name: "Carter", display: "(256) 929-9189", sms: "sms:+12569299189" };

export type AmbassadorProgram = {
  id: string;
  /** "Telluride", "Spring break": on a switch or a column head. */
  name: string;
  /** The same in the middle of a sentence: "spring break". */
  nameInSentence: string;
  /** Friends who count, for the free trip. */
  goal: number;
  /**
   * Short of the goal, what each friend who counts takes off the ambassador's
   * own spot (Carter, 29 October 2026: "$100 discount per person booked",
   * counted like the free trip, paid in full by the deadline). 0 means there is
   * no such credit, and nothing mentions one.
   */
  perFriendCredit: number;
  /** Whether an ambassador's own spot is held with no deposit on this program. */
  heldSpots: boolean;
  /** This program's last booking close (lib/signup-deadline.ts). The codes outlast it: they run to the last close of anything. */
  signupDeadline: Date;
  signupDeadlineLabel: string;
  /**
   * Keyed by the trip's start_date. A friend counts only toward the program
   * whose departures include their trip (programForDeparture).
   */
  departures: Readonly<Record<string, Departure>>;
  /** The page an ambassador's link opens (lib/ambassadors.ts referralLink). */
  landingPath: string;
  /** Whether an ambassador whose held spot was released keeps the portal (Carter, 29 Oct: yes). */
  releasedKeepAccess: boolean;
  /** Whether the toolkit's graphics are for this program. The bucket's shared/ folder is Telluride art. */
  graphics: boolean;
  /** Whether the playbook PDF is about this program (lib/site-content.ts, playbookPath). */
  playbook: boolean;
  /** The free trip, the reward for reaching the goal. */
  freeTrip: {
    /** Whether reaching the goal lets them pick a departure on the dashboard. */
    picksWeek: boolean;
    earned: string;
    locked: (goal: number) => string;
    picked: (departure: string) => string;
  };
  /**
   * What every ambassador gets, whatever their count. No dates, no amounts:
   * Carter (29 Oct 2026) wants merch, first access and deals named as perks,
   * without promising when.
   */
  perks: readonly Perk[];
  /** Recorded in legal_acceptances as document_slug + document_version. */
  agreement: { slug: "ambassador-agreement"; version: string; title: string; terms: readonly string[] };
};

/** January's count closes when January's bookings do (lib/signup-deadline.ts). */
const JANUARY_COUNT_BY = JANUARY_DEADLINE;

/** What every ambassador gets, on either program. */
const PERKS: readonly Perk[] = [
  { title: "Merch", line: "Outrider gear, made for the team.", look: "club" },
  {
    title: "First access",
    line: "Every new trip opens to you before anyone else.",
    look: "photo",
    image: "/images/spring/zemi-beach-aerial.jpg",
  },
  { title: "Exclusive deals", line: "Offers only ambassadors get.", look: "stone" },
  {
    title: `Text ${FOUNDER_TEXT.name}`,
    line: `${FOUNDER_TEXT.name} founded Outrider. Ideas, questions, a friend on the fence. Text him.`,
    look: "espresso",
    action: { label: `Text ${FOUNDER_TEXT.name}`, href: FOUNDER_TEXT.sms, detail: FOUNDER_TEXT.display },
  },
];

export const TELLURIDE_2026: AmbassadorProgram = {
  id: "telluride-2026",
  name: "Telluride",
  nameInSentence: "Telluride",
  goal: 5,
  perFriendCredit: 100,
  heldSpots: true,
  signupDeadline: LAST_SIGNUP_DEADLINE,
  signupDeadlineLabel: labelFor(LAST_SIGNUP_DEADLINE),
  departures: {
    "2026-12-14": {
      label: "December",
      dates: "December 14 to 18",
      countBy: SIGNUP_DEADLINE,
      countByLabel: SIGNUP_DEADLINE_LABEL,
    },
    "2027-01-04": {
      label: "January",
      dates: "January 4 to 8",
      countBy: JANUARY_COUNT_BY,
      countByLabel: "December 4",
    },
  },
  landingPath: "/telluride",
  releasedKeepAccess: true,
  graphics: true,
  playbook: true,
  freeTrip: {
    picksWeek: true,
    earned: "Your trip is free. Pick your week.",
    locked: (goal) => `Bring ${goal} friends who pay in full and your trip is on us. Until then, each one takes $100 off.`,
    picked: (departure) => `Your trip is free. You picked ${departure}. We’ll be in touch.`,
  },
  perks: PERKS,
  agreement: {
    slug: "ambassador-agreement",
    // .2 (29 Oct 2026): $100 off your spot per friend who counts, short of 5.
    version: "telluride-2026.2",
    title: "Ambassador agreement, Telluride",
    // Plain language, and only what Carter's brief says. Not reviewed by a
    // lawyer; bump the version whenever a word here changes, so every
    // acceptance points at the text it agreed to.
    terms: [
      "Your code and your link are yours. Your code takes nothing off for your friends. It tells us they came from you.",
      `A friend counts toward your 5 when they book with your code or your link and their trip is paid in full by the end of ${SIGNUP_DEADLINE_LABEL} (December trip) or ${labelFor(JANUARY_DEADLINE)} (January trip), Central time. Bookings close on the same dates.`,
      "Cancelled and refunded bookings don’t count.",
      "Bring 5 friends who count and your trip is free. You pick the December or the January trip.",
      "Short of 5, every friend who counts takes $100 off your own spot.",
      "Your spot is held for you with no deposit. If you’re short of 5 when the count closes, you pay what’s left on it or release it.",
      "Spring break has its own terms, shared when it opens.",
    ],
  },
};

/** Spring break's two weeks, keyed by start_date, closing when lib/signup-deadline.ts says they do. */
function springBreakWeek(start: string, label: string, dates: string): Departure {
  const close = bookingsCloseAt(start);
  return { label, closingName: `${label} week`, dates, countBy: close, countByLabel: labelFor(close) };
}

const SPRING_BREAK_DEPARTURES: Readonly<Record<string, Departure>> = {
  "2027-03-08": springBreakWeek("2027-03-08", "March 8", "March 8 to 12"),
  "2027-03-15": springBreakWeek("2027-03-15", "March 15", "March 15 to 19"),
};

const SPRING_BREAK_LAST_CLOSE = new Date(
  Math.max(...Object.values(SPRING_BREAK_DEPARTURES).map((d) => d.countBy.getTime())),
);

const SPRING_BREAK_GOAL = 10;

export const SPRING_BREAK_2027: AmbassadorProgram = {
  id: "spring-break-2027",
  name: "Spring break",
  nameInSentence: "spring break",
  goal: SPRING_BREAK_GOAL,
  perFriendCredit: 0,
  heldSpots: false,
  signupDeadline: SPRING_BREAK_LAST_CLOSE,
  signupDeadlineLabel: labelFor(SPRING_BREAK_LAST_CLOSE),
  departures: SPRING_BREAK_DEPARTURES,
  landingPath: "/spring-break",
  releasedKeepAccess: true,
  // None yet. Telluride's art must not show here; these flip when spring
  // break's own exist, which also needs a folder of its own in the bucket.
  graphics: false,
  playbook: false,
  freeTrip: {
    // Which week a free trip is for is not decided, and ambassadors.reward_*
    // holds one pick, already spoken for by Telluride. So reaching the goal says
    // so and the team follows up; there is nothing to pick here.
    picksWeek: false,
    earned: "Your trip is free. We’ll be in touch about your week.",
    locked: (goal) => `Bring ${goal} friends who pay in full and your trip is on us.`,
    picked: (departure) => `Your trip is free. You picked ${departure}. We’ll be in touch.`,
  },
  perks: PERKS,
  agreement: {
    slug: "ambassador-agreement",
    version: "spring-break-2027.1",
    title: "Ambassador agreement, spring break",
    // Plain language, and only what Carter has decided (3 November 2026). Not
    // reviewed by a lawyer; bump the version whenever a word here changes, and
    // everyone who agreed to the old words is asked again. No date on purpose:
    // the closes are placeholders, and moving one should not reopen this.
    terms: [
      "You keep the same code. It takes nothing off for your friends. It tells us they came from you.",
      `A friend counts toward your ${SPRING_BREAK_GOAL} when they book spring break at Zemi Miches with your code or your link, and their trip is paid in full by the end of the day their week closes, Central time. Your dashboard shows each week’s date.`,
      "Spring break and Telluride count separately. A friend counts toward the trip they book, never both.",
      "Cancelled and refunded bookings don’t count.",
      `Bring ${SPRING_BREAK_GOAL} friends who count and your trip is free. We’ll be in touch about your week.`,
      "No spot is held for you on spring break.",
      "Your Telluride agreement stays as it is.",
    ],
  },
};

/** In the order the portal offers them. */
export const PROGRAMS: Readonly<Record<string, AmbassadorProgram>> = {
  [TELLURIDE_2026.id]: TELLURIDE_2026,
  [SPRING_BREAK_2027.id]: SPRING_BREAK_2027,
};

/** The program a row names, or Telluride for anything unknown. */
export function programFor(id: string | null | undefined): AmbassadorProgram {
  return (id && PROGRAMS[id]) || TELLURIDE_2026;
}

/**
 * The program a friend's booking belongs to: the one that names its departure.
 * A departure nobody names is Telluride's, as every booking was before there
 * was a second program; that is what the [seed] trips the sandbox counts on
 * have always been. This is the whole of how a friend is kept from counting
 * twice, or toward the wrong free trip (3 November 2026).
 */
export function programForDeparture(tripStart: string | null | undefined): AmbassadorProgram {
  if (!tripStart) return TELLURIDE_2026;
  return Object.values(PROGRAMS).find((p) => p.departures[tripStart]) ?? TELLURIDE_2026;
}

/**
 * The instant a friend on this departure has to be paid in full by. A departure
 * no program names falls back to SIGNUP_DEADLINE outright. It read
 * bookingsCloseAt until 3 November 2026, and that map grows with every new line:
 * once spring break was in it, its friends read as on time for Telluride.
 */
export function countByFor(program: AmbassadorProgram, tripStart: string | null | undefined): Date {
  return (tripStart && program.departures[tripStart]?.countBy) || SIGNUP_DEADLINE;
}

/** "December", or the date itself for a departure the program does not name. */
export function departureLabel(program: AmbassadorProgram, tripStart: string | null | undefined): string {
  if (!tripStart) return "Trip";
  return program.departures[tripStart]?.label ?? tripStart;
}

/** The last instant anything can still change for this program's counts. */
export function countClosesAt(program: AmbassadorProgram): Date {
  return new Date(Math.max(program.signupDeadline.getTime(), ...Object.values(program.departures).map((d) => d.countBy.getTime())));
}

/**
 * What the friends who count take off an ambassador's own spot: nothing at
 * the goal or past it (the spot is free then), otherwise perFriendCredit each.
 */
export function friendCredit(program: AmbassadorProgram, friendsWhoCount: number): number {
  const n = Math.max(0, Math.floor(friendsWhoCount));
  return n >= program.goal ? 0 : n * program.perFriendCredit;
}

/** An ambassador's own spot, priced: free at the goal, otherwise the price less the credit, never below zero. */
export function spotPrice(program: AmbassadorProgram, listPrice: number, friendsWhoCount: number): number {
  if (friendsWhoCount >= program.goal) return 0;
  return Math.max(0, listPrice - friendCredit(program, friendsWhoCount));
}

/** Whether every week of this program has stopped taking bookings. */
export function programClosed(program: AmbassadorProgram, now: Date = new Date()): boolean {
  return Object.keys(program.departures).every((start) => departureClosed(start, now));
}

/** The programs still selling, for anything that promises a free trip to someone new. */
export function openPrograms(now: Date = new Date()): AmbassadorProgram[] {
  return Object.values(PROGRAMS).filter((p) => !programClosed(p, now));
}

/**
 * Which program the portal opens on: Telluride while it sells, because that is
 * what everyone is in the middle of, then spring break.
 */
export function defaultPortalProgram(now: Date = new Date()): AmbassadorProgram {
  return tellurideClosed(now) ? SPRING_BREAK_2027 : TELLURIDE_2026;
}

/**
 * An ambassador's link for one program, as a path, for the copy buttons that
 * add the origin themselves. The program is required: a default here is how a
 * Telluride link ends up on a spring break page.
 */
export function referralPath(code: string, program: AmbassadorProgram): string {
  return `${program.landingPath}?ref=${code.toLowerCase()}`;
}

/** The same link in full, as ambassadors share it. */
export function referralLink(siteUrl: string, code: string, program: AmbassadorProgram): string {
  return `${siteUrl.replace(/\/$/, "")}${referralPath(code, program)}`;
}
