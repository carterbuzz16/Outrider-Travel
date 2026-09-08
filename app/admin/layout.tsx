import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import UserNav from "@/components/UserNav";

// Admin routes require both a logged-in user and role = 'admin'. The role
// check reads public.users through the signed-in user's own Supabase
// client, relying on the "Users can view own profile" RLS policy — no
// service-role key needed for this.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/bookings");
  }

  return (
    // The back office is paper-scheme only. There is no dark admin and no
    // hero: `scheme-paint` here just makes sure the surface is painted under
    // the whole tree rather than inherited from the body.
    <div className="scheme-light scheme-paint min-h-screen">
      <UserNav />

      {/* A second bar under the account nav, holding only the three admin
          screens. It is a plain link row rather than tabs: without a client
          component there is no reliable active state, and a wrong highlight
          is worse than none. */}
      <div className="border-b border-[--rule] bg-[--surface-raised]">
        <nav className="shell flex flex-wrap items-center gap-x-6 gap-y-2 py-3" aria-label="Admin">
          <span className="t-micro text-[--text-muted]">Back office</span>
          <span aria-hidden="true" className="h-3 w-px bg-[--rule]" />
          {ADMIN_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="t-micro text-[--text-secondary] no-underline transition-colors duration-fast hover:text-[--text]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      {children}
    </div>
  );
}

const ADMIN_LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/trips", label: "Trips" },
  { href: "/admin/payments", label: "Flagged payments" },
];
