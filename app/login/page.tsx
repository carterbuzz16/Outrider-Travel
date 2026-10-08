"use client";;
import { use } from "react";

import Link from "next/link";
import { Alert, Button, Field, Input, Logo } from "@/components/ui";
import { login, resendConfirmation } from "@/app/auth/actions";
import { LOGIN_ERRORS, LOGIN_MESSAGES, flashText } from "@/lib/flash";
import { safePath } from "@/lib/safe-path";
import EmailCodeSignIn from "@/components/EmailCodeSignIn";

/*
 * Client component, and only for one reason: `Field` takes its control as a
 * render-prop child (see components/ui/Field.tsx), and a function cannot cross
 * the server/client boundary as a prop. There is no state here otherwise.
 *
 * The cost is that this route can't export `metadata` — it falls back to the
 * root layout's "Outrider". Worth it to keep the design system's one accessible
 * form scaffold rather than hand-rolling labels and aria wiring twice.
 */

/** Query keys this page owns; anything else on the URL belongs to `next`. */
const RESERVED = new Set(["next", "error", "message"]);

/**
 * Rebuild the post-login destination.
 *
 * lib/supabase/middleware.ts bounces a logged-out request by cloning the URL,
 * swapping the pathname for /login and adding `next=<pathname>`. The clone
 * keeps the original query string, so /bookings/new?trip=<id> arrives here as
 * /login?trip=<id>&next=%2Fbookings%2Fnew — the trip id is present but sitting
 * outside `next`, and would be dropped on the way back. Folding every
 * unreserved param onto `next` is what makes the trip survive the round trip.
 *
 * Only a same-site relative path is ever accepted, through the same guard
 * app/auth/actions.ts runs again server-side, since this value reaches it
 * through a form field the user can edit. The hand-rolled
 * `startsWith("/") && !startsWith("//")` that used to sit here let `/\evil.com`
 * through (lib/safe-path.ts explains why), and this value is printed into the
 * hidden fields and the signup link below. The params folded on afterwards
 * only ever follow the sanitised path, so they cannot move it off the site.
 */
function destination(searchParams: Record<string, string | string[] | undefined>): string {
  const safe = safePath(searchParams.next, "/bookings");

  const [path, query] = safe.split("?");
  const params = new URLSearchParams(query);
  for (const [key, value] of Object.entries(searchParams)) {
    if (RESERVED.has(key) || typeof value !== "string" || params.has(key)) continue;
    params.set(key, value);
  }

  const rebuilt = params.toString();
  return rebuilt ? `${path}?${rebuilt}` : path;
}

