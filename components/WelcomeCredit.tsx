"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { track } from "@vercel/analytics";
import { Button, CheckRow, Dialog, Field, Input, cn } from "@/components/ui";
import { captureFirstTouch, firstTouchContext } from "@/components/ui/useWaitlistSignup";
import { claimCodeOffer } from "@/app/code-offer-actions";
import { CODE_OFFER_OPEN, formatOfferDeadline, offerExpiry, OFFER_AMOUNT } from "@/lib/code-offer";
import { CODE_OFFER_PROMISE, EMAIL_CONSENT_LABEL } from "@/lib/waitlist-consent";
import { HONEYPOT_FIELD, HONEYPOT_STYLE, honeypotValue } from "@/lib/honeypot";
import { pixelEvent } from "@/lib/meta-pixel";

/*
 * $100 off on /telluride, where the Instagram ads land.
 *
 * Two offers meet here. Since 1 October 2026 the one the page makes is the
 * $100 code by email (lib/code-offer.ts): one field, a code of their own on
 * screen straight away, good for a week. The new-account credit
 * (lib/welcome-credit.ts) still exists, $100 for the first 24 hours of any
 * account, but the page no longer sells it; it shows only as a countdown for
 * someone who already has it running.
 *
 * The page stays static and cached, so nothing here renders on the server:
 * the provider asks /api/welcome-credit once, after hydration, which answers
 * with the credit and with any code this browser already asked for. Three
 * pieces read that answer:
 *
 *   - the sheet: once the visitor has scrolled past the price and Reserve
 *     (data-offer-after on the masthead), or after a while on the page,
 *     whichever is first. Not a few seconds in: on a phone that was before
 *     the price, asking for something before saying what the trip costs. It
 *     comes back at most every few days, and the link under Reserve reopens it
 *     any time;
 *   - CreditLine, under the masthead's button: the offer in one line, the code
 *     once they have one, or the credit's countdown;
 *   - useWelcomeCredit, for anything else that wants them (the phone Reserve
 *     bar).
 *
 * Nobody is offered both: someone with the credit running already has $100
 * off, and the code would not combine with it.
 *
 * Since 5 October 2026 neither is offered: the code is switched off
 * (CODE_OFFER_OPEN) and new accounts get no credit (WELCOME_CREDIT_ENDS),
 * because $100 off is now for chapter members, through their chapter's code.
 * So the sheet never opens and the line under Reserve stays empty, unless
 * someone already has a code or a running credit to be shown.
 */

type CreditState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "active"; amount: number; expiresAt: string }
  | { status: "none" };

/** A code this browser asked for, while it still works. */
export type ClaimedOffer = { code: string; expiresAt: string };

type CreditContext = {
  state: CreditState;
  offer: ClaimedOffer | null;
  /** True while there is something to offer: no credit running, no code yet. */
  canOffer: boolean;
  openOffer: () => void;
};

const Context = createContext<CreditContext | null>(null);

/** The credit and the code as the provider knows them, or null outside one (the trip pages). */
export function useWelcomeCredit(): CreditContext | null {
  return useContext(Context);
}

/** After the price has gone past, a moment's pause, so it does not land mid-flick. */
const AFTER_PRICE_DELAY_MS = 1200;
/** For someone reading without scrolling that far. */
const OFFER_FALLBACK_MS = 45_000;
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

function readOffer(raw: unknown): ClaimedOffer | null {
  if (!raw || typeof raw !== "object") return null;
  const { code, expiresAt } = raw as Record<string, unknown>;
  return typeof code === "string" && typeof expiresAt === "string" ? { code, expiresAt } : null;
}

async function fetchState(): Promise<{ state: CreditState; offer: ClaimedOffer | null }> {
  try {
    const response = await fetch("/api/welcome-credit", { cache: "no-store" });
    if (!response.ok) return { state: { status: "none" }, offer: null };
    const body = await response.json();
    if (body?.state === "active" && typeof body.expiresAt === "string") {
      return { state: { status: "active", amount: Number(body.amount), expiresAt: body.expiresAt }, offer: null };
    }
    return {
      state: body?.state === "signed-out" ? { status: "signed-out" } : { status: "none" },
      offer: readOffer(body?.offer),
    };
  } catch {
    // Offline or blocked: say nothing rather than offer what may not apply.
    return { state: { status: "none" }, offer: null };
  }
}

