"use client";

import WaitlistFields from "./WaitlistFields";
import WaitlistShare from "./WaitlistShare";
import { cn } from "./cn";
import { useWaitlistSignup } from "./useWaitlistSignup";

/**
 * Email capture for the period before departures go on sale.
 *
 * Inline rather than a modal. A pop-up that interrupts someone before they
 * have read anything is the pattern that makes a site feel cheap, and this
 * brand is selling the opposite of cheap. Placed instead at the two points
 * where somebody has just learned the trips are not bookable yet, which is the
 * moment they actually want to be told when that changes.
 *
 * The submit path is the same server action the coming-soon page has always
 * used: it writes to waitlist_signups, syncs the address to the Resend
 * audience, and notifies the team. `placement` names the block in that
 * notification, so pass something that says which page it sits on.
 */
export default function WaitlistCTA({
  heading = "Be first to know",
  body = "First access to Telluride, and to every trip after it.",
  className,
  tone = "dark",
  /** Anchor target, so /trips#waitlist and /#waitlist land on the form. */
  id,
  placement = "inline",
}: {
  heading?: string;
  body?: string;
  className?: string;
  /** `dark` for a full-width band, `light` for a bordered block on paper. */
  tone?: "dark" | "light";
  id?: string;
  /** Which form this is, as reported with the signup. */
  placement?: string;
}) {
  const signup = useWaitlistSignup(placement);

  const dark = tone === "dark";

  return (
    <section
      id={id}
      // Clears the fixed header when linked to by anchor.
      className={cn(
        id && "scroll-mt-24 md:scroll-mt-32",
        dark ? "scheme-espresso scheme-paint" : "border border-[--rule] bg-[--surface-raised]",
        className,
      )}
    >
      <div className={cn(dark ? "shell py-20 md:py-28" : "p-8 md:p-10")}>
        <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start md:gap-16">
          <div>
            <h2 className="t-heading max-w-[16ch] text-[--text]">{heading}</h2>
            <p className="mt-5 max-w-measure font-body text-body leading-[1.7] text-[--text-secondary]">
              {body}
            </p>
          </div>

          {signup.status === "done" ? (
            <WaitlistShare compact className="motion-safe:animate-rise" />
          ) : (
            <WaitlistFields signup={signup} tone={tone} />
          )}
        </div>
      </div>
    </section>
  );
}
