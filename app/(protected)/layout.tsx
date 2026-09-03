import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import UserNav from "@/components/UserNav";

// Wraps any route that requires a logged-in user (e.g. booking pages).
// Middleware already redirects logged-out requests before they get here —
// this is the same check done again server-side, since middleware is a
// coarse first line of defense, not the source of truth.
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <UserNav />
      {children}
    </>
  );
}