export function WelcomeCreditProvider({
  bookHref,
  children,
}: {
  /** Where "Book with my code" goes. The cookie carries the code there. */
  bookHref: string;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<CreditState>({ status: "loading" });
  const [offer, setOffer] = useState<ClaimedOffer | null>(null);
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    void fetchState().then((answer) => {
      setState(answer.state);
      setOffer(answer.offer);
    });
  }, []);

  // The credit ends while the page is open: stop showing it, rather than a
  // countdown stuck at 00:00:00 over a credit checkout will no longer apply.
  const expiresAt = state.status === "active" ? state.expiresAt : null;
  useEffect(() => {
    if (!expiresAt) return;
    const timer = window.setTimeout(() => setState({ status: "none" }), Math.max(0, Date.parse(expiresAt) - Date.now()));
    return () => window.clearTimeout(timer);
  }, [expiresAt]);

  const canOffer = CODE_OFFER_OPEN && (state.status === "signed-out" || state.status === "none") && !offer;

  // The sheet, once, after the price, for someone with nothing to claim yet.
  useEffect(() => {
    if (!canOffer || recentlyOffered()) return;
    let shown = false;
    let pause: number | undefined;
    const show = () => {
      // Not while the tab is in the background: they would come back to it
      // already open over a page they never saw. Asked again here, because
      // "Get my code" under Reserve may have opened it, and been told no
      // thanks, since this was set up.
      if (shown || recentlyOffered() || document.visibilityState !== "visible") return;
      shown = true;
      markOffered();
      setOpen(true);
    };

    // "Past" is the masthead's price and Reserve leaving the top of the
    // screen: they have seen what it costs and kept reading.
    const target = document.querySelector("[data-offer-after]");
    let observer: IntersectionObserver | undefined;
    if (target && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(([entry]) => {
        if (entry && !entry.isIntersecting && entry.boundingClientRect.bottom <= 0) {
          observer?.disconnect();
          pause = window.setTimeout(show, AFTER_PRICE_DELAY_MS);
        }
      });
      observer.observe(target);
    }
    const fallback = window.setTimeout(show, OFFER_FALLBACK_MS);

    return () => {
      observer?.disconnect();
      window.clearTimeout(pause);
      window.clearTimeout(fallback);
    };
  }, [canOffer]);

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
    <Context.Provider value={{ state, offer, canOffer, openOffer }}>
      {children}
      <OfferSheet open={open} onClose={close} offer={offer} onClaimed={setOffer} bookHref={bookHref} />
    </Context.Provider>
  );
}

/* -- the sheet ------------------------------------------------------------------ */