export default function LoginPage(
  props: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
  }
) {
  const searchParams = use(props.searchParams);
  const next = destination(searchParams);
  // Both arrive as codes (app/auth/actions.ts) and are looked up in
  // lib/flash.ts. Nothing from the URL is printed as it stands: a link to our
  // own login page must not be able to put its own words in our alert.
  const error = flashText(LOGIN_ERRORS, searchParams.error, LOGIN_ERRORS.login_failed);
  const message = flashText(LOGIN_MESSAGES, searchParams.message);

  // Someone who clicked "Reserve your spot" needs to know why a form appeared
  // between them and the trip they picked.
  const fromBooking = next.startsWith("/bookings/new");

  return (
    <main className="scheme-light scheme-paint flex min-h-screen flex-col justify-center py-14 md:py-20">
      <div className="shell w-full max-w-[34rem]">
        <Link href="/" className="inline-block no-underline" aria-label="Outrider, home">
          <Logo variant="inline" className="text-[--text]" />
        </Link>

        <div className="mt-12 flex flex-col gap-4 md:mt-16">
          <p className="stamp-type text-[--text-muted]">Outrider account</p>
          <h1 className="t-title text-[--text]">Log in</h1>
          <p className="font-body text-body leading-[1.7] text-[--text-secondary]">
            {fromBooking
              ? "We'll take you straight back to the trip you picked."
              : "Your trips, deposits and payment dates all sit here."}
          </p>
        </div>

        {(message || error) && (
          <div className="mt-8 flex flex-col gap-4">
            {message && (
              <Alert tone="info" title="One more step">
                {message}
              </Alert>
            )}
            {error && (
              <Alert tone="error" title="We could not log you in">
                {error}
              </Alert>
            )}
          </div>
        )}

        {/* The emailed code first (28 September 2026): no password to make up
            or forget, and the only way back in for anyone whose account was
            made at checkout with a code, since they never set a password. The
            password form is still here, folded, for accounts that have one;
            it opens by itself when a login error brings someone back. */}
        <div className="mt-10">
          <EmailCodeSignIn
            continueLabel="Log in"
            busyLabel="Logging you in"
            // A full load, so every server-rendered part of the next page (the
            // nav, the booking) is drawn signed in.
            onSignedIn={() => window.location.assign(next)}
          />
        </div>

        <details className="group mt-10 border-t border-[--rule] pt-6" open={Boolean(error)}>
          <summary
            className={[
              "flex cursor-pointer list-none items-center gap-3 py-2.5 -my-2.5",
              "t-label text-[--accent] transition-colors duration-fast",
              "hover:text-[--text] [&::-webkit-details-marker]:hidden",
            ].join(" ")}
          >
            <span>Use your password instead</span>
            <span aria-hidden="true" className="transition-transform duration-fast group-open:rotate-45">
              +
            </span>
          </summary>

          <form action={login} className="mt-6 flex flex-col gap-7">
          <input type="hidden" name="next" value={next} />

          <Field label="Email" required>
            {(field) => (
              <Input
                {...field}
                name="email"
                type="email"
                required
                autoComplete="email"
              />
            )}
          </Field>

          {/* The escape hatch sits with the field it is about, not buried at
              the foot of the page: the moment someone needs it is the moment
              they are staring at this box. */}
          <div className="flex flex-col gap-2.5">
            <Field label="Password" required>
              {(field) => (
                <Input
                  {...field}
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                />
              )}
            </Field>
            <Link
              href="/forgot-password"
              className="self-end font-body text-body-s text-[--accent] decoration-[--accent]"
            >
              Forgot your password?
            </Link>
          </div>

          <Button type="submit" variant="primary" size="md" block className="mt-1">
            Log in
          </Button>
        </form>
        </details>

        {/* Confirmation mail gets filtered, delayed and deleted. Without this
            the only way back is creating another account, which cannot work,
            because the address is already taken. Folded away so it does not
            compete with the login form. */}
        <details className="group mt-10 border-t border-[--rule] pt-6">
          <summary
            className={[
              "flex cursor-pointer list-none items-center gap-3 py-2.5 -my-2.5",
              "t-label text-[--accent] transition-colors duration-fast",
              "hover:text-[--text] [&::-webkit-details-marker]:hidden",
            ].join(" ")}
          >
            <span>Didn&rsquo;t get the confirmation email?</span>
            <span
              aria-hidden="true"
              className="transition-transform duration-fast group-open:rotate-45"
            >
              +
            </span>
          </summary>

          <form action={resendConfirmation} className="mt-5 flex flex-col gap-4">
            <input type="hidden" name="next" value={next} />
            <Field label="Email" hint="We will send the confirmation link again." required>
              {(field) => (
                <Input {...field} name="email" type="email" autoComplete="email" required />
              )}
            </Field>
            <Button type="submit" variant="secondary" size="sm" className="self-start">
              Resend confirmation
            </Button>
          </form>
        </details>

        <div className="mt-8 border-t border-[--rule] pt-6">
          <p className="font-body text-body-s text-[--text-secondary]">
            First trip with us? Enter your email above, and the code sets up your account. Rather
            have a password?{" "}
            <Link
              href={`/signup?next=${encodeURIComponent(next)}`}
              className="text-[--accent] decoration-[--accent]"
            >
              Create an account with one
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
