import type { Metadata } from "next";
import Link from "next/link";
import { Button, HeroSlideshow, Reveal, SplitHeading, WaitlistCTA } from "@/components/ui";
import { pageMetadata } from "@/lib/metadata";
import { SPRING_BREAK, SPRING_BREAK_PLACEMENT } from "@/lib/site-content";

export const metadata: Metadata = pageMetadata({
  title: "Spring break 2027",
  path: "/spring-break",
  description:
    "Outrider Spring Break Club: spring break 2027 for college students, somewhere warm, hosted the way we host Telluride. Get on the list and hear where first.",
});

/*
 * /spring-break, 1 October 2026. Carter found that the home page's spring
 * break panel opened the Telluride-branded list. There is one list for
 * everyone, but this is its spring break door, branded "Outrider Spring Break
 * Club": the palm photograph he picked, a few words, and the form. A signup
 * here carries placement "spring-break", which gets the spring break welcome
 * email rather than the Telluride one (app/waitlist-actions.ts).
 *
 * No destination, dates or price exist yet, so none appear. Same masthead
 * build as the home page: a full-resolution photograph easing in, the one
 * Extrabold headline, fades at the top and foot rather than an even scrim.
 */
export default function SpringBreakPage() {
  return (
    <>
      <section
        className="scheme-espresso relative isolate flex min-h-[88svh] flex-col justify-end overflow-hidden bg-[--color-espresso-deep]"
        aria-labelledby="spring-headline"
      >
        <div className="absolute inset-0 -z-10">
          <HeroSlideshow
            slides={[
              {
                src: "/images/spring/palm-tower.jpg",
                alt: "A palm tree arching over a pink Mediterranean-style tower against a bright, cloudy sky.",
                position: "55% 40%",
                mobilePosition: "60% 40%",
              },
            ]}
          />
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-[rgb(42_35_32_/_0.55)] to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[80%] bg-gradient-to-t from-[rgb(31_26_23_/_0.92)] via-[rgb(31_26_23_/_0.66)] to-transparent"
        />
        {/* The palm photograph is mostly bright sky, so the words also get a
            fade from the left, as on the home page (small text needs 4.5:1). */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 -z-10 hidden w-[62%] bg-gradient-to-r from-[rgb(31_26_23_/_0.55)] to-transparent md:block"
        />
        <div className="shell pb-14 pt-40 md:pb-20">
          <p className="t-label text-[--text]">{SPRING_BREAK.club}</p>
          <SplitHeading
            as="h1"
            id="spring-headline"
            text={SPRING_BREAK.headline}
            onLoad
            delay={200}
            className="mt-5 font-display text-[clamp(3rem,8vw,7.5rem)] font-extrabold uppercase leading-[0.9] tracking-display text-[--text]"
          />
          <p className="m-0 mt-6 font-body text-lede leading-snug text-[--text]">{SPRING_BREAK.tagline}</p>
          <div className="mt-8">
            <Button href="#join" variant="primary" size="lg">
              Join the list
            </Button>
          </div>
        </div>
      </section>

      <main className="scheme-light scheme-paint">
        <section className="shell py-20 md:py-28" aria-labelledby="spring-pitch">
          <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-end md:gap-16">
            <SplitHeading id="spring-pitch" text={SPRING_BREAK.pitchTitle} className="t-title max-w-[14ch] text-[--text]" />
            <Reveal delay={120}>
              <p className="t-lede m-0 max-w-[40ch] text-[--text-secondary]">{SPRING_BREAK.pitch}</p>
              <p className="m-0 mt-6">
                <Link
                  href="/telluride"
                  className="t-label inline-flex items-center gap-2 text-[--text] underline decoration-1 underline-offset-[6px] transition-colors duration-fast hover:text-[--accent]"
                >
                  Can&rsquo;t wait? Ski Telluride this winter <span aria-hidden="true">&rarr;</span>
                </Link>
              </p>
            </Reveal>
          </div>
        </section>

        <WaitlistCTA
          id="join"
          tone="dark"
          placement={SPRING_BREAK_PLACEMENT}
          heading={SPRING_BREAK.formHeading}
          body={SPRING_BREAK.formBody}
          doneHeading={SPRING_BREAK.doneHeading}
          doneBody={SPRING_BREAK.doneBody}
          sharePath="/spring-break"
          shareText={SPRING_BREAK.shareText}
        />
      </main>
    </>
  );
}
