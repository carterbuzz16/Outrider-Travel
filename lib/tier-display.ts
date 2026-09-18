/**
 * The name a customer sees for a package.
 *
 * Tier names in the database are the team's working names, in capitals:
 * "BASE", "MID", "PENTHOUSE 702", "PENTHOUSE 830". Everything that matches on a
 * tier (room media, penthouse claims, group codes) keeps using those raw names;
 * this only changes what is printed on a customer-facing page or email. Admin
 * keeps the raw names.
 *
 * Kept out of lib/room-media.ts (which re-exports it) because that module is
 * server-only and the checkout form is a client component.
 */

const DISPLAY_NAMES: Record<string, string> = {
  BASE: "Four to a Room",
  MID: "Two to a Room",
  "PENTHOUSE 702": "Penthouse 702",
  "PENTHOUSE 830": "Penthouse 830",
  // The single top package the two penthouses replaced.
  TOP: "The Penthouse",
};

/** "Penthouse  702 " and "PENTHOUSE 702" are the same name. */
function normalise(name: string): string {
  return name.trim().replace(/\s+/g, " ").toUpperCase();
}

/** "BASE" becomes "Four to a Room"; a name this file does not know is title-cased. */
export function tierDisplayName(name: string): string {
  const known = DISPLAY_NAMES[normalise(name)];
  if (known) return known;
  return name
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
