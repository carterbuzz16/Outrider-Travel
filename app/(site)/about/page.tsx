import type { Metadata } from "next";
import Image from "next/image";
import { Button, ComparisonTable, Plate, Reveal, SectionDivider } from "@/components/ui";
import { FOUNDER, ORIGIN, PARTNER } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "About",
  description:
    "Why Outrider exists, and who runs it. An outrider is the one who rides ahead, scouts the route and clears the way before the party arrives.",
};

export default function AboutPage() {
  const hasFounderStory = FOUNDER.bio.length > 0;
  const hasPartnerCopy = PARTNER.confirmed && PARTNER.body.length > 0;

  return (
    <main className="scheme-light scheme-paint">
      {/* ---- opening ------------------------------------------------------
          The definition of the word is the whole thesis, so it opens the page
          rather than sitting in a paragraph three screens down. */}
      <header className="shell pt-32 md:pt-40">
        <h1 className="t-display mt-6 max-w-[12ch] text-[--text]">{ORIGIN.title}</h1>
        <p className="t-lede mt-10 max-w-measure">{ORIGIN.lede}</p>
      </header>

      {/* ---- full-bleed band ----------------------------------------------
          Deliberately edge to edge and tall: it is the one moment on this page
          that should feel like the mountain rather than like a document. */}
      <div className="relative mt-12 h-[30vh] min-h-[210px] w-full overflow-hidden md:mt-24 md:h-[62vh]">
        <Image
          src="/images/telluride/ridge.jpg"
          alt="A guide on the ridge above Telluride, first light."
          fill
          sizes="100vw"
          className="object-cover"
        />
      </div>

      {/* ---- why it exists -------------------------------------------------- */}
      <section id="why" className="shell py-20 md:py-28">
        <div className="grid gap-12 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:gap-20">
          <Reveal>
            <div className="flex items-baseline gap-5 md:sticky md:top-32">
              <h2 className="t-heading text-[--accent]">The problem</h2>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div className="flex flex-col gap-7">
              {ORIGIN.body.map((paragraph, i) => (
                <p
                  key={paragraph.slice(0, 32)}
                  className={
                    i === 0
                      ? "font-body text-lede leading-[1.8] text-[--text]"
                      : "font-body text-body leading-[1.85] text-[--text]"
                  }
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </Reveal>
        </div>

        {/* The same argument laid out side by side, for anyone who skims.
            Full content width: this is the section people screenshot. */}
        <Reveal>
          <div className="mt-8">
            <ComparisonTable />
          </div>
        </Reveal>
      </section>

      <SectionDivider variant="rule" className="shell" />

      {/* ---- leadership ------------------------------------------------------
          Given its own section rather than a footnote under the origin story:
          this is a founder-led company and the person is the credential. */}
      {hasFounderStory && FOUNDER.name && (
        <section id="leadership" className="shell py-20 md:py-28">
          <Reveal>
            <div>
              <span className="stamp-type text-[--text-muted]">Leadership</span>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-12 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-start md:gap-20">
            <Reveal>
              <figure className="m-0 flex flex-col gap-5">
                <Plate
                  image={FOUNDER.portrait}
                  ratio="aspect-[4/5]"
                  sizes="(min-width: 768px) 42vw, 100vw"
                />
                <figcaption className="border-t border-[--rule] pt-5">
                  <p className="t-subheading text-[--text]">{FOUNDER.name}</p>
                  <p className="t-micro mt-2.5 text-[--accent]">{FOUNDER.role}</p>
                </figcaption>
              </figure>
            </Reveal>

            <Reveal delay={90}>
              <div className="flex flex-col gap-8">
                {/* His own sentence, pulled up so the section leads with the
                    reason rather than with biography. */}
                <blockquote className="m-0 border-l-2 border-[--accent] pl-6">
                  <p className="font-display text-display-s leading-[1.3] tracking-title text-[--text]">
                    &ldquo;{FOUNDER.pullQuote}&rdquo;
                  </p>
                </blockquote>

                {/* Quote, then everything else folded away. The story and the
                    longer bio are one continuous read, so they share a single
                    disclosure rather than splitting across two. */}
                {/* One line stays visible so the section is not just a quote
                    and a toggle. The rest is behind the disclosure. */}
                <p className="font-body text-body leading-[1.85] text-[--text]">
                  {FOUNDER.bio[0]}
                </p>

                <details className="group border-t border-[--rule] pt-6">
                  <summary
                    className={[
                      "flex cursor-pointer list-none items-center gap-3 py-1",
                      "t-label text-[--accent] transition-colors duration-fast",
                      "hover:text-[--text] [&::-webkit-details-marker]:hidden",
                    ].join(" ")}
                  >
                    <span className="group-open:hidden">Read Carter&rsquo;s bio</span>
                    <span className="hidden group-open:inline">Close</span>
                    <span
                      aria-hidden="true"
                      className="transition-transform duration-fast group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>

                  <div className="mt-6 flex flex-col gap-6">
                    {FOUNDER.bio.slice(1).map((paragraph) => (
                      <p
                        key={paragraph.slice(0, 32)}
                        className="font-body text-body leading-[1.85] text-[--text-secondary]"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </details>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      <SectionDivider variant="rule" className="shell" />

      {/* ---- partner --------------------------------------------------------- */}
      <section id="partner" className="shell py-20 md:py-28">
        <Reveal>
          <div>
            <span className="stamp-type text-[--text-muted]">{PARTNER.eyebrow}</span>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-12 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:gap-20">
          <Reveal>
            <div className="flex flex-col gap-6">
              {/* Their mark, in their own green, on a white panel. A partner
                  logo is not ours to recolour, and the white plate keeps the
                  supplied artwork's own background from reading as a slightly
                  wrong white against the page's warm paper. */}
              <a
                href={PARTNER.url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex w-fit border border-[--rule] bg-white px-10 py-9 transition-colors duration-fast hover:border-[--rule-strong] md:px-12 md:py-11"
              >
                <Image
                  src="/images/partners/chptr.png"
                  alt={`${PARTNER.name} logo`}
                  width={554}
                  height={207}
                  className="h-14 w-auto md:h-20"
                />
              </a>
              <a
                href={PARTNER.url}
                target="_blank"
                rel="noreferrer noopener"
                className="t-micro text-[--accent] no-underline transition-colors duration-fast hover:text-[--text] inline-block py-2 -my-2"
              >
                chptr.house
              </a>
            </div>
          </Reveal>

          <Reveal delay={90}>
            {hasPartnerCopy && (
              <div className="flex flex-col gap-6">
                {PARTNER.body.map((paragraph) => (
                  <p
                    key={paragraph.slice(0, 32)}
                    className="font-body text-body leading-[1.85] text-[--text-secondary]"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            )}
          </Reveal>
        </div>
      </section>

      {/* ---- close ----------------------------------------------------------- */}
      <section className="scheme-charcoal scheme-paint">
        <div className="shell flex flex-col items-start gap-8 py-16 md:flex-row md:items-center md:justify-between md:py-24">
          <h2 className="t-heading max-w-[18ch] text-[--text]">
            Two departures. Both small. Both already moving.
          </h2>
          <div className="flex flex-wrap gap-4">
            <Button href="/trips" variant="primary" size="lg">
              View trips
            </Button>
            <Button href="/contact" variant="secondary" size="lg">
              Ask a question
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
