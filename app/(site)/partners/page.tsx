import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button, CampusMarquee, Logo, Reveal } from "@/components/ui";
import { pageMetadata } from "@/lib/metadata";
import { PARTNERS, TRIP_SPONSORS } from "@/lib/site-content";
import { SKI, SPRING_BREAK_LINE, type TripLine } from "@/lib/trip-lines";

export const metadata: Metadata = pageMetadata({
  title: "For brands",
  path: "/partners",
  description:
    "Sponsor the Outrider Ski Club and the Outrider Beach Club: small, hosted trips for college students, with people on campus across the country.",
});

/*
 * /partners, for brands (Carter, 3 November 2026: the clubs are how we "do brand
 * deals and sponsorships"). Linked from the footer, not the nav: visitors booking
 * a trip are not who it is for.
 *
 * The page says only what we can back: the two clubs, the campuses, and the one
 * real sponsor. No traveler or reach numbers until the bookings can stand behind
 * them. Copy and the draft placements are in PARTNERS (lib/site-content.ts).
 */

const CLUBS: { line: TripLine; scheme: string; image: { src: string; alt: string; position: string } }[] = [
  {
    line: SKI,
    scheme: "scheme-club",
    image: {
      src: "/images/people/friends-snow-throw.jpg",
      alt: "Four friends on skis, arms linked, laughing as someone throws a handful of powder at them in falling snow.",
      position: "50% 15%",
    },
  },
  {
    line: SPRING_BREAK_LINE,
    scheme: "scheme-spring",
    image: {
      src: "/images/spring/zemi-aerial.jpg",
      alt: "Zemi Miches from above: the pools and palm trees running down to a sandy beach, with a calm bay and green mountains behind.",
      position: "70% 50%",
    },
  },
];

export default function PartnersPage() {
  return (
    <main className="scheme-light scheme-paint">
      <header className="shell pb-14 pt-32 md:pb-20 md:pt-40">
        <p className="t-label text-[--text-secondary]">{PARTNERS.label}</p>
        <h1 className="t-display mt-6 max-w-[14ch] text-[--text]">{PARTNERS.headline}</h1>
        <p className="t-lede mt-8 max-w-measure">{PARTNERS.lede}</p>
      </header>

      <section className="grid md:grid-cols-2" aria-label={PARTNERS.clubsTitle}>
        {CLUBS.map(({ line, scheme, image }) => (
          <Link key={line.id} href={line.path} className="group flex flex-col no-underline">
            <div className="relative aspect-[4/3] overflow-hidden bg-[--color-espresso-deep]">
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                style={{ objectPosition: image.position }}
              />
            </div>
            <div className={`${scheme} scheme-paint flex-1 p-8 md:p-12`}>
              <Logo variant={line.clubLogo} width={`${17 * line.clubLogoRatio}rem`} className="max-w-full text-[--text]" />
              <p className="t-heading m-0 mt-6 text-[--text]">
                {line.place}, at {line.property}
              </p>
            </div>
          </Link>
        ))}
      </section>

      <CampusMarquee />

      <section className="scheme-stone scheme-paint" aria-labelledby="placements-heading">
        <div className="shell py-16 md:py-24">
          <h2 id="placements-heading" className="t-title max-w-[16ch] text-[--text]">
            {PARTNERS.placementsTitle}
          </h2>
          <ul className="m-0 mt-10 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-4">
            {PARTNERS.placements.map((placement, i) => (
              <Reveal as="li" key={placement.title} delay={i * 70}>
                <div className="flex h-full flex-col gap-3 bg-[--surface-raised] p-6 md:p-8">
                  <h3 className="t-heading m-0 text-[--text]">{placement.title}</h3>
                  <p className="m-0 font-body text-body leading-[1.6] text-[--text-secondary]">{placement.body}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <section className="shell py-16 md:py-24" aria-labelledby="example-heading">
        <h2 id="example-heading" className="t-label m-0 text-[--text-secondary]">
          {PARTNERS.exampleTitle}
        </h2>
        <ul className="m-0 mt-8 flex list-none flex-col gap-8 p-0">
          {TRIP_SPONSORS.map((sponsor) => (
            <li key={sponsor.name} className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-10">
              <Image
                src={sponsor.logo.src}
                alt={sponsor.name}
                width={sponsor.logo.width}
                height={sponsor.logo.height}
                className="h-auto w-32"
              />
              <p className="t-lede m-0 max-w-measure text-[--text]">
                {sponsor.supplies}, on the {SKI.club}.
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="scheme-espresso scheme-paint" aria-labelledby="partners-cta">
        <div className="shell flex flex-col items-start gap-8 py-16 md:py-24">
          <h2 id="partners-cta" className="t-title max-w-[18ch] text-[--text]">
            {PARTNERS.ctaTitle}
          </h2>
          <Button href="/contact" variant="primary" size="lg">
            {PARTNERS.cta}
          </Button>
        </div>
      </section>
    </main>
  );
}
