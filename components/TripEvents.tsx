import { Badge, Plate, Reveal } from "@/components/ui";
import type { TripEvent } from "@/lib/site-content";

/*
 * The private events, as a grid of photographs with a line or two each.
 *
 * Shared by /telluride (#events) and the home page, so the two cannot describe
 * the week differently. Copy and photos live in TELLURIDE_EVENTS; this only
 * lays them out. Scheme-agnostic: it reads the semantic tokens, so it sits on
 * paper or espresso without changes.
 *
 * One row of four on a laptop, two by two on a tablet, stacked on a phone.
 * Portrait crops keep the row short: the page asked for less scrolling, and
 * four landscape frames stacked two by two were most of a screen each.
 */
export default function TripEvents({
  events,
  className,
}: {
  events: TripEvent[];
  className?: string;
}) {
  return (
    <ul className={`m-0 grid list-none gap-x-6 gap-y-12 p-0 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-8 ${className ?? ""}`}>
      {events.map((event, i) => (
        <Reveal as="li" key={event.title} delay={(i % 4) * 80} className="flex flex-col gap-5">
          <div className="relative">
            <Plate
              image={event.image}
              ratio="aspect-[4/3] lg:aspect-[4/5]"
              sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 100vw"
              position={event.position}
            />
            {event.teaser && (
              // On the photograph rather than in the text, so the card still
              // reads as a real event and the "not yet" is a label on it.
              // Sits on its own paper chip: the photo under it is dark.
              <span className="scheme-light absolute left-4 top-4">
                <Badge tone="new">Announced soon</Badge>
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2.5">
            <p className="t-micro text-[--accent]">{event.when}</p>
            <h3 className="t-subheading text-[--text]">{event.title}</h3>
            <p className="max-w-measure font-body text-body-s leading-[1.7] text-[--text-secondary]">
              {event.body}
            </p>
          </div>
        </Reveal>
      ))}
    </ul>
  );
}
