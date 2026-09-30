"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Dialog, cn } from "@/components/ui";
import EmailCodeSignIn from "@/components/EmailCodeSignIn";

/*
 * The new-account credit, on the page (lib/welcome-credit.ts has the rules).
 *
 * /telluride is where Instagram ads land, and it stays static and cached, so
 * nothing here is rendered on the server: the provider asks
 * /api/welcome-credit once, after hydration, and everything else reads its
 * answer. Three pieces share it:
 *
 *   - the pop-up: a signed-out visitor gets the offer once, a few seconds in,
 *     and makes their account inside it with the same emailed code checkout
 *     uses. It comes back at most every few days, and "Claim $100" in the
 *     masthead reopens it any time;
 *   - CreditLine, under the masthead's button: the offer in one line, or the
 *     countdown once the credit is theirs;
 *   - useWelcomeCredit, for anything else that wants the countdown (the phone
 *     Reserve bar).
 *
 * The countdown is real: it runs to the moment the credit stops applying at
 * checkout, taken from the account's own creation time.
 */

type CreditState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "active"; amount: number; expiresAt: string }
  | { status: "none" };

type CreditContext = {
  state: CreditState;
  openOffer: () => void;
};

const Context = createContext<CreditContext | null>(null);

/** The credit as the provider knows it, or null outside one (the trip pages). */
export function useWelcomeCredit(): CreditContext | null {
  return useContext(Context);
}

/** Seconds on the page before the offer opens by itself. */
const OFFER_DELAY_MS = 6000;
/** How long after it was shown before it opens by itself again. */
const OFFER_QUIET_DAYS = 3;
const OFFERED_KEY = "outrider_credit_offered";

