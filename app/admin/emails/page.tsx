import type { Metadata } from "next";
import { Alert } from "@/components/ui";
import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { emailCatalog, type EmailEntry } from "@/lib/email/catalog";
import type { RenderedEmail } from "@/lib/email/send";
import { PageHeader } from "../admin-ui";
import TestSend from "./TestSend";

export const metadata: Metadata = { title: "Emails" };

// Reads this environment's settings on every request (which notification
// addresses are set, whether the designed emails can be filled in), so it is
// never prerendered.
export const dynamic = "force-dynamic";

/*
 * Every email the site sends, previewed from a sample booking, each with a
 * test send to the admin's own inbox. Most of these only fire after a paid
 * booking or from the daily jobs, so this is the one place to read them all
 * before a traveler does.
 *
 * Previews are rendered into sandboxed iframes through srcDoc: the email's own
 * HTML and inline styles, isolated from the admin's, with no scripts and no
 * access to this origin. Nothing on this page reads or writes a booking.
 */
export default async function EmailsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const entries = emailCatalog().map((entry) => ({ entry, ...safeRender(entry) }));
  const sections = [...new Set(entries.map((e) => e.entry.section))];

  return (
    <main className="shell pb-20">
      <PageHeader
        eyebrow="Back office"
        title="Emails"
        lede={
          <>
            Every email the site sends, when it goes and who gets it, previewed with a sample booking: Jordan Taylor,
            Telluride, December 14 to 18, 2026, Two to a Room, a $229.90 deposit and two installments. Test sends go
            only to you{user?.email ? <> ({user.email})</> : null}, with [TEST] in the subject, and touch no bookings.
          </>
        }
      />

      <nav aria-label="Emails on this page" className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <div key={section}>
            <p className="t-micro text-[--text-muted]">{section}</p>
            <ul className="mt-2 space-y-1.5">
              {entries
                .filter((e) => e.entry.section === section)
                .map(({ entry }) => (
                  <li key={entry.id}>
                    <a
                      href={`#${entry.id}`}
                      className="font-body text-body-s text-[--text-secondary] no-underline hover:text-[--text]"
                    >
                      {entry.name}
                    </a>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </nav>

      {sections.map((section) => (
        <section key={section} className="mt-12">
          <h2 className="t-micro border-b border-[--rule] pb-3 text-[--text]">{section}</h2>
          <div className="mt-5 space-y-5">
            {entries
              .filter((e) => e.entry.section === section)
              .map(({ entry, email, error }) => (
                <EmailCard key={entry.id} entry={entry} email={email} error={error} />
              ))}
          </div>
        </section>
      ))}
    </main>
  );
}

function safeRender(entry: EmailEntry): { email: RenderedEmail | null; error: string | null } {
  try {
    return { email: entry.render(), error: null };
  } catch (err) {
    console.error(`admin email preview ${entry.id} failed: ${err instanceof Error ? err.message : err}`);
    return { email: null, error: err instanceof Error ? err.message : "It could not be rendered." };
  }
}

function EmailCard({
  entry,
  email,
  error,
}: {
  entry: EmailEntry;
  email: RenderedEmail | null;
  error: string | null;
}) {
  return (
    <article id={entry.id} className="scroll-mt-6 border border-[--rule] bg-[--surface-raised]">
      <header className="border-b border-[--rule] px-4 py-4 sm:px-5">
        <h3 className="font-body text-body font-medium text-[--text]">{entry.name}</h3>
      </header>

      <div className="space-y-5 px-4 py-5 sm:px-5">
        <dl className="grid gap-x-6 gap-y-3 font-body text-body-s sm:grid-cols-[10rem_minmax(0,1fr)]">
          <Fact label="When it goes">{entry.trigger}</Fact>
          <Fact label="Who gets it">{entry.recipient}</Fact>
          <Fact label="Subject">
            <span className="break-words text-[--text]">{email?.subject ?? "(not rendered)"}</span>
          </Fact>
          {entry.sandbox && <Fact label="Try it in the sandbox">{entry.sandbox}</Fact>}
        </dl>

        {entry.notes && entry.notes.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 font-body text-body-s text-[--text-secondary]">
            {entry.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}

        {entry.gaps && entry.gaps.missing.length > 0 && (
          <Alert tone="warning" title="Real values still missing">
            <p>{entry.gaps.consequence}</p>
            <ul className="mt-2 list-disc space-y-0.5 pl-5">
              {entry.gaps.missing.map((gap) => (
                <li key={gap}>{gap}</li>
              ))}
            </ul>
            <p className="mt-2">
              Settings are checked in this environment; production&rsquo;s may differ. The preview shows
              &ldquo;[&hellip; to be confirmed]&rdquo; where a value is missing.
            </p>
          </Alert>
        )}

        {error && (
          <Alert tone="error" title="Preview failed">
            {error}
          </Alert>
        )}

        {entry.supabase ? null : <TestSend emailId={entry.id} />}

        {email && <Preview email={email} name={entry.name} />}
      </div>
    </article>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="t-micro pt-0.5 text-[--text-muted]">{label}</dt>
      <dd className="text-[--text-secondary]">{children}</dd>
    </>
  );
}

function Preview({ email, name }: { email: RenderedEmail; name: string }) {
  return (
    <div className="space-y-3">
      {email.html && (
        <details className="group border border-[--rule]">
          <summary className="t-micro cursor-pointer px-4 py-3 text-[--text] marker:text-[--text-muted]">
            Preview
          </summary>
          {/* sandbox="" : no scripts, no forms, no popups, a unique origin. */}
          <iframe
            title={`Preview: ${name}`}
            srcDoc={email.html}
            sandbox=""
            loading="lazy"
            className="block h-[70vh] min-h-[480px] w-full border-t border-[--rule] bg-white"
          />
        </details>
      )}
      {email.text && (
        <details className="border border-[--rule]" open={!email.html}>
          <summary className="t-micro cursor-pointer px-4 py-3 text-[--text] marker:text-[--text-muted]">
            {email.html ? "Plain-text part" : "Message (plain text only)"}
          </summary>
          <pre className="overflow-x-auto whitespace-pre-wrap break-words border-t border-[--rule] px-4 py-4 font-mono text-[13px] leading-relaxed text-[--text]">
            {email.text}
          </pre>
        </details>
      )}
    </div>
  );
}
