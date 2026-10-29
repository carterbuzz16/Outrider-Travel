import { Alert, Button, CheckRow, cn } from "@/components/ui";
import type { Announcement, ToolkitFile } from "@/lib/ambassador-portal";
import Image from "next/image";
import type { AmbassadorProgram, Perk } from "@/lib/ambassador-program";
import { bookingsCloseAt } from "@/lib/signup-deadline";
import type { PortalView } from "@/lib/ambassador-rules";
import { AMBASSADOR_PORTAL as COPY } from "@/lib/site-content";
import { acceptAgreement, claimFreeTrip } from "./actions";
import AnnouncementBar from "./AnnouncementBar";
import CopyValue from "./CopyValue";
import LiveDashboard, { type ProgramFacts } from "./LiveDashboard";
import QrCode from "./QrCode";
import ToolkitImage from "./ToolkitImage";

/*
 * The portal's screens, as plain components fed by page.tsx, which decides
 * which one to show and loads what it needs. Kept apart from the page so the
 * page holds the access decisions and the data, and these hold the layout.
 */

/** What the client side needs to know about the program: plain values only, nothing that runs. */
export function programFacts(
  program: AmbassadorProgram,
  departures: ProgramFacts["departures"],
  now: Date = new Date(),
): ProgramFacts {
  // Each week closes on its own date; the countdown runs to the next one.
  const next = Object.entries(program.departures)
    .map(([start, d]) => ({ start, d, closes: bookingsCloseAt(start) }))
    .filter((x) => x.closes.getTime() > now.getTime())
    .sort((a, b) => a.closes.getTime() - b.closes.getTime())[0];
  const closes = next?.closes ?? program.signupDeadline;
  const label = next ? next.d.countByLabel : program.signupDeadlineLabel;
  return {
    goal: program.goal,
    deadlineIso: closes.toISOString(),
    deadlineLabel: label,
    closingName: next ? next.d.label : "Bookings",
    deadlineSpoken: `${next ? next.d.label : "Bookings"} closes ${label} at 11:59 PM Central.`,
    departures,
    freeTrip: {
      earned: program.freeTrip.earned,
      locked: program.freeTrip.locked(program.goal),
      picked: program.freeTrip.picked("{departure}"),
    },
  };
}

export function DashboardBody({
  view,
  facts,
  program,
  announcement,
  toolkit,
  url,
  agreedAt,
  error,
  done,
}: {
  view: PortalView;
  facts: ProgramFacts;
  program: AmbassadorProgram;
  announcement: Announcement | null;
  toolkit: ToolkitFile[];
  /** Their full referral link. */
  url: string;
  agreedAt: string;
  error: string | null;
  done: string | null;
}) {
  return (
    <main>
      <LiveDashboard
        initial={view}
        facts={facts}
        claimFreeTrip={claimFreeTrip}
        announcement={announcement && <AnnouncementBar id={announcement.createdAt} body={announcement.body} />}
        notice={
          (error || done) && (
            <div className="shell-narrow pt-6">
              <Alert tone={error ? "error" : "success"} title={error ? "Not yet" : "Done"}>
                {error ?? done}
              </Alert>
            </div>
          )
        }
        shareUrl={url}
        share={<ShareCard url={url} code={view.code} />}
        perks={<PerksSection perks={program.perks} />}
        toolkit={<Toolkit files={toolkit} url={url} code={view.code} program={program} agreedAt={agreedAt} />}
      />
    </main>
  );
}

/** "the end of November 14 for December, December 4 for January". */
function countByLine(program: AmbassadorProgram): string {
  const parts = Object.values(program.departures).map((d) => `${d.countByLabel} for ${d.label}`);
  return parts.length > 0 ? `the end of ${parts.join(", ")}` : `the end of ${program.signupDeadlineLabel}`;
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/Chicago" });
}

/* -- the pieces ------------------------------------------------------------------- */

/*
 * The perks, made to be swiped (Carter, 29 Oct 2026: "more exciting"). On a
 * phone they are a row of tall cards, the next one peeking in from the edge,
 * that snap one at a time; from sm up, a 2 by 2 grid. Each card is one panel
 * of the brand's grounds, two colors at most and no gradients, with its name
 * in Extrabold capitals. Club blue is used once, on Merch. The photo card
 * keeps its words on the espresso below the picture, never on it.
 */
const PERK_LOOK: Record<Perk["look"], string> = {
  club: "scheme-club scheme-paint",
  stone: "scheme-stone scheme-paint",
  espresso: "scheme-espresso scheme-paint",
  photo: "scheme-espresso scheme-paint",
};

