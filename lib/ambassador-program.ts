import {
  JANUARY_DEADLINE,
  LAST_SIGNUP_DEADLINE,
  SIGNUP_DEADLINE,
  SIGNUP_DEADLINE_LABEL,
  bookingsCloseAt,
  labelFor,
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
 * Pure and client-safe.
 */

export type Departure = {
  /** How the portal names it: "December". */
  label: string;
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
  name: string;
  /** Friends who count, for the free trip. */
  goal: number;
  /**
   * Short of the goal, what each friend who counts takes off the ambassador's
   * own spot (Carter, 29 October 2026: "$100 discount per person booked",
   * counted like the free trip, paid in full by the deadline).
   */
  perFriendCredit: number;
  /** The last booking close, when the codes expire (lib/signup-deadline.ts). */
  signupDeadline: Date;
  signupDeadlineLabel: string;
  /** Keyed by the trip's start_date. A departure not listed counts by its own booking close. */
  departures: Readonly<Record<string, Departure>>;
  /** The page an ambassador's link opens (lib/ambassadors.ts referralLink). */
  landingPath: string;
  /** Whether an ambassador whose held spot was released keeps the portal (Carter, 29 Oct: yes). */
  releasedKeepAccess: boolean;
  /** The free trip, the reward for reaching the goal. */
  freeTrip: {
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

export const TELLURIDE_2026: AmbassadorProgram = {
  id: "telluride-2026",
  name: "Telluride",
  goal: 5,
  perFriendCredit: 100,
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
  freeTrip: {
    earned: "Your trip is free. Pick your week.",
    locked: (goal) => `Bring ${goal} friends who pay in full and your trip is on us. Until then, each one takes $100 off.`,
    picked: (departure) => `Your trip is free. You picked ${departure}. We’ll be in touch.`,
  },
  perks: [
    { title: "Merch", line: "Outrider gear, made for the team.", look: "club" },
    {
      title: "First access",
      line: "Every new trip opens to you before anyone else. Spring break is next.",
      look: "photo",
      image: "/images/spring/palm-tower.jpg",
    },
    { title: "Exclusive deals", line: "Offers only ambassadors get.", look: "stone" },
    {
      title: `Text ${FOUNDER_TEXT.name}`,
      line: `${FOUNDER_TEXT.name} founded Outrider. Ideas, questions, a friend on the fence. Text him.`,
      look: "espresso",
      action: { label: `Text ${FOUNDER_TEXT.name}`, href: FOUNDER_TEXT.sms, detail: FOUNDER_TEXT.display },
    },
  ],
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

export const PROGRAMS: Readonly<Record<string, AmbassadorProgram>> = {
  [TELLURIDE_2026.id]: TELLURIDE_2026,
};

/** The program a row names, or Telluride for anything unknown. */
export function programFor(id: string | null | undefined): AmbassadorProgram {
  return (id && PROGRAMS[id]) || TELLURIDE_2026;
}

/** The instant a friend on this departure has to be paid in full by. */
export function countByFor(program: AmbassadorProgram, tripStart: string | null | undefined): Date {
  // A departure the program does not name counts by its own booking close.
  return (tripStart && program.departures[tripStart]?.countBy) || bookingsCloseAt(tripStart);
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
