"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Field, Input, cn } from "@/components/ui";
import { HONEYPOT_FIELD, HONEYPOT_STYLE, honeypotValue } from "@/lib/honeypot";
import {
  AMBASSADOR_ERRORS,
  EMPTY_AMBASSADOR_INPUT,
  REACH_OPTIONS,
  validateAmbassador,
  type AmbassadorField,
  type AmbassadorFieldErrors,
  type AmbassadorInput,
} from "@/lib/ambassador-application";
import { applyForAmbassador } from "./actions";

// Top to bottom, so a failed submit lands on the first thing to fix.
const FIELD_ORDER: AmbassadorField[] = ["name", "school", "chapter", "instagram", "phone", "reach"];

/**
 * The /ambassador application. Every field is required.
 *
 * Inline validation without nagging: a field is checked when it is left with
 * something in it, every field is checked on submit, and a field already
 * showing an error re-checks as it is typed in, so the message clears the
 * moment it is fixed. The rules are lib/ambassador-application.ts, the same
 * ones the server action applies.
 */
export default function ApplicationForm({
  submitLabel,
  receivedMessage,
}: {
  submitLabel: string;
  receivedMessage: string;
}) {
  const [values, setValues] = useState<AmbassadorInput>(EMPTY_AMBASSADOR_INPUT);
  const [errors, setErrors] = useState<AmbassadorFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const receivedRef = useRef<HTMLParagraphElement>(null);

  // The form is gone once it is sent, so focus moves to what replaced it;
  // otherwise a keyboard or screen reader user is left on nothing.
  useEffect(() => {
    if (sent) receivedRef.current?.focus();
  }, [sent]);

  function errorFor(field: AmbassadorField, next: AmbassadorInput): string | undefined {
    const checked = validateAmbassador(next);
    return checked.ok ? undefined : checked.errors[field];
  }

  function update(field: AmbassadorField, value: string) {
    const next = { ...values, [field]: value };
    setValues(next);
    if (errors[field]) setErrors((current) => ({ ...current, [field]: errorFor(field, next) }));
  }

  function checkOnLeave(field: AmbassadorField) {
    if (!values[field].trim()) return;
    setErrors((current) => ({ ...current, [field]: errorFor(field, values) }));
  }

  function focusFirst(fieldErrors: AmbassadorFieldErrors) {
    const first = FIELD_ORDER.find((field) => fieldErrors[field]);
    const target = first && formRef.current?.elements.namedItem(first);
    // The radios share one name, so that lookup returns the whole group.
    const element = target instanceof RadioNodeList ? target[0] : target;
    if (element instanceof HTMLElement) element.focus();
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    // Read before the await: React clears currentTarget once the handler
    // yields. The trap is not held in state because nothing shows it.
    const website = honeypotValue(event.currentTarget);

    setFormError(null);
    const checked = validateAmbassador(values);
    if (!checked.ok) {
      setErrors(checked.errors);
      focusFirst(checked.errors);
      return;
    }

    setBusy(true);
    setErrors({});
    try {
      const result = await applyForAmbassador(values, website);
      if (result.ok) {
        setSent(true);
      } else if (result.fieldErrors) {
        setErrors(result.fieldErrors);
        focusFirst(result.fieldErrors);
      } else {
        setFormError(result.message);
      }
    } catch {
      // The action returns its failures rather than throwing, so reaching
      // here means the request itself never completed (a dropped connection).
      setFormError(AMBASSADOR_ERRORS.failed);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <p
        ref={receivedRef}
        tabIndex={-1}
        role="status"
        className="max-w-[18ch] font-display text-display-m font-medium tracking-title text-[--text] focus:outline-none"
      >
        {receivedMessage}
      </p>
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="relative flex flex-col gap-6">
      <Field label="Name" required error={errors.name}>
        {(p) => (
          <Input
            {...p}
            name="name"
            value={values.name}
            onChange={(e) => update("name", e.target.value)}
            onBlur={() => checkOnLeave("name")}
            autoComplete="name"
            maxLength={120}
            disabled={busy}
            required
          />
        )}
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="School" required error={errors.school}>
          {(p) => (
            <Input
              {...p}
              name="school"
              value={values.school}
              onChange={(e) => update("school", e.target.value)}
              onBlur={() => checkOnLeave("school")}
              maxLength={120}
              disabled={busy}
              required
            />
          )}
        </Field>

        <Field label="Chptr chapter" required error={errors.chapter}>
          {(p) => (
            <Input
              {...p}
              name="chapter"
              value={values.chapter}
              onChange={(e) => update("chapter", e.target.value)}
              onBlur={() => checkOnLeave("chapter")}
              maxLength={120}
              disabled={busy}
              required
            />
          )}
        </Field>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Instagram handle" required error={errors.instagram}>
          {(p) => (
            <Input
              {...p}
              name="instagram"
              value={values.instagram}
              onChange={(e) => update("instagram", e.target.value)}
              onBlur={() => checkOnLeave("instagram")}
              // A handle is not a word: no capital first letter, no
              // autocorrect turning "jordan.t" into something else.
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="off"
              maxLength={100}
              disabled={busy}
              required
            />
          )}
        </Field>

        <Field label="Phone number" hint="US numbers only" required error={errors.phone}>
          {(p) => (
            <Input
              {...p}
              name="phone"
              type="tel"
              inputMode="tel"
              value={values.phone}
              onChange={(e) => update("phone", e.target.value)}
              onBlur={() => checkOnLeave("phone")}
              autoComplete="tel"
              maxLength={30}
              disabled={busy}
              required
            />
          )}
        </Field>
      </div>

      <ReachChoice
        value={values.reach}
        error={errors.reach}
        disabled={busy}
        onChange={(value) => update("reach", value)}
      />

      {/* The bot trap (lib/honeypot.ts). Uncontrolled, and read off the form
          at submit. After the fields rather than first, so nothing that
          focuses "the first input" can land in it. */}
      <input
        type="text"
        name={HONEYPOT_FIELD}
        defaultValue=""
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={HONEYPOT_STYLE}
      />

      {/* Reserves nothing when empty; announced when it appears. */}
      {formError && (
        <p role="alert" className="font-body text-body-s text-[--flag-ink]">
          {formError}
        </p>
      )}

      <div>
        <Button type="submit" variant="primary" size="lg" block disabled={busy} aria-busy={busy || undefined} className="sm:w-auto">
          {busy ? "Submitting" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

/**
 * "Roughly how many friends could you bring on a trip?" as three big tiles
 * rather than a dropdown: one tap on a phone, and every answer is visible.
 * Native radios underneath (visually hidden, still focusable), so arrow keys,
 * required and screen readers behave as the browser means them to.
 */
function ReachChoice({
  value,
  error,
  disabled,
  onChange,
}: {
  value: string;
  error?: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const errorId = "reach-error";
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0" aria-describedby={error ? errorId : undefined}>
      <legend className="t-micro mb-2 p-0 text-[--text-secondary]">
        Roughly how many friends could you bring on a trip?
        <span aria-hidden="true" className="ml-1.5 text-[--flag-ink]">
          *
        </span>
      </legend>
      <div className="grid grid-cols-3 gap-2">
        {REACH_OPTIONS.map((option) => (
          <label key={option.value} className="relative block cursor-pointer has-[:disabled]:cursor-not-allowed">
            <input
              type="radio"
              name="reach"
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              disabled={disabled}
              required
              className="peer sr-only"
            />
            <span
              className={cn(
                "flex h-14 items-center justify-center border font-display text-display-s font-medium tracking-title",
                "transition-colors duration-fast ease-out",
                // The same edges as a text field: the control rule, the flag
                // when the question is unanswered on submit.
                error ? "border-[--flag]" : "border-[--control-rule] hover:border-[--text-secondary]",
                "text-[--text]",
                "peer-checked:border-[--accent-solid] peer-checked:bg-[--accent-solid] peer-checked:text-[--accent-contrast]",
                "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[--focus-ring]",
                "peer-disabled:opacity-50",
              )}
            >
              {option.label}
            </span>
          </label>
        ))}
      </div>
      {error && (
        <p id={errorId} role="alert" className="t-micro mt-2 text-[--flag-ink]">
          {error}
        </p>
      )}
    </fieldset>
  );
}
