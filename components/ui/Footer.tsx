import Link from "next/link";
import Logo from "./Logo";
import Button from "./Button";
import SectionDivider from "./SectionDivider";
import { ACCOUNT_LINK } from "./nav-links";
import { CONTACT, LEGAL_NAME } from "@/lib/site-content";
import { LEGAL_DOCUMENTS } from "@/lib/legal";

/**
 * Footer — the back of the ticket.
 *
 * Set on forest, opened with a perforation, and organised like the reverse of
 * a printed travel document: the lockup and the definition of the name on the
 * left, three short link columns, then a ruled-off line of fine print with the
 * stamped issue line at the far right.
 */

type Column = {
  heading: string;
  links: { label: string; href: string; external?: boolean }[];
};

const COLUMNS: Column[] = [
  {
    heading: "Trips",
    links: [
      { label: "All departures", href: "/trips" },
      { label: "About Outrider", href: "/about" },
      { label: "Contact", href: "/contact" },
      // Same href as the nav's account entry, so there is one way in and it
      // behaves identically from either end of the page.
      { label: ACCOUNT_LINK.label, href: ACCOUNT_LINK.href },
    ],
  },
  {
    // Titles come from the register in lib/legal.ts so a renamed document
    // renames itself here. The cancellation link is deliberately a fragment
    // into the Terms rather than its own page — see app/(site)/cancellation.
    heading: "Legal",
    links: [
      ...LEGAL_DOCUMENTS.map((doc) => ({
        label: doc.shortTitle,
        href: `/${doc.slug}`,
      })),
      { label: "Cancellation & refunds", href: "/terms#cancellation" },
    ],
  },
  {
    heading: "Elsewhere",
    links: [
      { label: "Instagram", href: CONTACT.instagram, external: true },
      { label: CONTACT.email, href: `mailto:${CONTACT.email}`, external: true },
    ],
  },
];

export default function Footer({
  columns = COLUMNS,
  /** Replace the default CTA block — e.g. drop a live waitlist form in. */
  signup,
}: {
  columns?: Column[];
  signup?: React.ReactNode;
}) {
  const year = new Date().getFullYear();

  return (
    <footer className="scheme-charcoal scheme-paint">
      <div className="shell">
        <SectionDivider variant="perforation" />

        <div className="grid gap-12 py-16 md:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)] md:py-20">
          <div className="flex flex-col gap-6">
            <Logo variant="lockup" className="w-40 items-start" />
            {/* The name, defined. It's the whole brief in one line, and it
                earns its place here rather than in a tagline slot. */}
            <p className="max-w-measure-tight font-body text-body-s leading-[1.75] text-[--text-secondary]">
              <span className="font-display uppercase tracking-label text-[--text]">
                Outrider
              </span>{" "}
              <span className="italic">noun.</span> One who rides ahead. Scouts the
              route, clears what is in the way, and has the ground ready before
              anyone else arrives.
            </p>

            <div className="pt-2">
              {signup ?? (
                <Button href="/contact" variant="secondary" size="sm">
                  Get in touch
                </Button>
              )}
            </div>
          </div>

          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3"
          >
            {columns.map((column) => (
              <div key={column.heading} className="flex flex-col gap-4">
                <h2 className="t-micro text-[--text-muted]">{column.heading}</h2>
                <ul className="flex list-none flex-col gap-3 p-0">
                  {column.links.map((link) => {
                    const style =
                      // py/-my grows the tap target past the 24px floor without shifting
                      // anything: WCAG 2.2 SC 2.5.8, and these are thumb targets.
                      "font-body text-body-s text-[--text-secondary] no-underline transition-colors duration-fast hover:text-[--text] break-words inline-block py-1.5 -my-1.5";
                    return (
                      <li key={link.href}>
                        {link.external ? (
                          // mailto: and off-site URLs must not go through the
                          // client router.
                          <a
                            href={link.href}
                            className={style}
                            {...(link.href.startsWith("http")
                              ? { target: "_blank", rel: "noreferrer noopener" }
                              : {})}
                          >
                            {link.label}
                          </a>
                        ) : (
                          <Link href={link.href} className={style}>
                            {link.label}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="border-t border-[--rule] py-7">
          <p className="stamp-type text-[--text-muted]">
            © {year} {LEGAL_NAME}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