function PerksSection({ perks }: { perks: readonly Perk[] }) {
  return (
    <section aria-labelledby="perks-title">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="perks-title" className="t-display text-display-s text-[--text]">
          Your perks
        </h2>
        <p aria-hidden="true" className="t-micro text-[--text-secondary] sm:hidden">
          Swipe &rarr;
        </p>
      </div>
      <ul
        tabIndex={0}
        aria-label="Your perks"
        className={cn(
          "mt-5 flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain",
          "-mx-[--gutter] scroll-px-[--gutter] px-[--gutter] pb-1",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0",
        )}
      >
        {perks.map((perk, i) => (
          <li
            key={perk.title}
            className={cn(
              "relative flex w-[80%] shrink-0 snap-start flex-col overflow-hidden sm:w-auto",
              "min-h-[23rem] sm:min-h-[20rem]",
              PERK_LOOK[perk.look],
            )}
          >
            {perk.look === "photo" && perk.image && (
              <div className="relative h-44 w-full shrink-0 sm:h-40">
                <Image src={perk.image} alt="" fill sizes="(min-width: 640px) 380px, 80vw" className="object-cover" />
              </div>
            )}
            <div className="flex flex-1 flex-col justify-between gap-6 px-5 pb-6 pt-5">
              <p className="t-label tabular-nums text-[--text-secondary]">{String(i + 1).padStart(2, "0")}</p>
              <div>
                <h3 className="t-display text-[length:clamp(2.25rem,1.9rem+1.6vw,2.9rem)] leading-[0.92] text-[--text]">
                  {perk.title}
                </h3>
                <p className="mt-3 font-body text-body-s text-[--text-secondary]">{perk.line}</p>
                {perk.action && (
                  <div className="mt-5">
                    <Button href={perk.action.href} variant="primary" size="md" block>
                      {perk.action.label}
                    </Button>
                    {perk.action.detail && (
                      <p className="mt-2.5 text-center font-body text-body-s tabular-nums text-[--text-secondary]">
                        {perk.action.detail}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The link to send, the code to say out loud, and a QR for in person, one tap from each. */
function ShareCard({ url, code }: { url: string; code: string }) {
  const shown = url.replace(/^https?:\/\//, "");
  return (
    <section aria-labelledby="share-title" className="bg-[--surface-raised] px-5 py-6 sm:px-7 sm:py-7">
      <h2 id="share-title" className="t-label text-[--text]">
        {COPY.shareTitle}
      </h2>
      <p className="mt-3 break-all font-body text-lede leading-snug text-[--text]">{shown}</p>
      <CopyValue value={url} label="Copy link" share asUrl block className="mt-5" />

      <div className="mt-8 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="t-micro text-[--text-secondary]">{COPY.codeTitle}</p>
          <p className="t-display mt-2 break-all text-display-m">{code}</p>
        </div>
        <CopyValue value={code} label="Copy code" />
      </div>
      <p className="mt-3 font-body text-body-s text-[--text-secondary]">{COPY.codeNote}</p>

      <details className="group mt-6">
        <summary className="t-label flex min-h-11 cursor-pointer list-none items-center gap-3 text-[--accent] [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">Show QR code</span>
          <span className="hidden group-open:inline">Hide QR code</span>
          <span aria-hidden="true" className="transition-transform duration-fast group-open:rotate-45">
            +
          </span>
        </summary>
        <figure className="mt-3 w-56 max-w-full">
          <QrCode value={url} label={`QR code for ${shown}`} />
          <figcaption className="mt-3 font-body text-body-s text-[--text-secondary]">{COPY.qrNote}</figcaption>
        </figure>
      </details>
    </section>
  );
}

function AgreementTerms({ program, className }: { program: AmbassadorProgram; className?: string }) {
  return (
    <ol className={["flex list-decimal flex-col gap-3 pl-5 font-body text-body text-[--text]", className].filter(Boolean).join(" ")}>
      {program.agreement.terms.map((t) => (
        <li key={t} className="pl-1">
          {t}
        </li>
      ))}
    </ol>
  );
}

export function Agreement({ program, error }: { program: AmbassadorProgram; error: string | null }) {
  return (
    <main className="shell-narrow py-12 md:py-20">
      <p className="t-rule-label text-[--text-secondary]">Before you start</p>
      <h1 className="t-title mt-4 text-[--text]">{program.agreement.title}</h1>
      <p className="t-lede mt-4">{COPY.agreementLead}</p>
      <div className="mt-8 bg-[--surface-raised] px-5 py-6 sm:px-8 sm:py-8">
        <AgreementTerms program={program} />
      </div>
      <form action={acceptAgreement} className="mt-8 flex flex-col gap-5">
        {error && (
          <Alert tone="error" title="Not yet">
            {error}
          </Alert>
        )}
        <CheckRow name="agree" value="yes" required>
          {COPY.agreementCheck}
        </CheckRow>
        <Button type="submit" variant="primary" size="lg" block>
          {COPY.agreementSubmit}
        </Button>
      </form>
    </main>
  );
}

export function NotAmbassador({ email }: { email: string | null }) {
  return (
    <main className="shell-narrow py-16 md:py-24">
      <h1 className="t-title text-[--text]">{COPY.notAmbassadorTitle}</h1>
      <p className="t-lede mt-5">{COPY.notAmbassadorBody}</p>
      {email && (
        <p className="mt-4 font-body text-body-s text-[--text-secondary]">
          You&rsquo;re signed in as <span className="text-[--text]">{email}</span>.
        </p>
      )}
      <Button href="/ambassador" variant="primary" size="md" className="mt-8">
        {COPY.notAmbassadorApply}
      </Button>
    </main>
  );
}

function Toolkit({
  files,
  url,
  code,
  program,
  agreedAt,
}: {
  files: ToolkitFile[];
  url: string;
  code: string;
  program: AmbassadorProgram;
  agreedAt: string;
}) {
  const fill = (s: string) => s.replaceAll("{link}", url).replaceAll("{code}", code);
  return (
    <section aria-labelledby="toolkit-title" className="shell-narrow flex flex-col gap-12 py-10 md:py-14">
      <div>
        <h2 id="toolkit-title" className="t-title text-[--text]">
          {COPY.toolkitTitle}
        </h2>
        <p className="mt-3 font-body text-body text-[--text-secondary]">{COPY.toolkitLine}</p>
      </div>

      <div>
        <h3 className="t-rule-label text-[--text-secondary]">{COPY.graphicsTitle}</h3>
        {files.length > 0 && (
          <p className="mt-2 font-body text-body-s text-[--text-secondary]">{COPY.graphicsNote}</p>
        )}
        {files.length === 0 ? (
          <p className="t-body mt-3 text-[--text-secondary]">{COPY.graphicsEmpty}</p>
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {files.map((f) => (
              <li key={f.path}>
                <ToolkitImage
                  href={`/ambassador/dashboard/toolkit/${f.path}`}
                  label={f.label}
                  fileName={f.path.slice(f.path.lastIndexOf("/") + 1)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="t-rule-label text-[--text-secondary]">{COPY.scriptsTitle}</h3>
        <ul className="mt-4 flex flex-col gap-3">
          {COPY.scripts.map((s) => (
            <li key={s.title} className="bg-[--surface-raised] px-4 py-4 sm:px-5">
              <p className="t-label text-[--text]">{s.title}</p>
              <p className="mt-2.5 font-body text-body text-[--text-secondary]">{fill(s.body)}</p>
              <CopyValue value={fill(s.body)} label="Copy" shareFirst shareLabel="Send it" primary block className="mt-4" />
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="t-rule-label text-[--text-secondary]">{COPY.faqTitle}</h3>
        <div className="mt-4 flex flex-col gap-2">
          {COPY.faq(countByLine(program), program.goal).map(
            (item) => (
              <details key={item.q} className="group bg-[--surface-raised]">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 font-body text-body text-[--text] sm:px-5 [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span aria-hidden="true" className="transition-transform duration-fast group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="px-4 pb-4 font-body text-body-s text-[--text-secondary] sm:px-5">{item.a}</p>
              </details>
            ),
          )}
          <details className="group bg-[--surface-raised]">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 font-body text-body text-[--text] sm:px-5 [&::-webkit-details-marker]:hidden">
              Your agreement
              <span aria-hidden="true" className="transition-transform duration-fast group-open:rotate-45">
                +
              </span>
            </summary>
            <div className="px-4 pb-4 sm:px-5">
              <AgreementTerms program={program} className="text-body-s" />
              <p className="mt-3 font-body text-body-s text-[--text-muted]">
                Accepted {formatDay(agreedAt)}, version {program.agreement.version}.
              </p>
            </div>
          </details>
        </div>
        <p className="mt-6 font-body text-body-s text-[--text-secondary]">{COPY.help}</p>
      </div>
    </section>
  );
}
