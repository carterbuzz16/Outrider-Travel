import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import UserNav from "@/components/UserNav";

/* Same reasoning as the protected layout: Disallow is a request, noindex is
 * the instruction. Admin should never appear in a result under any conditions. */
export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Outrider admin" },
  robots: { index: false, follow: false },
};

// Admin routes require both a logged-in user and role = 'admin'. The check
// lives in lib/admin.ts so the pages, server actions and CSV route handlers
// under here can repeat it: a layout does not guard a POST or a route handler.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    // The back office is paper-scheme only. There is no dark admin and no
    // hero: `scheme-paint` here just makes sure the surface is painted under
    // the whole tree rather than inherited from the body.
    <div className="scheme-light scheme-paint min-h-screen">
      <UserNav />

      {/* A second bar under the account nav, holding only the admin
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
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/trips", label: "Trips" },
  { href: "/admin/payments", label: "Flagged payments" },
  { href: "/admin/emails", label: "Emails" },
  { href: "/admin/launch", label: "Launch" },
];
