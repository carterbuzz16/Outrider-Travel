"use client";;
import { use } from "react";

import Link from "next/link";
import { Alert, Button, Field, Input, Logo } from "@/components/ui";
import { signup } from "@/app/auth/actions";
import { MIN_PASSWORD_LENGTH, PASSWORD_RULE } from "@/lib/password";

/*
 * Client for the same single reason as /login: `Field` hands its control down
 * through a render-prop child, which cannot be passed from a Server Component.
 *
 * Unlike /login this page never receives the middleware's bounce directly, so
 * `next` arrives here already whole — /login builds it (folding the trip id
 * back on) and passes it through the "Create an account" link. All this page
 * has to do is carry it forward, and app/auth/actions.ts revalidates it.
 */

function safeNext(value: string | string[] | undefined): string | null {
  if (typeof value !== "string") return null;
  return value.startsWith("/") && !value.startsWith("//") ? value : null;
}

function describeError(raw: string): string {
  if (/already registered|already exists/i.test(raw)) {
    return "That email already has an account. Log in instead, or use a different address.";
  }
  // Supabase's own length complaint quotes the dashboard minimum, which can
  // be lower than ours — restate our rule instead so the two never disagree.
  // Our server-side copy (lib/password.ts) is already customer-facing and
  // falls through untouched.
  if (/password/i.test(raw) && /at least|weak|short/i.test(raw) && !/not the same/i.test(raw)) {
    return `Pick a password of at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (/invalid|valid email/i.test(raw)) {
    return "That email address does not look right. Check it and try again.";
  }
  return raw;
}

export default function SignupPage(
  props: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
  }
) {
  const searchParams = use(props.searchParams);
  const next = safeNext(searchParams.next);
  const error = typeof searchParams.error === "string" ? searchParams.error : undefined;

  const fromBooking = next?.startsWith("/bookings/new") ?? false;

  return (
    <main className="scheme-light scheme-paint flex min-h-screen flex-col justify-center py-14 md:py-20">
      <div className="shell w-full max-w-[34rem]">
        <Link href="/" className="inline-block no-underline" aria-label="Outrider, home">
          <Logo variant="inline" className="text-[--text]" />
        </Link>

        <div className="mt-12 flex flex-col gap-4 md:mt-16">
          <p className="stamp-type text-[--text-muted]">Outrider account</p>
          <h1 className="t-title text-[--text]">Create an account</h1>
          <p className="font-body text-body leading-[1.7] text-[--text-secondary]">
            {fromBooking
              ? "Your deposit holds the room, and a deposit needs an account to sit against. Set one up here and you land back on the trip you picked."
              : "One account covers every departure we run: ski weeks, spring break, formals."}
          </p>
        </div>

        {error && (
          <div className="mt-8">
            <Alert tone="error" title="We could not create that account">
              {describeError(error)}
            </Alert>
          </div>
        )}

        <form action={signup} className="mt-10 flex flex-col gap-7">
          {next && <input type="hidden" name="next" value={next} />}

          <Field label="Full name" required>
            {(field) => (
              <Input {...field} name="name" type="text" required autoComplete="name" />
            )}
          </Field>

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

          {/* The rule is stated here, under the box, rather than being sprung
              on someone after they submit. `minLength` catches it in the
              browser; app/auth/actions.ts checks both boxes again server-side,
              since neither attribute survives a direct POST. */}
          <Field label="Password" hint={PASSWORD_RULE} required>
            {(field) => (
              <Input
                {...field}
                name="password"
                type="password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                autoComplete="new-password"
              />
            )}
          </Field>

          <Field label="Confirm password" hint="Type it a second time." required>
            {(field) => (
              <Input
                {...field}
                name="confirm_password"
                type="password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                autoComplete="new-password"
              />
            )}
          </Field>

          <Button type="submit" variant="primary" size="md" block className="mt-1">
            Create account
          </Button>
        </form>

        <div className="mt-10 border-t border-[--rule] pt-6">
          <p className="font-body text-body-s text-[--text-secondary]">
            Already have an account?{" "}
            <Link
              href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
              className="text-[--accent] decoration-[--accent]"
            >
              Log in
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
