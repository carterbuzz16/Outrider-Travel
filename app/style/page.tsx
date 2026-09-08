import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Alert,
  Badge,
  Button,
  Footer,
  Logo,
  NavBar,
  Reveal,
  SectionDivider,
  Stamp,
  StatusBadge,
  ToastProvider,
  TripCard,
  type Trip,
} from "@/components/ui";
import FormDemo from "./FormDemo";
import ToastDemo from "./ToastDemo";

export const metadata: Metadata = {
  title: "Design system",
  description: "The Outrider component library and token set.",
  robots: { index: false, follow: false },
};

/*
 * The styleguide is an internal reference, not part of the site.
 *
 * It renders under `npm run dev` and is a hard 404 in a production build — not
 * merely noindexed, which would still leave it reachable by anyone who guessed
 * the URL. Set ENABLE_STYLEGUIDE=1 in an environment to turn it back on there
 * (a Vercel preview deployment, say, when someone needs to review it without
 * running the repo). The flag is read at build time, so changing it needs a
 * redeploy — deliberate, so it can't be flipped on by accident at runtime.
 */
const STYLEGUIDE_ENABLED =
  process.env.NODE_ENV !== "production" || process.env.ENABLE_STYLEGUIDE === "1";

/* Section scaffold ---------------------------------------------------------- */

function Section({
  n,
  title,
  note,
  children,
}: {
  n: string;
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="shell py-16 md:py-24">
      <Reveal>
        <div className="mb-10 flex flex-col gap-4">
          <div className="flex items-baseline gap-5">
            <span className="stamp-type text-[--text-muted]">{n}</span>
            <span className="h-px flex-1 bg-[--rule]" />
          </div>
          <h2 className="t-heading text-[--text]">{title}</h2>
          {note && <p className="t-lede max-w-measure">{note}</p>}
        </div>
        {children}
      </Reveal>
    </section>
  );
}

function Swatch({
  name,
  token,
  hex,
  dark = false,
}: {
  name: string;
  token: string;
  hex: string;
  dark?: boolean;
}) {
  return (
    <div className="border border-[--rule]">
      <div className="h-24" style={{ backgroundColor: hex }} />
      <div className="flex flex-col gap-1 border-t border-[--rule] px-3 py-3">
        <span className="t-micro text-[--text]">{name}</span>
        <span className="font-body text-body-s text-[--text-secondary]">
          {hex}
        </span>
        <span className="font-display text-micro text-[--text-muted]">
          {token}
        </span>
      </div>
      {dark && <span className="sr-only">Use cream text on this colour.</span>}
    </div>
  );
}

const TRIPS: Trip[] = [
  {
    name: "Telluride",
    destination: "Colorado · United States",
    dates: "Feb 12–17, 2027",
    price: "$4,850",
    summary:
      "Six days above the box canyon, a private chef, and a guide who has skied the same lines for twenty winters.",
    status: "few",
    href: "/trips/telluride",
  },
  {
    name: "Niseko",
    destination: "Hokkaidō · Japan",
    dates: "Jan 8–16, 2027",
    price: "$7,200",
    summary:
      "Powder that arrives on schedule, and an onsen at the end of every day.",
    status: "open",
    href: "/trips/niseko",
  },
  {
    name: "Chamonix",
    destination: "Haute-Savoie · France",
    dates: "Mar 4–11, 2027",
    price: "$6,400",
    summary:
      "The Vallée Blanche, guided, with a week of the Alps either side of it.",
    status: "soldOut",
    href: "/trips/chamonix",
  },
];

