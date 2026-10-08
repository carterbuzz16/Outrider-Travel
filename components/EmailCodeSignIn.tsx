"use client";

import { useEffect, useRef, useState } from "react";
import { Button, CheckRow, Field, Input } from "@/components/ui";
import { sendSignInCode, verifySignInCode } from "@/app/auth/actions";
import { EMAIL_CONSENT_LABEL } from "@/lib/waitlist-consent";

/*
 * Email, then a 6-digit code: the whole account step (app/auth/actions.ts,
 * "sign in with an emailed code"). Used in checkout's order panel, where it
 * replaces the old login wall, and on the login page for anyone without a
 * password.
 *
 * Deliberately not a <form>: in checkout it sits inside the booking form, and
 * forms cannot nest. The buttons are type="button" and Enter is handled here,
 * so nothing in it ever submits the booking by accident, and none of its
 * inputs has a name, so none of it is posted with the booking either.
 *
 * `onSignedIn` runs once the code checks out and the session cookie is set.
 * The caller decides what happens next: checkout submits the booking, the
 * login page goes where the visitor was headed.
 */

const RESEND_SECONDS = 60;

export default function EmailCodeSignIn({
  askName = false,
  offerList = false,
  continueLabel,
  busyLabel = "Checking",
  onSignedIn,
  autoFocus = false,
}: {
  /** Checkout asks for a name, so a new account has one. */
  askName?: boolean;
  /** The optional, unticked "Okay to email me about Outrider trips". */
  offerList?: boolean;
  /** The button that checks the code, e.g. "Continue, $160 due today". */
  continueLabel: string;
  /** Shown on that button while the check (and whatever follows) runs. */
  busyLabel?: string;
  onSignedIn: () => void;
  autoFocus?: boolean;
}) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [list, setList] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const firstRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) firstRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (step === "code") codeRef.current?.focus();
  }, [step]);

  // The "send a new code" countdown, matching Supabase's one-a-minute limit.
  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  async function send() {
    if (busy) return;
    if (askName && !name.trim()) {
      setError("Add your name.");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await sendSignInCode({ email, name });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setCode("");
    setStep("code");
    setWait(RESEND_SECONDS);
  }

  async function verify() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await verifySignInCode({ email, code, name, emailUpdates: list });
    if (!result.ok) {
      setBusy(false);
      setError(result.message);
      return;
    }
    // Stays busy: the caller is about to move on.
    onSignedIn();
  }

  function onEnter(action: () => void) {
    return (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        action();
      }
    };
  }

  return (
    <div className="flex flex-col gap-4">
      {step === "email" ? (
        <>
          {askName && (
            <Field label="Full name" required>
              {(field) => (
                <Input
                  {...field}
                  ref={firstRef}
                  type="text"
                  autoComplete="name"
                  maxLength={120}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={onEnter(send)}
                />
              )}
            </Field>
          )}
          <Field label="Email" required hint="We'll email you a 6-digit code. No password needed.">
            {(field) => (
              <Input
                {...field}
                ref={askName ? undefined : firstRef}
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={onEnter(send)}
              />
            )}
          </Field>
          {offerList && (
            <CheckRow boxed={false} className="min-h-11 py-1" checked={list} onChange={(e) => setList(e.target.checked)}>
              {EMAIL_CONSENT_LABEL}
            </CheckRow>
          )}
          <Button type="button" variant="primary" size="lg" block onClick={send} disabled={busy} aria-busy={busy}>
            {busy ? "Sending your code" : "Email me a code"}
          </Button>
        </>
      ) : (
        <>
          <p className="m-0 font-body text-body-s leading-[1.6] text-[--text-secondary]">
            We sent a code to <span className="text-[--text]">{email}</span>. It can take a minute, and it
            sometimes lands in spam.
          </p>
          <Field label="Code from the email" required>
            {(field) => (
              <Input
                {...field}
                ref={codeRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={10}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                onKeyDown={onEnter(verify)}
                className="tracking-[0.3em] tabular-nums"
              />
            )}
          </Field>
          <Button
            type="button"
            variant="primary"
            size="lg"
            block
            onClick={verify}
            disabled={busy || code.length < 6}
            aria-busy={busy}
            // Long labels ("Continue, $1,440 due today") wrap rather than
            // overflow a 375px panel; the base button is nowrap.
            className="!whitespace-normal text-center !leading-[1.35]"
          >
            {busy ? busyLabel : continueLabel}
          </Button>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <button
              type="button"
              onClick={send}
              disabled={busy || wait > 0}
              className="min-h-11 font-body text-body-s text-[--accent] underline underline-offset-4 disabled:text-[--text-secondary] disabled:no-underline"
            >
              {wait > 0 ? `Send a new code in ${wait}s` : "Send a new code"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setError(null);
              }}
              disabled={busy}
              className="min-h-11 font-body text-body-s text-[--accent] underline underline-offset-4"
            >
              Use a different email
            </button>
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="m-0 font-body text-body-s text-[--flag-ink]">
          {error}
        </p>
      )}
    </div>
  );
}
