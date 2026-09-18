import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";

/**
 * The rooms at The Peaks Resort behind each package, and their photographs.
 *
 * The owner's brief: people should see what they are getting for each tier,
 * the penthouse above all. The package names and prices live in the database
 * (edited in /admin); this is the room-level detail the database has no
 * column for, keyed by the tier's name. The DB names are "BASE", "MID" and
 * "TOP"; matching ignores case and surrounding space, and a tier with any
 * other name simply gets no room panel.
 *
 * The facts here restate TELLURIDE_ROOMS in lib/site-content.ts (as of
 * September 2026: BASE and MID share the same Two King room, four people or
 * two; TOP is a private suite taken whole for six or eight). If the rooming
 * changes, change both, and COMPARISON, VALUE_PROPS and the FAQ with them.
 *
 * ---------------------------------------------------------------------------
 * PHOTOGRAPHS: the owner will supply these. Drop them in public/images/peaks/
 * with exactly these names (public/images/peaks/README.md says the same):
 *
 *   base-1.jpg   BASE hero: the Two King room made up for four
 *   base-2.jpg   BASE: its bathroom
 *   mid-1.jpg    MID hero: the same Two King room, made up for two
 *   mid-2.jpg    MID: the spa at The Peaks
 *   top-1.jpg    TOP hero: the suite / penthouse living room
 *   top-2.jpg    TOP: the view from its windows
 *   top-3.jpg    TOP: a bedroom
 *   top-4.jpg    TOP: a second bedroom
 *   top-5.jpg    TOP: the kitchen and dining table (the private chef dinner)
 *   top-6.jpg    TOP: a bathroom
 *   top-7.jpg    TOP: the terrace or hot tub, if the suite has one
 *
 * Landscape 3:2, 2400px wide, JPEG. The first photo of each tier is its hero
 * and the image on its package card at checkout, so it should be the room at
 * its best, shot wide. The alt text below describes the shot asked for; when
 * the real photographs arrive, reread each one and correct its alt to what is
 * actually in the frame.
 *
 * Only files that exist are returned, checked on the server at render time,
 * so a missing photo is never a broken image: a tier with none renders its
 * typographic panel instead (components/ui/RoomShowcase.tsx). On Vercel the
 * public folder is served from the CDN and is not in the server bundle, so
 * next.config.mjs traces public/images/peaks into the routes that call this;
 * a page added that uses it needs adding there too.
 * ---------------------------------------------------------------------------
 */

export type RoomKey = "BASE" | "MID" | "TOP";
export type RoomPhoto = { src: string; alt: string };
export type RoomFact = { label: string; value: string };

export type RoomMedia = {
  key: RoomKey;
  /** "The Two King room" */
  title: string;
  /** One line for a package card: "Two King room, four to a room". */
  summary: string;
  /** What this room is, and what it adds over the one below it. */
  upgrade: string;
  /** The headline figure for the typographic panel: "4" over "to a room". */
  figure: { value: string; unit: string };
  facts: RoomFact[];
  /** Existing files only, hero first. Empty until the photographs arrive. */
  photos: RoomPhoto[];
};

const PROPERTY_FACT: RoomFact = { label: "Where", value: "The Peaks Resort, ski-in and ski-out" };

const ROOMS: Record<RoomKey, Omit<RoomMedia, "key" | "photos"> & { wanted: RoomPhoto[] }> = {
  BASE: {
    title: "The Two King room",
    summary: "Two King room, four to a room",
    upgrade:
      "Where every package starts. A Two King room at The Peaks, shared by four of you, two to a bed, with the rest of the group under the same roof.",
    figure: { value: "4", unit: "to a room" },
    facts: [
      { label: "Beds", value: "Two kings" },
      { label: "Sharing", value: "Four, two to a bed" },
      PROPERTY_FACT,
    ],
    wanted: [
      { src: "/images/peaks/base-1.jpg", alt: "A Two King room at The Peaks Resort, both beds made up." },
      { src: "/images/peaks/base-2.jpg", alt: "The bathroom of a Two King room at The Peaks Resort." },
    ],
  },
  MID: {
    title: "The Two King room, for two",
    summary: "Two King room, just two of you",
    upgrade:
      "The same Two King room with half the people in it, so each of you has a king bed of your own.",
    figure: { value: "2", unit: "to a room" },
    facts: [
      { label: "Beds", value: "Two kings" },
      { label: "Sharing", value: "Two, a king bed each" },
      PROPERTY_FACT,
    ],
    wanted: [
      { src: "/images/peaks/mid-1.jpg", alt: "A Two King room at The Peaks Resort, made up for two." },
      { src: "/images/peaks/mid-2.jpg", alt: "The spa at The Peaks Resort." },
    ],
  },
  TOP: {
    title: "The penthouse",
    summary: "Private suite or penthouse for your group",
    upgrade:
      "A private suite booked whole, for a group of six or eight who want the door to close on just them. Your own living room and kitchen, and nobody else's.",
    figure: { value: "6–8", unit: "your group only" },
    facts: [
      { label: "Sharing", value: "Your group of six or eight" },
      { label: "Booked", value: "Whole, for your group only" },
      PROPERTY_FACT,
    ],
    wanted: [
      { src: "/images/peaks/top-1.jpg", alt: "The living room of the suite at The Peaks Resort." },
      { src: "/images/peaks/top-2.jpg", alt: "The view of the San Juan peaks from the suite's windows." },
      { src: "/images/peaks/top-3.jpg", alt: "A bedroom in the suite." },
      { src: "/images/peaks/top-4.jpg", alt: "A second bedroom in the suite." },
      { src: "/images/peaks/top-5.jpg", alt: "The suite's kitchen and dining table, set for a private chef dinner." },
      { src: "/images/peaks/top-6.jpg", alt: "A bathroom in the suite." },
      { src: "/images/peaks/top-7.jpg", alt: "The suite's terrace." },
    ],
  },
};

/** Case and space insensitive, so "Top" and " TOP " both match. */
export function roomKeyFor(tierName: string): RoomKey | null {
  const key = tierName.trim().toUpperCase();
  return key in ROOMS ? (key as RoomKey) : null;
}

function fileExists(src: string): boolean {
  try {
    return existsSync(path.join(process.cwd(), "public", src));
  } catch {
    return false;
  }
}

/** The room behind a package, with only the photographs that exist, or null. */
export function getRoomMedia(tierName: string): RoomMedia | null {
  const key = roomKeyFor(tierName);
  if (!key) return null;
  const { wanted, ...room } = ROOMS[key];
  return { key, ...room, photos: wanted.filter((photo) => fileExists(photo.src)) };
}
