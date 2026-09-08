"use client";;
import { use } from "react";

import Link from "next/link";
import { Alert, Button, Field, Input, Logo } from "@/components/ui";
import { requestPasswordReset } from "@/app/auth/actions";

/*
 * Client for the same single reason as /login and /signup: `Field` hands its
 * control down through a render-prop child, which cannot cross the
 * server/client boundary. No state lives here — the two states this page has
 * (asking, and having asked) are both driven by the query string, so the
 * confirmation survives a refresh and can be linked to.
 *
 * The one rule this page exists to hold: the answer is the same whether or not
 * the address has an account. app/auth/actions.ts throws Supabase's result
 * away for that reason, and nothing here may re-introduce the difference —
 * no "we could not find that email", no different wording, no different timing
 * we can control.
 */

export default function ForgotPasswordPage(
  props: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
  }
) {
  const searchParams = use(props.searchParams);
  const sent = searchParams.sent === "1";
  const error = typeof searchParams.error === "string" ? searchParams.error : undefined;

  return (
    <main className="scheme-light scheme-paint flex min-h-screen flex-col justify-center py-14 md:py-20">
      <div className="shell w-full max-w-[34rem]">
        <Link href="/" className="inline-block no-underline" aria-label="Outrider, home">
          <Logo variant="inline" className="text-[--text]" />
        </Link>

        <div className="mt-12 flex flex-col gap-4 md:mt-16">
          <p className="stamp-type text-[--text-muted]">Outrider account</p>
          <h1 className="t-title text-[--text]">{sent ? "Check your email" : "Reset your password"}</h1>
          <p className="font-body text-body leading-[1.7] text-[--text-secondary]">
            {sent
              ? "If that address has an Outrider account, a reset link is on its way to it. Use it soon: the link expires, and it only works once."
              : "Give us the email on your account and we will send a link that sets a new password. Your trips and deposits are untouched."}
          </p>
        </div>

        {error && (
          <div className="mt-8">
            <Alert tone="error" title="We could not send that">
              {error}
            </Alert>
          </div>
        )}

        {sent ? (
          <div className="mt-10 flex flex-col gap-6 border-t border-[--rule] pt-8">
            <p className="font-body text-body-s leading-[1.7] text-[--text-secondary]">
              Nothing after a few minutes? Look in spam, then check you typed the address you
              signed up with.
            </p>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
              <Button href="/login" variant="secondary" size="md">
                Back to log in
              </Button>
              <Link
                href="/forgot-password"
                className="font-body text-body-s text-[--accent] decoration-[--accent]"
              >
                Try a different address
              </Link>
            </div>
          </div>
        ) : (
          <>
            <form action={requestPasswordReset} className="mt-10 flex flex-col gap-7">
              <Field label="Email" required>
                {(field) => (
                  <Input
                    {...field}
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@college.edu"
                  />
                )}
              </Field>

              <Button type="submit" variant="primary" size="md" block className="mt-1">
                Send reset link
              </Button>
            </form>

            <div className="mt-10 border-t border-[--rule] pt-6">
              <p className="font-body text-body-s text-[--text-secondary]">
                Remembered it?{" "}
                <Link href="/login" className="text-[--accent] decoration-[--accent]">
                  Log in
                </Link>
                .
              </p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
