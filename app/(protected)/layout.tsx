import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import UserNav from "@/components/UserNav";

// Wraps any route that requires a logged-in user (e.g. booking pages).
// Middleware already redirects logged-out requests before they get here —
// this is the same check done again server-side, since middleware is a
// coarse first line of defense, not the source of truth.
//
// The `next` the two produce is not the same, and it can't be. Middleware sees
// the request URL and sets `next=<pathname>` on the bounce; a layout is handed
// neither the path nor the query string, and no request header in the App
// Router carries them reliably, so the only honest fallback here is /bookings.
// In practice this branch is a narrow race — a session expiring between the
// middleware check and this one — and the real deep link comes from middleware.
// See app/login/page.tsx for how the trip id is folded back onto `next`.
const FALLBACK_NEXT = "/bookings";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(FALLBACK_NEXT)}`);
  }

  return (
    <div className="scheme-light scheme-paint flex min-h-screen flex-col">
      <UserNav />
      <div className="flex-1">{children}</div>
    </div>
  );
}
