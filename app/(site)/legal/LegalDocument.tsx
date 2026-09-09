import { Reveal, SectionDivider, cn } from "@/components/ui";
import { CONTACT, LEGAL_NAME } from "@/lib/site-content";
import {
  formatLegalDate,
  sectionNumber,
  type LegalDocumentMeta,
} from "@/lib/legal";
import HashScroll from "./HashScroll";

/**
 * The shell every legal document is rendered in.
 *
 * Deliberately the plainest thing on the site. No stamp, no ticket stub, no
 * photo plate, no display type, a policy page has exactly one job, which is to
 * be read and understood, and the ephemera that carries the marketing pages
 * would be actively in the way here. What is left is the design system's
 * typographic layer: mono for headings and labels, the body serif at a
 * generous 1.85 line-height, held to `max-w-measure` so no line runs past 68
 * characters.
 *
 * Structure comes from lib/legal.ts. The contents list and the section numbers
 * are both generated from the same `sections` array, so a heading cannot drift
 * out of the contents and a section number cannot be wrong.
 */

/* Typography for the prose inside a section. Paragraphs and headings are
   written as plain <p> and <h3> by the pages; the container styles them, which
   keeps the documents themselves readable as documents. */
const PROSE = cn(
  "max-w-measure space-y-5 font-body text-body leading-[1.85] text-[--text-secondary]",
  "[&_h3]:pt-4 [&_h3]:font-display [&_h3]:text-body-s [&_h3]:uppercase [&_h3]:tracking-label [&_h3]:text-[--text]",
  "[&_strong]:font-semibold [&_strong]:text-[--text]",
  "[&_a]:text-[--accent]",
);

export default function LegalDocument({
  doc,
  children,
}: {
  doc: LegalDocumentMeta;
  children: React.ReactNode;
}) {
  return (
    <main className="scheme-light scheme-paint">
      <HashScroll />

      <header className="shell pb-10 pt-32 md:pb-14 md:pt-40">
        <Reveal>
          <p className="t-micro text-[--text-secondary]">Legal</p>
          {/* t-heading, not t-display: the title should announce the document,
              not compete with the clause it sits above. */}
          <h1 className="t-heading mt-5 max-w-[22ch] text-[--text]">{doc.title}</h1>
        </Reveal>

        <Reveal delay={80}>
          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-5">
            <Meta term="Version" value={doc.version} />
            <Meta
              term="Status"
              value={"In force"}
            />
            <Meta term="Effective" value={formatLegalDate(doc.effectiveDate)} />
            <Meta term="Last updated" value={formatLegalDate(doc.lastUpdated)} />
          </dl>
        </Reveal>
      </header>

      <SectionDivider variant="rule" className="shell" />

      {/* ---- contents ------------------------------------------------------ */}
      <nav aria-labelledby="contents-heading" className="shell py-12 md:py-16">
        <Reveal>
          <h2 id="contents-heading" className="t-micro text-[--text-muted]">
            Contents
          </h2>
          <ol className="mt-6 grid list-none grid-cols-1 gap-x-12 gap-y-3 p-0 md:grid-cols-2">
            {doc.sections.map((section, index) => (
              <li key={section.id} className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="w-6 shrink-0 pt-[0.3em] font-mono text-micro tabular-nums text-[--text-muted]"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                {/* A plain anchor, not next/link: a hash-only Link goes
                    through the router, which in the App Router does not
                    reliably move the page. Native fragment navigation does. */}
                <a
                  href={`#${section.id}`}
                  className="font-body text-body-s leading-[1.6] text-[--text-secondary] no-underline transition-colors duration-fast hover:text-[--text]"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </Reveal>
      </nav>

      <SectionDivider variant="rule" className="shell" />

      {/* ---- the document -------------------------------------------------- */}
      <div className="shell flex flex-col gap-14 py-14 md:gap-16 md:py-20">
        {children}
      </div>

      <SectionDivider variant="rule" className="shell" />

      <section className="shell py-12 md:py-16">
        <div className="max-w-measure">
          <p className="t-micro text-[--text-muted]">
            {doc.shortTitle} · v{doc.version} · Last updated{" "}
            {formatLegalDate(doc.lastUpdated)}
          </p>
          <p className="mt-4 font-body text-body-s leading-[1.75] text-[--text-secondary]">
            Questions about this document, or a request about your own
            information, go to{" "}
            <a href={`mailto:${CONTACT.email}`} className="text-[--accent]">
              {CONTACT.email}
            </a>
            . {LEGAL_NAME} is based in {CONTACT.base}.
          </p>
        </div>
      </section>
    </main>
  );
}

function Meta({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt className="stamp-type text-[--text-muted]">{term}</dt>
      <dd className="mt-2 font-body text-body-s text-[--text]">{value}</dd>
    </div>
  );
}

/**
 * One numbered section. `id` must be registered on the document in
 * lib/legal.ts, `sectionNumber` throws at render time if it is not, which
 * turns a silent contents/body mismatch into a loud build failure.
 */
export function LegalSection({
  doc,
  id,
  children,
}: {
  doc: LegalDocumentMeta;
  id: string;
  children: React.ReactNode;
}) {
  const number = sectionNumber(doc, id);
  const title = doc.sections[number - 1].title;

  return (
    // scroll-mt clears the fixed nav when the reader arrives from the contents
    // list or from a #fragment link elsewhere on the site.
    <section id={id} className="scroll-mt-28 md:scroll-mt-32">
      <h2 className="t-subheading flex max-w-[36ch] gap-4 text-[--text]">
        <span aria-hidden="true" className="shrink-0 font-mono text-micro tabular-nums text-[--text-muted]">
          {String(number).padStart(2, "0")}
        </span>
        <span>{title}</span>
      </h2>
      <div className={cn(PROSE, "mt-6")}>{children}</div>
    </section>
  );
}

/**
 * A bulleted list inside a section. Square markers rather than discs, set on
 * the hairline colour, the same graphic vocabulary as the rest of the system.
 */
export function LegalList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="flex list-none flex-col gap-3 p-0">
      {items.map((item, index) => (
        <li key={index} className="relative pl-6">
          <span
            aria-hidden="true"
            className="absolute left-0 top-[0.72em] h-1 w-1 bg-[--rule-strong]"
          />
          {item}
        </li>
      ))}
    </ul>
  );
}
