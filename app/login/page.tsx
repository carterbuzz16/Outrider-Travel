"use client";;
import { use } from "react";

import Link from "next/link";
import { Alert, Button, Field, Input, Logo } from "@/components/ui";
import { login } from "@/app/auth/actions";

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
 * Only a same-site relative path is ever accepted; app/auth/actions.ts checks
 * the same thing again server-side, since this value reaches it through a form
 * field the user can edit.
 */
function destination(searchParams: Record<string, string | string[] | undefined>): string {
  const raw = typeof searchParams.next === "string" ? searchParams.next : "";
  const safe = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/bookings";

  const [path, query] = safe.split("?");
  const params = new URLSearchParams(query);
  for (const [key, value] of Object.entries(searchParams)) {
    if (RESERVED.has(key) || typeof value !== "string" || params.has(key)) continue;
    params.set(key, value);
  }

  const rebuilt = params.toString();
  return rebuilt ? `${path}?${rebuilt}` : path;
}

/**
 * Supabase's own error strings are terse and occasionally leak implementation
 * ("Invalid login credentials"). Rewrite the ones a customer will actually hit;
 * anything unrecognised still renders inside an Alert with a heading rather
 * than as a bare line of text.
 */
function describeError(raw: string): string {
  if (/invalid login credentials/i.test(raw)) {
    return "That email and password do not match an account. Check both, or create an account if this is your first trip.";
  }
  if (/email not confirmed/i.test(raw)) {
    return "Confirm your email first. The link is in the message we sent when you signed up.";
  }
  // Rate-limit copy is ours already (app/auth/actions.ts), so it passes through.
  return raw;
}

export default function LoginPage(
  props: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
  }
) {
  const searchParams = use(props.searchParams);
  const next = destination(searchParams);
  const error = typeof searchParams.error === "string" ? searchParams.error : undefined;
  const message = typeof searchParams.message === "string" ? searchParams.message : undefined;

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
              ? "A deposit holds the room, and it has to sit against an account. Log in and we will take you straight back to the trip you picked."
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
                {describeError(error)}
              </Alert>
            )}
          </div>
        )}

        <form action={login} className="mt-10 flex flex-col gap-7">
          <input type="hidden" name="next" value={next} />

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

        <div className="mt-10 border-t border-[--rule] pt-6">
          <p className="font-body text-body-s text-[--text-secondary]">
            First trip with us?{" "}
            <Link
              href={`/signup?next=${encodeURIComponent(next)}`}
              className="text-[--accent] decoration-[--accent]"
            >
              Create an account
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
