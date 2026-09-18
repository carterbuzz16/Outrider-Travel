import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";

export { tierDisplayName } from "@/lib/tier-display";

/**
 * The rooms at The Peaks Resort behind each package, and their photographs.
 *
 * The owner's brief: people should see what they are getting for each tier,
 * the penthouse above all. The package names and prices live in the database
 * (edited in /admin); this is the room-level detail the database has no
 * column for, keyed by the tier's name. The DB names are "BASE", "MID",
 * "PENTHOUSE 702" and "PENTHOUSE 830"; matching ignores case and extra space,
 * and a tier with any other name simply gets no room panel. "TOP" (the single
 * top package the penthouses replaced) still resolves, to both penthouses, so
 * a departure not yet moved over keeps its room panel.
 *
 * The facts here restate TELLURIDE_ROOMS in lib/site-content.ts (as of
 * September 2026: BASE and MID share the same Two King room, four people or
 * two; each penthouse is its own package, a private four-bedroom penthouse
 * that one group of eight books whole, and guests choose 702 or 830). If the
 * rooming changes, change both, and ComparisonTable, VALUE_PROPS and the FAQ with
 * them.
 *
 * The penthouse facts are the resort's own listing for each unit, restated.
 * Both sleep eleven; Outrider puts exactly eight in either, so the site never
 * quotes eleven as a group size. Spa access and the ski valet are listed for
 * 830 only, so they are not claimed for 702.
 *
 * ---------------------------------------------------------------------------
 * PHOTOGRAPHS live in public/images/peaks/ (README.md there lists them). The
 * Two King room has one photograph, used by BASE and MID alike since it is
 * the same room. Each penthouse has its own set, hero first; the TOP fallback
 * shows 702's then 830's. To add a photo, drop the file in and add a line
 * below with alt text that says what is actually in the frame.
 *
 * Only files that exist are returned, checked on the server at render time,
 * so a missing photo is never a broken image: a room with none renders its
 * typographic panel instead (components/ui/RoomShowcase.tsx). On Vercel the
 * public folder is served from the CDN and is not in the server bundle, so
 * next.config.mjs traces public/images/peaks into the routes that call this;
 * a page added that uses it needs adding there too.
 * ---------------------------------------------------------------------------
 */

/** "PENTHOUSE" is one penthouse sold as its own package; "TOP" is the old single top package. */
export type RoomKey = "BASE" | "MID" | "PENTHOUSE" | "TOP";
export type RoomPhoto = { src: string; alt: string };
export type RoomFact = { label: string; value: string };

/** One of the two penthouses. */
export type Penthouse = {
  /** "702" */
  number: string;
  /** "Penthouse 702" */
  name: string;
  /** One line that sells it. */
  line: string;
  /** Short under the number on the typographic panel: "Three stories · 270° views". */
  panel: string;
  /** The at-a-glance numbers: "4" over "Bedrooms". */
  stats: { value: string; label: string }[];
  facts: RoomFact[];
  /** Existing files only, hero first. */
  photos: RoomPhoto[];
};

export type RoomMedia = {
  key: RoomKey;
  /** "The Two King room" */
  title: string;
  /** One line for a package card: "Four to a Room, in a Two King room". */
  summary: string;
  /** What this room is, and what it adds over the one below it. */
  upgrade: string;
  /** The headline figure for the typographic panel: "4" over "to a room". */
  figure: { value: string; unit: string };
  facts: RoomFact[];
  /** Existing files only, hero first. Empty until the photographs arrive. */
  photos: RoomPhoto[];
  /** PENTHOUSE: the one penthouse this package is. TOP: both. */
  penthouses?: Penthouse[];
  /** PENTHOUSE and TOP: what both penthouses share, said once under the pair. */
  shared?: string;
};

type PenthouseSource = Omit<Penthouse, "photos"> & { wanted: RoomPhoto[] };
type RoomSource = Omit<RoomMedia, "key" | "photos" | "penthouses"> & {
  key: RoomKey;
  wanted: RoomPhoto[];
  penthouses?: PenthouseSource[];
};

const PROPERTY_FACT: RoomFact = { label: "Where", value: "The Peaks Resort, ski-in and ski-out" };

/** The package promise, the same words on every penthouse surface. */
const WHOLE_PENTHOUSE = "Eight of you, the whole penthouse";

const PENTHOUSE_SHARED =
  "Each penthouse has an elevator and ski-in, ski-out access, and you have the run of the resort's pool, hot tub and exercise room.";

