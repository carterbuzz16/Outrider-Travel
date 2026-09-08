import type { Metadata } from "next";
import Link from "next/link";
import { Button, Logo, Stamp } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { safePath } from "@/lib/safe-path";

export const metadata: Metadata = {
  title: "Email confirmed",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/*
 * The end of the signup email round trip.
 *
 * app/auth/actions.ts points `emailRedirectTo` at /auth/callback, which
 * exchanges the code and forwards here with the original `next` still riding
 * along. Before this page existed the link dropped people on /bookings, which
 * for a first-time account is an empty list and no confirmation that anything
 * worked — and for someone who was mid-booking it lost the trip entirely.
 *
 * Two states, and the difference is only ever which button is on offer:
 *  - session present (the normal case, same browser): they are already logged
 *    in, so the button goes straight on to the trip or their trips.
 *  - no session: the code was spent in another browser, or this URL was opened
 *    on its own. The account is still confirmed, so the page says so and sends
 *    them to log in with `next` intact.
 */

// Replaced by the shared guard in lib/safe-path.ts.

export default async function ConfirmedPage(
  props: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
  }
) {
  const searchParams = await props.searchParams;
  const next = safePath(searchParams.next, "/bookings");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // /bookings is the default `next` everything else in the auth flow falls
  // back to, so treat it as "no particular trip" rather than a destination
  // worth naming in the copy.
  const heldTrip = next?.startsWith("/bookings/new") ?? false;
  const destination = next ?? "/bookings";

  return (
    <main className="scheme-light scheme-paint flex min-h-screen flex-col justify-center py-14 md:py-20">
      <div className="shell w-full max-w-[34rem]">
        <Link href="/" className="inline-block no-underline" aria-label="Outrider, home">
          <Logo variant="inline" className="text-[--text]" />
        </Link>

        <div className="mt-12 flex items-start justify-between gap-8 md:mt-16">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <p className="stamp-type text-[--text-muted]">Outrider account</p>
            <h1 className="t-title text-[--text]">Email confirmed</h1>
            <p className="font-body text-body leading-[1.7] text-[--text-secondary]">
              {user
                ? `${user.email} is verified and the account is live. You are logged in on this device.`
                : "That address is verified and the account is live. Log in and everything is where you left it."}
            </p>
          </div>

          <Stamp text="Verified" className="hidden w-24 shrink-0 text-[--accent] sm:block" />
        </div>

        <div className="mt-10 flex flex-col gap-6 border-t border-[--rule] pt-8">
          <p className="font-body text-body-s leading-[1.7] text-[--text-secondary]">
            {heldTrip
              ? "Nothing is held yet. The spot is yours once the deposit is in, and the trip you picked is one click away."
              : "Your trips, deposits and payment dates all sit in one place."}
          </p>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            {user ? (
              <Button href={destination} variant="primary" size="md">
                {heldTrip ? "Back to the trip" : "Go to your trips"}
              </Button>
            ) : (
              <Button
                href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
                variant="primary"
                size="md"
              >
                Log in
              </Button>
            )}

            <Link href="/trips" className="font-body text-body-s text-[--accent] decoration-[--accent]">
              See every departure
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
