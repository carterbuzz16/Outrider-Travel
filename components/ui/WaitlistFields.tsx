"use client";

import { useEffect, useId, useRef } from "react";
import Link from "next/link";
import Button from "./Button";
import { CheckRow } from "./Choice";
import { Field, Input } from "./Field";
import { cn } from "./cn";
import type { WaitlistSignup } from "./useWaitlistSignup";
import {
  EMAIL_CONSENT_LABEL,
  SMS_CONSENT_LABEL,
  SMS_DISCLOSURE_PARTS,
} from "@/lib/waitlist-consent";

/**
 * The waitlist form itself: name, email, mobile, and the two opt-ins.
 *
 * One body for every place the list is offered (the /waitlist page, the
 * dialog, the inline blocks, the coming-soon panel), so the fields, their
 * order, the consent wording and the errors are the same wherever someone
 * signs up. Each caller owns the hook (useWaitlistSignup) and the layout
 * around this; this owns only what is inside the <form>.
 *
 * Built for a phone first, since most signups come from a QR code or a link in
 * a bio: one column, the keyboard that fits each field (tel pulls up the
 * number pad), autofill hints so iOS and Android can fill the whole thing in
 * one tap, and 17px inputs so iOS does not zoom the page on focus.
 */
export default function WaitlistFields({
  signup,
  tone = "dark",
  size = "md",
  submitLabel = "Join the list",
  note,
  className,
}: {
  signup: WaitlistSignup;
  /**
   * `dark` on espresso or a photograph. The flag color only just clears 4.5:1
   * on plain espresso and not at all over a picture, so on dark grounds an
   * error is carried in full-strength paper and marked by the field's rule.
   */
  tone?: "dark" | "light";
  size?: "md" | "lg";
  submitLabel?: string;
  /** Quiet line under the button when there is nothing to report. */
  note?: string;
  className?: string;
}) {
  const { values, setField, fieldErrors, status, message, attempt, submit } = signup;
  const formRef = useRef<HTMLFormElement>(null);
  const emailConsentId = useId();
  const disclosureId = useId();
  const busy = status === "busy";

  // After a refused submit, put the caret in the first field that needs
  // fixing. On a phone the errors can be a screen away from the button.
  useEffect(() => {
    if (attempt === 0) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [attempt]);

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      noValidate
      className={cn(
        "flex flex-col gap-5",
        tone === "dark" && "[--flag-ink:var(--text)]",
        className,
      )}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="First name" error={fieldErrors.firstName}>
          {(a11y) => (
            <Input
              {...a11y}
              name="first_name"
              type="text"
              autoComplete="given-name"
              autoCapitalize="words"
              enterKeyHint="next"
              maxLength={80}
              required
              value={values.firstName}
              onChange={(e) => setField("firstName", e.target.value)}
              disabled={busy}
            />
          )}
        </Field>
        <Field label="Last name" error={fieldErrors.lastName}>
          {(a11y) => (
            <Input
              {...a11y}
              name="last_name"
              type="text"
              autoComplete="family-name"
              autoCapitalize="words"
              enterKeyHint="next"
              maxLength={80}
              required
              value={values.lastName}
              onChange={(e) => setField("lastName", e.target.value)}
              disabled={busy}
            />
          )}
        </Field>
      </div>

      <Field label="Email" error={fieldErrors.email}>
        {(a11y) => (
          <Input
            {...a11y}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="next"
            maxLength={254}
            required
            value={values.email}
            onChange={(e) => setField("email", e.target.value)}
            disabled={busy}
          />
        )}
      </Field>

      <Field label="Mobile number" hint="US numbers only" error={fieldErrors.phone}>
        {(a11y) => (
          <Input
            {...a11y}
            name="tel"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            enterKeyHint="done"
            maxLength={30}
            required
            value={values.phone}
            onChange={(e) => setField("phone", e.target.value)}
            disabled={busy}
          />
        )}
      </Field>

      <div className="flex flex-col gap-1">
        <CheckRow
          boxed={false}
          className="min-h-11 py-1.5"
          name="email_consent"
          required
          checked={values.emailConsent}
          onChange={(e) => setField("emailConsent", e.target.checked)}
          aria-invalid={fieldErrors.emailConsent ? true : undefined}
          aria-describedby={fieldErrors.emailConsent ? emailConsentId : undefined}
          disabled={busy}
        >
          {EMAIL_CONSENT_LABEL}
        </CheckRow>
        {fieldErrors.emailConsent && (
          <p id={emailConsentId} role="alert" className="t-micro pl-[2.125rem] text-[--flag-ink]">
            {fieldErrors.emailConsent}
          </p>
        )}

        <CheckRow
          boxed={false}
          className="min-h-11 py-1.5"
          name="sms_consent"
          checked={values.smsConsent}
          onChange={(e) => setField("smsConsent", e.target.checked)}
          aria-describedby={disclosureId}
          disabled={busy}
        >
          {SMS_CONSENT_LABEL}
        </CheckRow>
        {/* Outside the label on purpose: the links in it must stay links, and
            the box's accessible name should be the short sentence. It is tied
            to the box as its description instead. */}
        <p
          id={disclosureId}
          className="pl-[2.125rem] font-body text-[0.8125rem] leading-[1.6] text-[--text-muted]"
        >
          {SMS_DISCLOSURE_PARTS.lead}
          <Link href="/privacy#sms" target="_blank" rel="noreferrer" className={LINK}>
            {SMS_DISCLOSURE_PARTS.privacyLabel}
          </Link>
          {SMS_DISCLOSURE_PARTS.between}
          <Link href="/terms#sms" target="_blank" rel="noreferrer" className={LINK}>
            {SMS_DISCLOSURE_PARTS.termsLabel}
          </Link>
          {SMS_DISCLOSURE_PARTS.tail}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Button
          type="submit"
          variant="primary"
          size={size}
          disabled={busy}
          className="w-full sm:w-auto sm:self-start"
        >
          {busy ? "Sending" : submitLabel}
        </Button>

        {/* Reserves its line so submitting does not shift the layout. */}
        <p
          role="status"
          aria-live="polite"
          className={cn(
            "t-micro min-h-[1.4em]",
            message ? "text-[--flag-ink]" : "text-[--text-muted]",
          )}
        >
          {message || note || " "}
        </p>
      </div>
    </form>
  );
}

const LINK = "text-[--text-secondary] underline underline-offset-2 hover:text-[--text]";
