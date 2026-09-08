/**
 * A single calendar day, formatted the way lib/trips.ts formats a range.
 *
 * lib/trips.ts owns date formatting for the public site, but everything it
 * exports is a *range* (`formatDateRange`) — and a range of one day renders as
 * "Mar 4–4, 2027". Installment due dates are single days, so they need this.
 * Kept next to the pages that use it rather than added to lib/trips.ts, which
 * is public-trip reads and is not the account area's to grow.
 *
 * The `T00:00:00` matters: a bare `new Date("2027-03-04")` is parsed as UTC
 * midnight and renders as the 3rd anywhere west of Greenwich. Appending a time
 * with no zone makes it local midnight, which is the day the column means.
 */
export function formatDay(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
