import { cn } from "./cn";

/**
 * The bordered cell grid, in one place.
 *
 * These grids paint a rule colour behind a 1px gap, so the "lines" between
 * cells are the background showing through. That is why a missing cell is not
 * blank: it is a flat grey rectangle the width of a column, and it reads as a
 * broken image rather than as empty space.
 *
 * It has now been got wrong three times, in three different files, each time
 * because the number of items changed after the layout was written: two trips
 * in a three-column grid, one category in a two-column grid, three cards in a
 * two-column grid. The count is the thing that decides the layout, so it lives
 * here rather than being re-derived at each call site.
 */

/** Container classes. Collapses to one column rather than leaving a hole. */
export function cellGridClass(count: number, className?: string): string {
  return cn(
    "grid gap-px border border-[--rule] bg-[--rule]",
    count > 1 && "md:grid-cols-2",
    className,
  );
}

/**
 * Classes for one cell. An odd count would leave the final column empty, so
 * the last card takes the whole row instead.
 */
export function cellSpanClass(index: number, count: number): string | undefined {
  const isLast = index === count - 1;
  const odd = count % 2 === 1;
  return count > 1 && odd && isLast ? "md:col-span-2" : undefined;
}
