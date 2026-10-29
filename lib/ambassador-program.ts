import { SIGNUP_DEADLINE, SIGNUP_DEADLINE_LABEL } from "@/lib/signup-deadline";

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
 * end of November 14. Bookings still close on November 14 for both
 * (lib/signup-deadline.ts).
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

export type AmbassadorProgram = {
  id: string;
  name: string;
  /** Friends who count, for the free trip. */
  goal: number;
  /** Bookings close and the codes expire (lib/signup-deadline.ts). */
  signupDeadline: Date;
  signupDeadlineLabel: string;
  /** Keyed by the trip's start_date. A departure not listed counts by signupDeadline. */
  departures: Readonly<Record<string, Departure>>;
  /** The page an ambassador's link opens (lib/ambassadors.ts referralLink). */
  landingPath: string;
  /** Whether an ambassador whose held spot was released keeps the portal (Carter, 29 Oct: yes). */
  releasedKeepAccess: boolean;
  rewards: {
    first: { title: string; earned: string; locked: string };
    goal: { title: string; earned: string; locked: (goal: number) => string; picked: (departure: string) => string };
    next: { title: string; line: string };
  };
  /** Recorded in legal_acceptances as document_slug + document_version. */
  agreement: { slug: "ambassador-agreement"; version: string; title: string; terms: readonly string[] };
};

/** The end of 4 December 2026, Central (CST, UTC-6): the January count closes. */
const JANUARY_COUNT_BY = new Date("2026-12-05T05:59:59Z");

export const TELLURIDE_2026: AmbassadorProgram = {
  id: "telluride-2026",
  name: "Telluride",
  goal: 5,
  signupDeadline: SIGNUP_DEADLINE,
  signupDeadlineLabel: SIGNUP_DEADLINE_LABEL,
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
  rewards: {
    first: {
      title: "Hat and a note",
      earned: "Your first friend booked. An Outrider hat and a note are on the way to you.",
      locked: "When your first friend books, an Outrider hat and a note go out to you.",
    },
    goal: {
      title: "A free trip",
      earned: "You did it. Your trip is free. Pick your week.",
      locked: (goal) => `Bring ${goal} friends who pay in full and your trip is on us.`,
      picked: (departure) => `Your trip is free. You picked ${departure}. We'll be in touch.`,
    },
    next: { title: "Spring break", line: "Coming next." },
  },
  agreement: {
    slug: "ambassador-agreement",
    version: "telluride-2026.1",
    title: "Ambassador agreement, Telluride",
    // Plain language, and only what Carter's brief says. Not reviewed by a
    // lawyer; bump the version whenever a word here changes, so every
    // acceptance points at the text it agreed to.
    terms: [
      "Your code and your link are yours. Your code takes nothing off for your friends. It tells us they came from you.",
      `A friend counts toward your 5 when they book with your code or your link and their trip is paid in full by the end of ${SIGNUP_DEADLINE_LABEL} (December trip) or December 4 (January trip), Central time. Bookings close ${SIGNUP_DEADLINE_LABEL}.`,
      "Cancelled and refunded bookings don’t count.",
      "Bring 5 friends who count and your trip is free. You pick the December or the January trip.",
      "Your spot is held for you with no deposit. If you’re short of 5 when the count closes, you pay for your spot or release it.",
      "When your first friend books, an Outrider hat and a note go out to you.",
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
  return (tripStart && program.departures[tripStart]?.countBy) || program.signupDeadline;
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
