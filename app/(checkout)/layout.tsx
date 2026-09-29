import type { Metadata } from "next";
import UserNav from "@/components/UserNav";

/*
 * Checkout's first step, open to everyone (28 September 2026).
 *
 * /bookings/new used to sit in app/(protected), behind the login wall: a
 * first-time visitor tapping Reserve landed on "Log in", then a signup form
 * with two passwords, then their inbox, before they ever saw a price. The
 * owner wants checkout as simple as possible, so now the packages, the plans
 * and the exact figures are open, and the account is made at the moment it is
 * needed: "Continue" asks for an email and a 6-digit code right there in the
 * order panel (components/EmailCodeSignIn.tsx), then goes straight on to the
 * next step. Everything after this step is still in app/(protected).
 *
 * Nothing here is private. createBooking is still the control: it requires a
 * signed-in user with a confirmed email, and a verified code is exactly that.
 *
 * Same frame as the protected layout, minus the redirect, and kept out of
 * search results the same way.
 */
export const metadata: Metadata = {
  title: { default: "Book your spot", template: "%s | Outrider" },
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="scheme-light scheme-paint flex min-h-screen flex-col">
      <UserNav />
      <div className="flex-1">{children}</div>
    </div>
  );
}
