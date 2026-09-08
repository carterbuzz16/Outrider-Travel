import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Button, Logo } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import ResetPasswordForm from "./ResetPasswordForm";

export const metadata: Metadata = {
  title: "Set a new password",
  // A password form has no business in a search index, and the URL is only
  // ever reached from an emailed link.
  robots: { index: false, follow: false },
};

/*
 * Reached from a recovery link, which app/auth/callback/route.ts has already
 * turned into a session before forwarding here (it branches on `type=recovery`
 * so a reset never lands on /bookings).
 *
 * That session is the only thing that authorises the change, so this page has
 * to cope with it not being there: an expired link, a link already used, a
 * second tab that finished the reset first, or someone typing the URL in
 * directly. None of those may throw — they get the same quiet dead end with a
 * way to ask for another link.
 */
export default async function ResetPasswordPage(
  props: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
  }
) {
  const searchParams = await props.searchParams;
  const error = typeof searchParams.error === "string" ? searchParams.error : undefined;

  const supabase = await createClient();
  // getUser revalidates against Supabase rather than reading the cookie, so a
  // spent or expired recovery link fails here rather than at submit time.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="scheme-light scheme-paint flex min-h-screen flex-col justify-center py-14 md:py-20">
      <div className="shell w-full max-w-[34rem]">
        <Link href="/" className="inline-block no-underline" aria-label="Outrider, home">
          <Logo variant="inline" className="text-[--text]" />
        </Link>

        <div className="mt-12 flex flex-col gap-4 md:mt-16">
          <p className="stamp-type text-[--text-muted]">Outrider account</p>
          <h1 className="t-title text-[--text]">
            {user ? "Set a new password" : "This link is no longer good"}
          </h1>
          <p className="font-body text-body leading-[1.7] text-[--text-secondary]">
            {user
              ? `Pick something you have not used elsewhere. It replaces the old password on ${user.email} straight away, and we will ask you to log in with it.`
              : "Reset links run out, and each one works once. Ask for a fresh link and it will be in your inbox within a minute or two."}
          </p>
        </div>

        {error && (
          <div className="mt-8">
            <Alert tone="error" title="We could not save that">
              {error}
            </Alert>
          </div>
        )}

        {user ? (
          <ResetPasswordForm />
        ) : (
          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-[--rule] pt-8">
            <Button href="/forgot-password" variant="primary" size="md">
              Send a new link
            </Button>
            <Link href="/login" className="font-body text-body-s text-[--accent] decoration-[--accent]">
              Back to log in
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
