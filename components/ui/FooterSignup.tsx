"use client";

import { usePathname } from "next/navigation";
import WaitlistButton from "./WaitlistModal";

/**
 * The waitlist, at the bottom of every page.
 *
 * The footer is where someone lands after reading a page to the end, which is
 * a better moment to ask than the top of it. Before this it offered "Get in
 * touch", which asks a reader who has not decided anything to write a message.
 *
 * A button that opens the dialog rather than a form in place: the list now
 * asks for a name, a mobile number and two opt-ins, which is a form, not a
 * line, and squeezing it into a footer column would make it the worst version
 * of itself. The dialog is the same one the nav opens.
 *
 * Skipped on /waitlist, where the page's own close sits directly above and a
 * second way in would only be the first one again.
 */
export default function FooterSignup() {
  const pathname = usePathname();

  if (pathname === "/waitlist") return null;

  return (
    <div className="w-full max-w-sm">
      <p className="t-micro text-[--text]">Hear about departures first</p>
      <WaitlistButton label="Join the list" variant="primary" size="md" placement="footer" className="mt-4" />
      <p className="t-micro mt-3 text-[--text-muted]">Hear it first. Leave any time.</p>
    </div>
  );
}