/** Browser storage can be missing or throw (private windows, blocked site data). */
function recentlyOffered(): boolean {
  try {
    const at = Number(window.localStorage.getItem(OFFERED_KEY));
    return Number.isFinite(at) && Date.now() - at < OFFER_QUIET_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function markOffered() {
  try {
    window.localStorage.setItem(OFFERED_KEY, String(Date.now()));
  } catch {
    // Without storage it may simply open again on the next visit.
  }
}

async function fetchState(): Promise<CreditState> {
  try {
    const response = await fetch("/api/welcome-credit", { cache: "no-store" });
    if (!response.ok) return { status: "none" };
    const body = await response.json();
    if (body?.state === "active" && typeof body.expiresAt === "string") {
      return { status: "active", amount: Number(body.amount), expiresAt: body.expiresAt };
    }
    return body?.state === "signed-out" ? { status: "signed-out" } : { status: "none" };
  } catch {
    // Offline or blocked: say nothing rather than offer what may not apply.
    return { status: "none" };
  }
}

export function WelcomeCreditProvider({
  bookHref,
  children,
}: {
  /** Where "Choose your package" goes once the credit is theirs. */
  bookHref: string;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<CreditState>({ status: "loading" });
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLElement | null>(null);

  const refresh = useCallback(async () => setState(await fetchState()), []);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // The credit ends while the page is open: stop showing it, rather than a
  // countdown stuck at 00:00:00 over a credit checkout will no longer apply.
  const expiresAt = state.status === "active" ? state.expiresAt : null;
  useEffect(() => {
    if (!expiresAt) return;
    const timer = window.setTimeout(() => setState({ status: "none" }), Math.max(0, Date.parse(expiresAt) - Date.now()));
    return () => window.clearTimeout(timer);
  }, [expiresAt]);

  // The pop-up, once, for a signed-out visitor who has not seen it lately.
  useEffect(() => {
    if (state.status !== "signed-out" || recentlyOffered()) return;
    const timer = window.setTimeout(() => {
      // Not while the tab is in the background: they would come back to it
      // already open over a page they never saw.
      if (document.visibilityState !== "visible") return;
      markOffered();
      setOpen(true);
    }, OFFER_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [state.status]);

  const openOffer = useCallback(() => {
    opener.current = document.activeElement as HTMLElement | null;
    markOffered();
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    // Focus back where it was, when something on the page opened it.
    opener.current?.focus?.();
    opener.current = null;
  }, []);

  return (
    <Context.Provider value={{ state, openOffer }}>
      {children}
      <WelcomeOffer open={open} onClose={close} state={state} onSignedIn={refresh} bookHref={bookHref} />
    </Context.Provider>
  );
}

/* -- the pop-up ---------------------------------------------------------------- */

function WelcomeOffer({
  open,
  onClose,
  state,
  onSignedIn,
  bookHref,
}: {
  open: boolean;
  onClose: () => void;
  state: CreditState;
  onSignedIn: () => Promise<void>;
  bookHref: string;
}) {
  const router = useRouter();

  if (state.status === "active") {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        sheet
        band={{ eyebrow: "You're in" }}
        title={
          <>
            <span className="block font-display text-display-m font-medium leading-[1.08] tracking-title">
              You have $100 credit in your account
            </span>
            <span className="mt-3 block t-subheading">
              Use it in the next <Countdown expiresAt={state.expiresAt} />
            </span>
          </>
        }
        description="It's already applied at checkout, whichever package and dates you pick. No code needed."
      >
        <div className="mt-7 flex flex-col gap-3">
          <Button href={bookHref} variant="primary" size="lg" block>
            Choose your package
          </Button>
          <Button type="button" variant="ghost" size="md" block onClick={onClose}>
            Keep looking
          </Button>
        </div>
      </Dialog>
    );
  }

  if (state.status === "none") {
    // Only reached by signing in here with an account older than a day.
    return (
      <Dialog
        open={open}
        onClose={onClose}
        sheet
        band={{ eyebrow: "Welcome back" }}
        title={<span className="block t-heading">You&rsquo;re signed in</span>}
        description="The $100 is for accounts made in the last 24 hours, and yours is older than that. Everything else on the trip is the same."
      >
        <div className="mt-7 flex flex-col gap-3">
          <Button href={bookHref} variant="primary" size="lg" block>
            Choose your package
          </Button>
          <Button type="button" variant="ghost" size="md" block onClick={onClose}>
            Keep looking
          </Button>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      sheet
      band={{ eyebrow: "New here" }}
      title={
        <>
          <span className="block font-display text-display-l font-medium leading-none tracking-title">$100 credit</span>
          <span className="mt-2 block t-subheading">for your Telluride trip</span>
        </>
      }
      // Not "you have $100 in your account": until the code checks out there
      // is no account to hold it. It is theirs the moment there is.
      description="Make your account and $100 goes straight into it, ready at checkout. It's good for 24 hours."
    >
      <div className="mt-6">
        <EmailCodeSignIn
          askName
          offerList
          continueLabel="Claim my $100"
          busyLabel="Setting up your account"
          onSignedIn={async () => {
            await onSignedIn();
            // The nav's account link, and anything else that reads the session.
            router.refresh();
          }}
        />
      </div>
      <p className="mt-5 font-body text-body-s leading-[1.6] text-[--text-secondary]">
        One per new account, off one trip booked within 24 hours of making it. It doesn&rsquo;t combine with
        discount codes.
      </p>
      <button
        type="button"
        onClick={onClose}
        className="mt-2 min-h-11 font-body text-body-s text-[--text-secondary] underline underline-offset-4 transition-colors duration-fast hover:text-[--text]"
      >
        No thanks
      </button>
    </Dialog>
  );
}

/* -- the countdown ---------------------------------------------------------------- */

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Time left as 23:59:41, ticking. Nothing is announced as it ticks (no live
 * region): a screen reader reading the time out every second is worse than
 * reading it once. Renders a placeholder until mounted, so the server markup
 * and the first client paint agree. `onExpire` runs once, when it reaches zero.
 */
export function Countdown({
  expiresAt,
  onExpire,
  className,
}: {
  expiresAt: string;
  onExpire?: () => void;
  className?: string;
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const end = Date.parse(expiresAt);
  const left = now === null ? null : Math.max(0, end - now);

  const expired = left === 0;
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;
  useEffect(() => {
    if (expired) onExpireRef.current?.();
  }, [expired]);
  const text =
    left === null
      ? "--:--:--"
      : `${pad(Math.floor(left / 3_600_000))}:${pad(Math.floor(left / 60_000) % 60)}:${pad(Math.floor(left / 1000) % 60)}`;

  return (
    <time dateTime={expiresAt} className={cn("tabular-nums", className)}>
      {text}
    </time>
  );
}

/* -- the line under the masthead's button ----------------------------------------- */

/**
 * The offer in one line for someone who closed the pop-up, or the countdown
 * once the credit is theirs. Holds its height while loading so the masthead
 * does not jump when the answer arrives.
 */
export function CreditLine({ className }: { className?: string }) {
  const credit = useWelcomeCredit();
  const state = credit?.state ?? { status: "none" };

  return (
    <div className={cn("min-h-[1.5rem] font-body text-body-s leading-[1.55] text-[--text-secondary]", className)}>
      {state.status === "signed-out" && (
        <p className="m-0">
          New here? Make an account and get $100 credit.{" "}
          <button
            type="button"
            onClick={credit?.openOffer}
            className="font-medium text-[--accent] underline underline-offset-4"
          >
            Claim $100
          </button>
        </p>
      )}
      {state.status === "active" && (
        <p className="m-0 flex flex-wrap items-baseline gap-x-2">
          <span className="font-medium text-[--text]">You have $100 credit in your account.</span>
          <span>
            <Countdown expiresAt={state.expiresAt} className="text-[--text]" /> left to use it.
          </span>
        </p>
      )}
    </div>
  );
}