const TWO_KING_PHOTO: RoomPhoto = {
  src: "/images/peaks/two-king-1.jpg",
  alt: "A Two King room at The Peaks: two white king beds with dark leather headboards, and a sliding door to a balcony at sunset.",
};

const P702: PenthouseSource = {
  number: "702",
  name: "Penthouse 702",
  line: "Three bedrooms on one main level and a fourth upstairs, around one big open room for cooking, eating and hanging out, with Mt. Wilson and the San Sophia range filling the windows.",
  panel: "Four bedrooms · Mt. Wilson views",
  stats: [
    { value: "4", label: "Bedrooms" },
    { value: "4.5", label: "Baths" },
    { value: "3", label: "King beds" },
    { value: "2", label: "Dining areas" },
  ],
  facts: [
    {
      label: "Beds",
      value:
        "Three kings (one splits into two twins) and two fulls upstairs. Every bedroom has its own bath.",
    },
    {
      label: "Views",
      value:
        "Mt. Wilson and the San Sophia range from the living space, the Mountain Village core from the family room",
    },
    {
      label: "Standouts",
      value:
        "A primary bath with a soaking tub, steam shower and double sinks. A full kitchen with a gas range and breakfast bar. A separate family room with couches and a TV. Central air.",
    },
  ],
  wanted: [
    {
      src: "/images/peaks/penthouse-702-1.jpg",
      alt: "The great room in Penthouse 702: two dining tables, leather sofas, a stone fireplace with bookshelves and a vaulted wood ceiling with skylights, and a wall of windows onto the mountains at dusk.",
    },
    {
      src: "/images/peaks/penthouse-702-2.jpg",
      alt: "A long dining table in Penthouse 702 set for ten under an iron chandelier, with floor-to-ceiling windows onto the mountains at dusk.",
    },
    {
      src: "/images/peaks/penthouse-702-3.jpg",
      alt: "The kitchen in Penthouse 702, with a breakfast bar and granite counters, a dining table on a red rug, and the stairs up to the fourth bedroom.",
    },
  ],
};

const P830: PenthouseSource = {
  number: "830",
  name: "Penthouse 830",
  line: "Three floors at the very top of The Peaks, with a view that wraps 270 degrees around the mountains.",
  panel: "Three stories · 270° views",
  stats: [
    { value: "4", label: "Bedrooms" },
    { value: "4", label: "Baths" },
    { value: "3", label: "Stories" },
    { value: "270°", label: "Views" },
  ],
  facts: [
    { label: "Beds", value: "A king, a king, a convertible king and two bunk beds" },
    {
      label: "Views",
      value: "Mt. Wilson, the Telluride Golf Course, the ski resort and the San Sophia range",
    },
    {
      label: "Standouts",
      value:
        "The top floor of the building. Your own laundry. Complimentary access to The Peaks Spa and The Peaks Ski Valet.",
    },
  ],
  wanted: [
    {
      src: "/images/peaks/penthouse-830-1.jpg",
      alt: "The top-floor great room in Penthouse 830 under a peaked log-beam ceiling and an antler chandelier, with windows on every side over Mountain Village in fall, a long dining table and a kitchen island.",
    },
    {
      src: "/images/peaks/penthouse-830-2.jpg",
      alt: "The primary bedroom in Penthouse 830: a king bed under a coffered ceiling, with windows onto Mt. Wilson and the aspens.",
    },
    {
      src: "/images/peaks/penthouse-830-3.jpg",
      alt: "The bunk room in Penthouse 830: two bunk beds, each with a full bed below and striped blankets, and a window onto the valley.",
    },
  ],
};

/** One penthouse, sold as its own package. */
function penthousePackage(p: PenthouseSource, summaryTail: string): RoomSource {
  return {
    key: "PENTHOUSE",
    title: p.name,
    summary: `${WHOLE_PENTHOUSE}. ${summaryTail}`,
    upgrade: p.line,
    figure: { value: p.number, unit: "the whole penthouse" },
    facts: [{ label: "Sharing", value: WHOLE_PENTHOUSE }, ...p.facts, PROPERTY_FACT],
    shared: PENTHOUSE_SHARED,
    wanted: [],
    penthouses: [p],
  };
}