export default function StylePage() {
  if (!STYLEGUIDE_ENABLED) notFound();

  return (
    <ToastProvider>
      <NavBar overHero />

      {/* ---- hero: the nav's transparent state, and the type pairing ------- */}
      <header className="scheme-forest scheme-paint relative overflow-hidden">
        <div className="shell flex min-h-[78vh] flex-col justify-end pb-16 pt-32 md:pb-24">
          <Reveal>
            <p className="t-micro mb-6 text-[--text-secondary]">
              Outrider · Design system · v1
            </p>
          </Reveal>
          <Reveal delay={90}>
            <h1 className="t-display max-w-[16ch] text-[--text]">
              One who rides ahead
            </h1>
          </Reveal>
          <Reveal delay={180}>
            <p className="t-lede mt-8 max-w-measure-tight">
              The tokens, type and components every Outrider page is built from.
              Scroll to watch the bar above go solid — that transition is the
              whole system in miniature: the scheme changes, and every piece
              inside it follows without being told.
            </p>
          </Reveal>

          <Stamp
            text="Scouted · Prepared · Outrider"
            spin
            className="absolute right-gutter top-28 hidden w-36 text-[--text-secondary] lg:block"
          />
        </div>
      </header>

      <main className="scheme-light scheme-paint">
        {/* ---- colour ------------------------------------------------------ */}
        <Section
          n="01"
          title="Colour"
          note="Seven brand colours and a short list of values mixed from them. Burnt orange is an accent with one job — it marks scarcity and nothing else."
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <Swatch name="Teal" token="--color-teal" hex="#4C8591" dark />
            <Swatch name="Forest" token="--color-forest" hex="#1F2A0F" dark />
            <Swatch
              name="Charcoal"
              token="--color-charcoal"
              hex="#1A1A1A"
              dark
            />
            <Swatch
              name="Burnt orange"
              token="--color-burnt-orange"
              hex="#C6672D"
              dark
            />
            <Swatch name="Sage" token="--color-sage" hex="#9AA09A" />
            <Swatch name="Sky" token="--color-sky" hex="#A9C2D4" />
            <Swatch name="Cream" token="--color-cream" hex="#F1E9DC" />
            <Swatch name="Paper" token="--color-paper" hex="#FAF6EF" />
          </div>

          <p className="t-micro mt-8 text-[--text-secondary]">
            Text-safe derivatives
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <Swatch
              name="Teal deep"
              token="--color-teal-deep"
              hex="#37646E"
              dark
            />
            <Swatch
              name="Teal ink"
              token="--color-teal-ink"
              hex="#2A4E57"
              dark
            />
            <Swatch
              name="Ember ink"
              token="--color-ember-ink"
              hex="#9E501F"
              dark
            />
            <Swatch name="Stone" token="--color-stone" hex="#686765" dark />
          </div>

          <div className="mt-8 border-l-2 border-[--accent] bg-[--surface-raised] px-5 py-4">
            <p className="t-micro text-[--text]">The contrast rule</p>
            <p className="mt-2 max-w-measure font-body text-body-s leading-[1.7] text-[--text-secondary]">
              Brand teal and burnt orange are mid-tones: both clear 3:1 against
              paper, so they are safe as surfaces, rules and marks, and neither
              is legible at text size. Anything you have to <em>read</em> in
              those colours uses the deepened value beside it — which is why a
              filled button sits on{" "}
              <span className="font-display text-micro tracking-label">
                --accent-solid
              </span>{" "}
              rather than{" "}
              <span className="font-display text-micro tracking-label">
                --color-teal
              </span>
              . Every pairing below passes AA at 4.5:1.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3 lg:grid-cols-5">
            {[
              { cls: "scheme-light", label: "scheme-light" },
              { cls: "scheme-forest", label: "scheme-forest" },
              { cls: "scheme-teal", label: "scheme-teal" },
              { cls: "scheme-teal-ink", label: "scheme-teal-ink" },
              { cls: "scheme-charcoal", label: "scheme-charcoal" },
            ].map((s) => (
              // The caption sits outside the painted specimen, on paper, so it
              // isn't subject to the scheme it happens to be naming.
              <div key={s.cls} className="flex flex-col gap-2">
                <p className="t-micro text-[--text-secondary]">{s.label}</p>
                <div
                  className={`${s.cls} scheme-paint border border-[--rule] p-5`}
                >
                  {/* scheme-teal demonstrates itself honestly: display type, which
                    is the only thing it's cleared for. The others show the
                    three text tiers at body size. */}
                  {s.cls === "scheme-teal" ? (
                    <>
                      <p className="t-subheading text-[--text]">Display only</p>
                      <p className="mt-2 font-display text-[1.5rem] leading-tight text-[--text-secondary]">
                        No body copy
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-body text-body-s text-[--text]">
                        Primary text
                      </p>
                      <p className="font-body text-body-s text-[--text-secondary]">
                        Secondary text
                      </p>
                    </>
                  )}
                  <hr className="my-4 border-t border-[--rule]" />
                  {/* Filled on teal — an outlined button there would put a 12px
                    cream label straight onto a 3.4:1 ground. */}
                  <Button
                    variant={s.cls === "scheme-teal" ? "primary" : "secondary"}
                    size="sm"
                  >
                    Button
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <SectionDivider variant="mark" className="shell" />

        {/* ---- type -------------------------------------------------------- */}
        <Section
          n="02"
          title="Typography"
          note="DM Mono for anything stamped — headlines, nav, labels. Source Serif for anything read. The gap between the two is the identity."
        >
          <div className="flex flex-col gap-10">
            <div className="flex flex-col gap-3 border-b border-[--rule] pb-8">
              <span className="stamp-type text-[--text-muted]">t-display</span>
              <p className="t-display text-[--text]">Rides ahead</p>
            </div>
            <div className="flex flex-col gap-3 border-b border-[--rule] pb-8">
              <span className="stamp-type text-[--text-muted]">t-title</span>
              <p className="t-title text-[--text]">Six days above the canyon</p>
            </div>
            <div className="flex flex-col gap-3 border-b border-[--rule] pb-8">
              <span className="stamp-type text-[--text-muted]">
                t-heading / t-subheading
              </span>
              <p className="t-heading text-[--text]">The route, scouted</p>
              <p className="t-subheading text-[--text-secondary]">
                Telluride, Colorado
              </p>
            </div>
            <div className="flex flex-col gap-3 border-b border-[--rule] pb-8">
              <span className="stamp-type text-[--text-muted]">
                t-label / t-micro / stamp-type
              </span>
              <div className="flex flex-wrap items-baseline gap-8">
                <span className="t-label text-[--text]">Book a departure</span>
                <span className="t-micro text-[--text-secondary]">
                  Winter 2027
                </span>
                <span className="stamp-type text-[--text-muted]">
                  No. 01 · Issued
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <span className="stamp-type text-[--text-muted]">
                t-lede / t-body
              </span>
              <p className="t-lede">
                Every trip is scouted before it is sold. We ski the lines, eat
                the dinners, and sleep in the rooms, and only then does a
                departure go on the page.
              </p>
              <p className="t-body text-[--text]">
                Body copy is set in Source Serif at seventeen pixels with a 1.7
                line height and a sixty-eight character measure — long enough to
                carry an argument, short enough that the eye finds the next line
                without hunting for it. Italics carry <em>emphasis</em>; the
                mono face never appears mid-sentence.
              </p>
            </div>
          </div>
        </Section>

        <SectionDivider variant="label" label="Components" className="shell" />

        {/* ---- logo -------------------------------------------------------- */}
        <Section
          n="03"
          title="Logo"
          note="The eye on the horizon line, and the wordmark. One component, four lockups, colour passed as a prop so it survives any ground."
        >
          <div className="grid gap-px border border-[--rule] bg-[--rule] sm:grid-cols-2 lg:grid-cols-4">
            <div className="grid place-items-center bg-[--color-paper] p-10">
              <Logo variant="lockup" tone="charcoal" className="w-36" />
            </div>
            <div className="grid place-items-center bg-[--color-teal] p-10">
              <Logo variant="lockup" tone="cream" className="w-36" />
            </div>
            <div className="grid place-items-center bg-[--color-forest] p-10">
              <Logo variant="inline" tone="cream" />
            </div>
            <div className="grid place-items-center bg-[--color-cream] p-10">
              <Logo variant="mark" tone="teal" className="w-14" />
            </div>
          </div>
        </Section>

        {/* ---- buttons ----------------------------------------------------- */}
        <Section
          n="04"
          title="Buttons"
          note="Three variants, three sizes, square corners. Hover changes colour and rule weight only."
        >
          <div className="flex flex-col gap-8">
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="primary" size="lg">
                Reserve a spot
              </Button>
              <Button variant="secondary" size="lg">
                See the itinerary
              </Button>
              <Button variant="ghost" size="lg">
                Read the journal
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="primary">Reserve a spot</Button>
              <Button variant="secondary">See the itinerary</Button>
              <Button variant="ghost">Read the journal</Button>
              <Button variant="primary" disabled>
                Sold out
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="primary" size="sm" href="/trips">
                As a link
              </Button>
              <Button variant="secondary" size="sm">
                Small
              </Button>
              <Button variant="ghost" size="sm">
                Small ghost
              </Button>
            </div>
            <div className="scheme-forest scheme-paint flex flex-wrap items-center gap-4 border border-[--rule] p-6">
              <Button variant="primary">On forest</Button>
              <Button variant="secondary">On forest</Button>
              <Button variant="ghost">On forest</Button>
            </div>
          </div>
        </Section>

        {/* ---- ephemera ---------------------------------------------------- */}
        <Section
          n="05"
          title="Ephemera"
          note="Stamps, badges, perforations and hairlines. The rule is restraint — one stamp per screen, and burnt orange only on scarcity."
        >
          <div className="grid gap-10 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-start">
            <div className="flex items-center gap-8">
              <Stamp
                text="Scouted · Prepared"
                className="w-32 text-[--text-secondary]"
              />
              {/* --accent, not --color-teal: the ring type is 12px, and brand
                  teal is only 3.8:1 on paper. This is the rule the section
                  above states, applied to the section itself. */}
              <Stamp
                text="Members only · Est 2026"
                spin
                className="w-32 text-[--accent]"
              />
            </div>

            <div className="flex flex-col gap-8">
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status="open" />
                <StatusBadge status="few" />
                <StatusBadge status="soldOut" />
                <StatusBadge status="waitlist" />
                <StatusBadge status="announced" />
                <Badge plain>7 travellers</Badge>
              </div>

              <div className="flex flex-col gap-6">
                <SectionDivider variant="rule" />
                <SectionDivider variant="label" label="Winter 2027" />
                <SectionDivider variant="mark" />
                <SectionDivider variant="perforation" />
              </div>

              <div className="stub max-w-sm p-5">
                <p className="stamp-type text-[--text-muted]">
                  Boarding · No. 01
                </p>
                <p className="t-subheading mt-2 text-[--text]">Telluride</p>
                <hr className="perforation my-4" />
                <p className="font-body text-body-s text-[--text-secondary]">
                  A ticket stub — notched ends, a torn perforation. Used once a
                  page, at most.
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* ---- trip cards -------------------------------------------------- */}
        <Section
          n="06"
          title="Trip card"
          note="Record number and status across the header, the photograph, then the name, a line of serif, and a ruled meta strip."
        >
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {TRIPS.map((trip, i) => (
              <Reveal key={trip.destination} delay={i * 90}>
                <TripCard trip={trip} className="h-full" />
              </Reveal>
            ))}
          </div>
        </Section>

        {/* ---- forms ------------------------------------------------------- */}
        <Section
          n="07"
          title="Forms"
          note="Hairline boxes on a transparent ground, labels stamped above. Errors turn the rule burnt orange and are announced."
        >
          <FormDemo />
        </Section>

        {/* ---- messaging --------------------------------------------------- */}
        <Section
          n="08"
          title="Alerts and toasts"
          note="Inline alerts sit in the page. Toasts confirm something that just happened and leave after five seconds."
        >
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="flex flex-col gap-4">
              <Alert tone="info">
                Deposits are refundable up to ninety days before departure.
              </Alert>
              <Alert tone="success" title="You're on the list">
                We&rsquo;ll write when the Telluride dates open.
              </Alert>
              <Alert tone="warning" title="Two spots left">
                This departure closes when the lodge fills.
              </Alert>
              <Alert tone="error" title="Card declined">
                Your bank turned the charge down. Try another method.
              </Alert>
            </div>
            <div className="flex flex-col gap-4">
              <p className="font-body text-body-s text-[--text-secondary]">
                Toasts stack bottom-right, three at a time.
              </p>
              <ToastDemo />
            </div>
          </div>
        </Section>
      </main>

      <Footer />
    </ToastProvider>
  );
}
