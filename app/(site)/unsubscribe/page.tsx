import type { Metadata } from "next";
import Link from "next/link";
import { unsubscribeByToken } from "@/lib/unsubscribe";
import { CONTACT } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

/**
 * The page behind the unsubscribe link in the footer of our mail.
 *
 * The link itself only opens this page. Removing somebody happens on the POST
 * below, because mail clients, scanners and link previewers all fetch the URLs
 * in a message, and a GET that unsubscribed would opt people out who never
 * clicked anything.
 */
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; done?: string }>;
}) {
  const { t = "", done } = await searchParams;

  async function confirm(formData: FormData) {
    "use server";
    const token = String(formData.get("t") ?? "");
    await unsubscribeByToken(token);
    const { redirect } = await import("next/navigation");
    // The answer is the same whether or not the token matched, so this page
    // cannot be used to test whether an address is on the list.
    redirect("/unsubscribe?done=1");
  }

  return (
    <main className="scheme-light scheme-paint">
      <section className="shell flex min-h-[70vh] flex-col justify-center py-20 md:py-28">
        {done ? (
          <div className="max-w-measure">
            <h1 className="t-title text-[--text]">You are unsubscribed</h1>
            <p className="mt-6 font-body text-body leading-[1.8] text-[--text-secondary]">
              You will not get announcement email from us again. If you have a
              booking with us, you will still get the email that belongs to it:
              receipts, payment notices and the details you need before you
              travel.
            </p>
            <p className="mt-6 font-body text-body leading-[1.8] text-[--text-secondary]">
              Changed your mind, or think this was a mistake? Write to{" "}
              <a
                href={`mailto:${CONTACT.email}`}
                className="text-[--accent] underline underline-offset-4"
              >
                {CONTACT.email}
              </a>
              .
            </p>
            <p className="mt-10">
              <Link href="/" className="t-label text-[--accent]">
                Back to Outrider
              </Link>
            </p>
          </div>
        ) : (
          <div className="max-w-measure">
            <h1 className="t-title text-[--text]">Leave the list?</h1>
            <p className="mt-6 font-body text-body leading-[1.8] text-[--text-secondary]">
              You will stop hearing when new departures open. Email about a
              booking you have already made is separate and will keep coming,
              because it is part of the trip rather than marketing.
            </p>
            <form action={confirm} className="mt-10">
              <input type="hidden" name="t" value={t} />
              <button
                type="submit"
                className="t-label border border-[--rule-strong] px-6 py-3.5 text-[--text] transition-colors duration-fast hover:bg-[--text] hover:text-[--surface]"
              >
                Unsubscribe me
              </button>
            </form>
          </div>
        )}
      </section>
    </main>
  );
}
