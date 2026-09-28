import Link from "next/link";
import { Reveal } from "@/components/ui";
import { NOT_INCLUDED_NOTE, TRIP_WHAT_YOU_GET } from "@/lib/site-content";

/**
 * "What you get", on a Telluride departure page, between the masthead and the
 * rooms, so everything a package comes with is in front of people before any
 * price. The owner's direction (September 2026): one plain list of
 * everything, ski-in, ski-out first. A first version with a slogan, a club
 * blue stat band and event photographs was turned down; the photos read as
 * blurry on a phone. Copy and its sources are in TRIP_WHAT_YOU_GET.
 *
 * One column on a phone, two from sm. Each line is a bold name and one short
 * sentence, so a thumb scroll reads the names alone. Server-rendered, static.
 */
export default function WhatYouGet({ nights }: { nights: number }) {
  const nightsLabel = `${nights} ${nights === 1 ? "night" : "nights"}`;

  return (
    <section aria-labelledby="get-heading">
      <div className="shell py-16 md:py-24">
        <Reveal>
          <div className="flex flex-col gap-5">
            <p className="t-rule-label text-[--text]">What you get</p>
            <h2 id="get-heading" className="t-title max-w-[18ch] text-[--text]">
              Everything in every package
            </h2>
          </div>
        </Reveal>

        <Reveal>
          <ul className="m-0 mt-10 grid list-none gap-x-10 border-t border-[--rule-strong] p-0 sm:grid-cols-2 md:mt-12">
            {TRIP_WHAT_YOU_GET.map((item) => (
              <li key={item.title} className="flex gap-4 border-b border-[--rule] py-4">
                {/* A marker, not text, so club blue's 2.2:1 on paper carries
                    no meaning here. */}
                <span aria-hidden="true" className="mt-[0.45em] h-2 w-2 shrink-0 bg-club" />
                <div className="min-w-0">
                  <p className="m-0 font-display text-body font-medium leading-snug text-[--text]">{item.title}</p>
                  <p className="m-0 mt-1 font-body text-body-s leading-[1.55] text-[--text-secondary]">
                    {item.body.replace("{nights}", nightsLabel)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-5 font-body text-body-s leading-[1.7] text-[--text-secondary]">
            {NOT_INCLUDED_NOTE}{" "}
            <Link href="/flights" className="text-[--accent] underline underline-offset-4">
              Read the flight guide
            </Link>
            .
          </p>
        </Reveal>
      </div>
    </section>
  );
}
