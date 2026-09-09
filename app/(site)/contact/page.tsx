import type { Metadata } from "next";
import { Reveal, SectionDivider } from "@/components/ui";
import { CONTACT } from "@/lib/site-content";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Ask about a departure, a group booking, or anything else. We answer every message within a day.",
};

export default function ContactPage() {
  return (
    <main className="scheme-light scheme-paint">
      <header className="shell pb-14 pt-32 md:pb-20 md:pt-40">
        <div>
          <h1 className="t-display mt-6 max-w-[13ch] text-[--text]">Get in touch</h1>
          <p className="t-lede mt-8 max-w-measure">
            Questions about a departure, a chapter or a group of friends who
            want to travel together, or something we have not thought of yet.
            All of it comes to the same place.
          </p>
        </div>
      </header>

      <SectionDivider variant="rule" className="shell" />

      <section className="shell py-16 md:py-24">
        <div className="grid gap-12 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:gap-20">
          {/* Not wrapped in Reveal: it is above the fold, and a .reveal sits at
              opacity 0 until hydration. See the motion note in globals.css. */}
          <ContactForm contactEmail={CONTACT.email} />

          <Reveal delay={90}>
            <aside className="flex flex-col gap-8">

              <div className="flex flex-col gap-2">
                <p className="stamp-type text-[--text-muted]">Email</p>
                <a
                  href={`mailto:${CONTACT.email}`}
                  className="font-display text-label tracking-title text-[--text] no-underline transition-colors duration-fast hover:text-[--accent] inline-block py-2 -my-2"
                >
                  {CONTACT.email}
                </a>
              </div>

              {CONTACT.phone && (
                <div className="flex flex-col gap-2">
                  <p className="stamp-type text-[--text-muted]">Phone</p>
                  <a
                    href={`tel:${CONTACT.phone.replace(/[^\d+]/g, "")}`}
                    className="font-display text-label tracking-title text-[--text] no-underline transition-colors duration-fast hover:text-[--accent] inline-block py-2 -my-2"
                  >
                    {CONTACT.phone}
                  </a>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <p className="stamp-type text-[--text-muted]">Instagram</p>
                <a
                  href={CONTACT.instagram}
                  className="font-display text-label tracking-title text-[--text] no-underline transition-colors duration-fast hover:text-[--accent] inline-block py-2 -my-2"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {CONTACT.instagramHandle}
                </a>
              </div>

              <hr className="perforation" />

              <div className="flex flex-col gap-2">
                <p className="stamp-type text-[--text-muted]">Based</p>
                <p className="font-body text-body-s text-[--text-secondary]">
                  {CONTACT.base}
                </p>
              </div>

              <p className="font-body text-body-s leading-[1.7] text-[--text-secondary]">
                {CONTACT.responseTime}
              </p>
            </aside>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