function OfferSheet({
  open,
  onClose,
  offer,
  onClaimed,
  bookHref,
}: {
  open: boolean;
  onClose: () => void;
  offer: ClaimedOffer | null;
  onClaimed: (offer: ClaimedOffer) => void;
  bookHref: string;
}) {
  const [email, setEmail] = useState("");
  const [list, setList] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field: boolean; message: string } | null>(null);
  const [emailed, setEmailed] = useState<boolean | null>(null);
  // The address already had a live code, which went to its inbox again.
  const [sentAgain, setSentAgain] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    // Read now, while the event still has its form.
    const honeypot = honeypotValue(event.currentTarget);
    if (!email.trim()) {
      setError({ field: true, message: "Enter your email." });
      return;
    }
    captureFirstTouch();
    setBusy(true);
    setError(null);
    try {
      const result = await claimCodeOffer(
        { email, emailConsent: list },
        { placement: "telluride-code", ...firstTouchContext() },
        honeypot,
      );
      if (!result.ok) {
        setError({ field: result.field === "email", message: result.message });
        return;
      }
      if (!result.code) {
        // An address that already had a code: emailed again, never shown here,
        // since whoever typed it may not own it. Not a Lead: it was counted
        // the first time, and Meta should learn from new addresses only.
        setSentAgain(true);
        return;
      }
      setEmailed(result.emailed);
      onClaimed({ code: result.code, expiresAt: result.expiresAt });
      track("Code offer", { source: firstTouchContext().source ?? null });
      // To Meta, only that it happened: never the address (lib/meta-pixel.ts).
      pixelEvent("Lead");
    } catch {
      // The action returns its failures, so this is the request itself.
      setError({ field: false, message: "Something went wrong. Try again." });
    } finally {
      setBusy(false);
    }
  }

  if (offer) {
    const deadline = formatOfferDeadline(offer.expiresAt);
    return (
      <Dialog
        open={open}
        onClose={onClose}
        sheet
        band={{ eyebrow: "It's yours" }}
        title={
          <>
            <span className="block t-label">Your code</span>
            <span className="mt-3 block break-all font-display text-display-m font-medium leading-none tracking-[0.04em]">
              {offer.code}
            </span>
          </>
        }
        description={`$${OFFER_AMOUNT} off one Telluride trip, good through ${deadline}. It comes off by itself when you reserve on this device.${
          emailed ? " We've emailed it to you too." : ""
        }`}
      >
        <div className="mt-7 flex flex-col gap-3">
          <Button href={bookHref} variant="primary" size="lg" block>
            Book with my code
          </Button>
          <ShareTrip />
          <Button type="button" variant="ghost" size="md" block onClick={onClose}>
            Keep looking
          </Button>
        </div>
      </Dialog>
    );
  }

  if (sentAgain) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        sheet
        band={{ eyebrow: "Already sent" }}
        title={<span className="block t-heading">Check your inbox</span>}
        // True whether or not this request mailed it again: an address that
        // has unsubscribed is not mailed, but had the code when it asked.
        description="That address already has a code. It's in an email from us called “Your $100 off Telluride”. If it isn't there, check spam."
      >
        <div className="mt-7 flex flex-col gap-3">
          <Button type="button" variant="primary" size="lg" block onClick={onClose}>
            Keep looking
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="md"
            block
            onClick={() => {
              setSentAgain(false);
              setEmail("");
            }}
          >
            Use a different email
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
      band={{ eyebrow: "Planning with friends?" }}
      title={
        <>
          <span className="block font-display text-display-l font-medium leading-none tracking-title">
            ${OFFER_AMOUNT} off
          </span>
          <span className="mt-2 block t-subheading">your Telluride trip</span>
        </>
      }
      // Worked out here rather than promised as "a week": the same deadline
      // the code will carry, unless they wait past midnight Mountain Time.
      description={`A code of your own, good through ${formatOfferDeadline(offerExpiry())}, so your group has a week to decide.`}
    >
      <form onSubmit={submit} noValidate className="mt-6 flex flex-col gap-4">
        <Field label="Email" required hint={CODE_OFFER_PROMISE} error={error?.field ? error.message : undefined}>
          {(field) => (
            <Input
              {...field}
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
            />
          )}
        </Field>
        {/* The bot trap (lib/honeypot.ts), between the fields and the button,
            never first or last, so the dialog's focus never lands on it. */}
        <input
          type="text"
          name={HONEYPOT_FIELD}
          defaultValue=""
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={HONEYPOT_STYLE}
        />
        <CheckRow boxed={false} className="min-h-11 py-1" checked={list} onChange={(e) => setList(e.target.checked)}>
          {EMAIL_CONSENT_LABEL}
        </CheckRow>
        <Button type="submit" variant="primary" size="lg" block disabled={busy} aria-busy={busy}>
          {busy ? "Getting your code" : `Get my $${OFFER_AMOUNT} code`}
        </Button>
        {error && !error.field && (
          <p role="alert" className="m-0 t-micro text-[--flag-ink]">
            {error.message}
          </p>
        )}
      </form>
      <p className="mt-5 font-body text-body-s leading-[1.6] text-[--text-secondary]">
        One code per email, off one trip. It works with the pay-in-full discount, not with other codes.
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

/**
 * The trip, to the group chat. A group decides together, so the most useful
 * thing after the code is getting the page in front of the friends: the share
 * sheet on a phone, the clipboard elsewhere. Tagged so their visits show up as
 * referrals, and they each get their own $100 on the page.
 */
function ShareTrip() {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2400);
    return () => window.clearTimeout(id);
  }, [copied]);

  async function share() {
    const url = `${window.location.origin}/telluride?utm_source=share&utm_medium=referral`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Telluride with Outrider", text: "Telluride this winter? Get your own $100 off here.", url });
        track("Code offer share", { method: "native" });
        return;
      } catch (err) {
        // Dismissing the share sheet is a choice, not a failure.
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      track("Code offer share", { method: "copy" });
    } catch {
      window.prompt("Copy this link", url);
    }
  }

  return (
    <Button type="button" variant="secondary" size="lg" block onClick={share}>
      {copied ? "Link copied" : "Send the trip to your group"}
    </Button>
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
 * The offer in one line for someone who closed the sheet, the code once they
 * have one, or the countdown while the credit runs. Holds its height while
 * loading so the masthead does not jump when the answer arrives.
 */
export function CreditLine({ className }: { className?: string }) {
  const credit = useWelcomeCredit();
  const state = credit?.state ?? { status: "none" };
  const offer = credit?.offer ?? null;

  return (
    <div className={cn("min-h-[1.5rem] font-body text-body-s leading-[1.55] text-[--text-secondary]", className)}>
      {credit?.canOffer && (
        <p className="m-0">
          ${OFFER_AMOUNT} off with a code of your own, good for a week.{" "}
          <button
            type="button"
            onClick={credit.openOffer}
            className="font-medium text-[--accent] underline underline-offset-4"
          >
            Get my code
          </button>
        </p>
      )}
      {offer && (
        <p className="m-0">
          <span className="font-medium text-[--text]">Your code {offer.code}</span> takes ${OFFER_AMOUNT} off, good
          through {formatOfferDeadline(offer.expiresAt)}. It comes off when you reserve.
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
