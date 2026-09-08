import Link from "next/link";
import { Button, Logo } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";

/**
 * Chrome for the signed-in areas of the site (the booking flow and admin).
 *
 * Deliberately not the marketing `NavBar`: that one is fixed, transparent over
 * a hero and carries a "Reserve a spot" call to action, none of which belongs
 * above an account view. This is the same hairline-on-paper bar in its solid
 * state, in the document flow, holding only the places a signed-in person
 * actually goes.
 *
 * A Server Component — it reads the session and the role, and the only control
 * on it is a form posting a server action, so nothing here needs hydrating.
 */
export default async function UserNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Reachable only in the gap between a session expiring and the layout's own
    // redirect firing. Kept so the bar never renders half-built.
    return (
      <header className="scheme-light scheme-paint border-b border-[--rule]">
        <nav className="shell flex min-h-16 flex-wrap items-center justify-between gap-4 py-3" aria-label="Account">
          <Link href="/" className="no-underline" aria-label="Outrider, home">
            <Logo variant="inline" className="text-[--text]" />
          </Link>
          <Button href="/login" variant="secondary" size="sm">
            Log in
          </Button>
        </nav>
      </header>
    );
  }

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();

  return (
    <header className="scheme-light scheme-paint border-b border-[--rule]">
      <nav
        className="shell flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-3 py-3 md:min-h-20"
        aria-label="Account"
      >
        <Link href="/" className="no-underline" aria-label="Outrider, home">
          {/* The wordmark is 104px wide before the mark and the gap; below 640px
              that is most of the row, so the mark carries the brand on its own. */}
          <Logo variant="mark" className="w-6 text-[--text] sm:hidden" />
          <Logo variant="inline" className="hidden text-[--text] sm:inline-flex" />
        </Link>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:gap-x-7">
          <Link
            href="/trips"
            className="t-micro text-[--text-secondary] no-underline transition-colors duration-fast hover:text-[--text]"
          >
            Trips
          </Link>
          <Link
            href="/bookings"
            className="t-micro text-[--text-secondary] no-underline transition-colors duration-fast hover:text-[--text]"
          >
            Bookings
          </Link>
          {profile?.role === "admin" && (
            <Link
              href="/admin"
              className="t-micro text-[--text-secondary] no-underline transition-colors duration-fast hover:text-[--text]"
            >
              Admin
            </Link>
          )}
          <form action={logout} className="flex items-center">
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </nav>
    </header>
  );
}