const ROOMS: Record<string, RoomSource> = {
  BASE: {
    key: "BASE",
    title: "The Two King room",
    summary: "Four to a Room, in a Two King room",
    upgrade:
      "Where every package starts. A Two King room at The Peaks, shared by four of you, two to a bed, with the rest of the group under the same roof.",
    figure: { value: "4", unit: "to a room" },
    facts: [
      { label: "Beds", value: "Two kings" },
      { label: "Sharing", value: "Four, two to a bed" },
      PROPERTY_FACT,
    ],
    wanted: [TWO_KING_PHOTO],
  },
  MID: {
    key: "MID",
    title: "The Two King room, for two",
    summary: "Two to a Room, in the same Two King room",
    upgrade:
      "The same Two King room with half the people in it, so each of you has a king bed of your own.",
    figure: { value: "2", unit: "to a room" },
    facts: [
      { label: "Beds", value: "Two kings" },
      { label: "Sharing", value: "Two, a king bed each" },
      PROPERTY_FACT,
    ],
    wanted: [TWO_KING_PHOTO],
  },
  "PENTHOUSE 702": penthousePackage(P702, "Four bedrooms, 4.5 baths."),
  "PENTHOUSE 830": penthousePackage(P830, "Three stories, 270° views."),
  TOP: {
    key: "TOP",
    title: "The penthouse",
    summary: "Private four-bedroom penthouse for your group of eight",
    upgrade:
      "A four-bedroom penthouse at The Peaks, held for your group of eight and nobody else. 702 keeps three bedrooms on one main level with a fourth upstairs. 830 spreads over three stories.",
    figure: { value: "8", unit: "your group only" },
    facts: [
      { label: "Sharing", value: "Your group of eight and nobody else" },
      { label: "Which one", value: "Penthouse 702 or 830" },
      PROPERTY_FACT,
    ],
    shared: PENTHOUSE_SHARED,
    wanted: [],
    penthouses: [P702, P830],
  },
};

/** "Penthouse  702 " and "PENTHOUSE 702" are the same name. */
function normalise(tierName: string): string {
  return tierName.trim().replace(/\s+/g, " ").toUpperCase();
}

/** The kind of room behind a package, or null for a name this file does not know. */
export function roomKeyFor(tierName: string): RoomKey | null {
  return ROOMS[normalise(tierName)]?.key ?? null;
}

function fileExists(src: string): boolean {
  try {
    return existsSync(path.join(process.cwd(), "public", src));
  } catch {
    return false;
  }
}

const existing = (photos: RoomPhoto[]) => photos.filter((photo) => fileExists(photo.src));

/** The room behind a package, with only the photographs that exist, or null. */
export function getRoomMedia(tierName: string): RoomMedia | null {
  const source = ROOMS[normalise(tierName)];
  if (!source) return null;
  const { wanted, penthouses, ...room } = source;
  if (!penthouses) return { ...room, photos: existing(wanted) };

  const resolved: Penthouse[] = penthouses.map(({ wanted: shots, ...p }) => ({
    ...p,
    photos: existing(shots),
  }));
  return {
    ...room,
    penthouses: resolved,
    photos: [...existing(wanted), ...resolved.flatMap((p) => p.photos)],
  };
}

/**
 * How a package sits in the package table: the two penthouses are grouped
 * under one heading, everything else stands alone. Spread into a TierView.
 */
export function tierGrouping(
  tierName: string,
  /** How many penthouse packages the departure has. Not every date has both (January has 702 only). */
  penthouseCount = 2,
): { group: string | null; groupNote: string | null } {
  return roomKeyFor(tierName) === "PENTHOUSE"
    ? {
        group: "The penthouse",
        groupNote:
          penthouseCount > 1
            ? "Choose 702 or 830. Eight of you get the whole penthouse, and nobody else stays in it."
            : "Eight of you get the whole penthouse, and nobody else stays in it.",
      }
    : { group: null, groupNote: null };
}

/** How many of these packages are penthouses, for tierGrouping. */
export function countPenthouses(tiers: { name: string }[]): number {
  return tiers.filter((tier) => roomKeyFor(tier.name) === "PENTHOUSE").length;
}

/**
 * A penthouse another group has booked. For now that is the tier being full,
 * which is what a whole-group booking of eight makes it; the reservation
 * logic that decides it properly (a group code getting back in) replaces this.
 */
export function isTaken(tierName: string, spotsLeft: number | null): boolean {
  return roomKeyFor(tierName) === "PENTHOUSE" && spotsLeft !== null && spotsLeft <= 0;
}
