import { Alert, Button, CheckRow } from "@/components/ui";
import type { Announcement, ToolkitFile } from "@/lib/ambassador-portal";
import type { AmbassadorProgram } from "@/lib/ambassador-program";
import type { PortalView } from "@/lib/ambassador-rules";
import { AMBASSADOR_PORTAL as COPY } from "@/lib/site-content";
import { acceptAgreement, claimFreeTrip, setLeaderboardHidden } from "./actions";
import CopyValue from "./CopyValue";
import LiveDashboard, { type ProgramFacts } from "./LiveDashboard";
import QrCode from "./QrCode";

/*
 * The portal's screens, as plain components fed by page.tsx, which decides
 * which one to show and loads what it needs. Kept apart from the page so the
 * page holds the access decisions and the data, and these hold the layout.
 */

/** What the client side needs to know about the program: plain values only, nothing that runs. */
export function programFacts(program: AmbassadorProgram, departures: ProgramFacts["departures"]): ProgramFacts {
  return {
    goal: program.goal,
    deadlineIso: program.signupDeadline.toISOString(),
    deadlineLabel: program.signupDeadlineLabel,
    deadlineSpoken: `Bookings close ${program.signupDeadlineLabel} at 11:59 PM Central.`,
    departures,
    rewards: {
      first: program.rewards.first,
      goal: {
        title: program.rewards.goal.title,
        earned: program.rewards.goal.earned,
        locked: program.rewards.goal.locked(program.goal),
        picked: program.rewards.goal.picked("{departure}"),
      },
      next: program.rewards.next,
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
  const shown = url.replace(/^https?:\/\//, "");
  return (
    <main>
      {announcement && (
        <section aria-label="Announcement" className="scheme-stone scheme-paint">
          <div className="shell-narrow py-6">
            <p className="t-micro text-[--text-secondary]">From Outrider</p>
            {/* Plain text from the database, rendered as text: React escapes it. */}
            <p className="mt-2 whitespace-pre-line font-body text-body text-[--text]">{announcement.body}</p>
          </div>
        </section>
      )}
      {(error || done) && (
        <div className="shell-narrow pt-6">
          <Alert tone={error ? "error" : "success"} title={error ? "Not yet" : "Done"}>
            {error ?? done}
          </Alert>
        </div>
      )}

      <LiveDashboard
        initial={view}
        facts={facts}
        claimFreeTrip={claimFreeTrip}
        setLeaderboardHidden={setLeaderboardHidden}
        after={<Toolkit files={toolkit} url={url} code={view.code} program={program} />}
      >
        <section aria-labelledby="share-title" className="flex flex-col gap-10">
          <h2 id="share-title" className="sr-only">
            Your link and code
          </h2>
          <div>
            <p className="t-rule-label text-[--text-secondary]">{COPY.linkTitle}</p>
            <p className="mt-3 break-all font-body text-lede text-[--text]">{shown}</p>
            <CopyValue value={url} label="Copy link" share className="mt-4" />
            <p className="mt-3 font-body text-body-s text-[--text-secondary]">{COPY.linkNote}</p>
          </div>

          <div className="grid gap-8 sm:grid-cols-[1fr_12rem] sm:items-start">
            <div>
              <p className="t-rule-label text-[--text-secondary]">{COPY.codeTitle}</p>
              <p className="t-display mt-3 break-all text-display-l">{view.code}</p>
              <CopyValue value={view.code} label="Copy code" className="mt-4" />
              <p className="mt-3 font-body text-body-s text-[--text-secondary]">{COPY.codeNote}</p>
            </div>
            <figure className="w-48 max-w-full">
              <QrCode value={url} label={`QR code for ${shown}`} />
              <figcaption className="mt-3">
                <span className="t-label block text-[--text]">{COPY.qrTitle}</span>
                <span className="mt-1.5 block font-body text-body-s text-[--text-secondary]">{COPY.qrNote}</span>
              </figcaption>
            </figure>
          </div>
        </section>
      </LiveDashboard>

      <footer className="shell-narrow flex flex-col gap-4 pb-16">
        <p className="font-body text-body-s text-[--text-secondary]">{COPY.help}</p>
        <details className="group">
          <summary className="t-label cursor-pointer list-none text-[--accent] [&::-webkit-details-marker]:hidden">
            Your agreement
          </summary>
          <AgreementTerms program={program} className="mt-4" />
          <p className="mt-3 font-body text-body-s text-[--text-muted]">
            Accepted {formatDay(agreedAt)}, version {program.agreement.version}.
          </p>
        </details>
      </footer>
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

function Toolkit({ files, url, code, program }: { files: ToolkitFile[]; url: string; code: string; program: AmbassadorProgram }) {
  const fill = (s: string) => s.replaceAll("{link}", url).replaceAll("{code}", code);
  return (
    <section aria-labelledby="toolkit-title" className="flex flex-col gap-10">
      <h2 id="toolkit-title" className="t-heading text-[--text]">
        {COPY.toolkitTitle}
      </h2>

      <div>
        <h3 className="t-rule-label text-[--text-secondary]">{COPY.graphicsTitle}</h3>
        {files.length === 0 ? (
          <p className="t-body mt-3 text-[--text-secondary]">{COPY.graphicsEmpty}</p>
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {files.map((f) => {
              const href = `/ambassador/dashboard/toolkit/${f.path}`;
              return (
                <li key={f.path} className="flex flex-col gap-2">
                  {/* A plain img: the source is a redirect to a 60-second
                      signed URL, which next/image's optimizer cannot follow
                      with this visitor's session. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={href} alt={f.label} loading="lazy" className="aspect-[9/16] w-full bg-[--surface-inset] object-cover" />
                  <a href={`${href}?download=1`} className="t-label text-[--accent]">
                    Save {f.folder === "school" ? "(your school)" : ""}
                  </a>
                </li>
              );
            })}
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
              <CopyValue value={fill(s.body)} label="Copy" share className="mt-3" />
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="t-rule-label text-[--text-secondary]">{COPY.faqTitle}</h3>
        <div className="mt-4 flex flex-col gap-2">
          {COPY.faq(countByLine(program), program.goal).map(
            (item) => (
              <details key={item.q} className="group bg-[--surface-raised] px-4 py-3.5 sm:px-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-body text-body text-[--text] [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span aria-hidden="true" className="transition-transform duration-fast group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 font-body text-body-s text-[--text-secondary]">{item.a}</p>
              </details>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
