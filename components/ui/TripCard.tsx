import Image from "next/image";
import Link from "next/link";
import { cn } from "./cn";
import { BOOKINGS_OPEN, COMING_SOON_LABEL, TRIP_DETAILS_OPEN } from "@/lib/booking-window";
import { OutriderMark } from "./Logo";
import Badge, { StatusBadge, type TripStatus } from "./Badge";

/**
 * Trip card — the one component that carries the most weight on the site, so
 * it's built as an editorial plate rather than a product tile.
 *
 * Structure, top to bottom: a stamped record number and status across a
 * hairline header, the photograph, then the destination eyebrow, the trip
 * name in display mono, a short serif line, and a ruled meta strip. The whole
 * card is one link; the hover moves nothing but the image, which drifts up 2%
 * over 620ms.
 *
 * Images go through next/image — local files under /public work as-is, a
 * remote host needs adding to `images.remotePatterns` in next.config.mjs.
 */

export type Trip = {
  name: string;
  destination: string;
  /** Human copy, not a date object: "Feb 12–17, 2027". */
  dates: string;
  /** Pre-formatted, including the currency: "$4,850". */
  price?: string;
  /** One sentence. Anything longer belongs on the trip page. */
  summary?: string;
  status?: TripStatus;
  image?: { src: string; alt: string };
  href: string;
};

export default function TripCard({
  trip,
  /** `feature` gives the image a taller crop for the lead slot in a grid. */
  feature = false,
  className,
}: {
  trip: Trip;
  feature?: boolean;
  className?: string;
}) {
  const { name, destination, dates, price, summary, status, image, href } = trip;

  return (
    <article
      className={cn(
        "relative flex flex-col border border-[--rule] bg-[--surface-raised]",
        "transition-colors duration-[--dur] ease-out hover:border-[--rule-strong]",
        className,
      )}
    >
      {/* Header strip: record number left, status right, ruled off underneath. */}
      <div className="flex items-center justify-between gap-3 border-b border-[--rule] px-4 py-3">
        <span className="stamp-type text-[--text-muted]">
          {destination}
        </span>
        {!BOOKINGS_OPEN ? (
          <Badge tone="neutral">{COMING_SOON_LABEL}</Badge>
        ) : (
          status && <StatusBadge status={status} />
        )}
      </div>

      <div
        className={cn(
          "relative w-full overflow-hidden bg-[--color-teal]",
          feature ? "aspect-[4/5]" : "aspect-[4/3]",
        )}
      >
        {image ? (
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-slow ease-out group-hover:scale-[1.02]"
          />
        ) : (
          // No photograph yet: a teal plate with the mark, which is a decent
          // placeholder rather than a grey box with a broken-image glyph.
          <div className="grid h-full w-full place-items-center">
            <OutriderMark className="w-16 text-[--color-cream] opacity-30" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 px-4 pb-4 pt-5">
        <p className="t-micro text-[--text-secondary]">{destination}</p>

        <h3 className="t-subheading text-[--text]">
          {TRIP_DETAILS_OPEN ? (
            /* The stretched link: the whole card is the hit area, but only the
               trip name is announced as the link text. */
            <Link href={href} className="no-underline after:absolute after:inset-0">
              {name}
            </Link>
          ) : (
            /* Before launch the card is a teaser, not a door. Plain text rather
               than a disabled link, so nothing invites a click that goes
               nowhere. */
            name
          )}
        </h3>

        {summary && (
          <p className="font-body text-body-s leading-[1.65] text-[--text-secondary]">
            {summary}
          </p>
        )}

        <div className="mt-auto flex items-baseline justify-between gap-4 border-t border-[--rule-faint] pt-3.5">
          <span className="t-micro text-[--text-secondary]">{dates}</span>
          {price && (
            <span className="font-display text-label tracking-title text-[--text]">
              {price}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
