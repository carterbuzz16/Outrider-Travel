"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button, Field, Input, Textarea, cn } from "@/components/ui";
import { HONEYPOT_FIELD, HONEYPOT_STYLE, honeypotValue } from "@/lib/honeypot";
import {
  AMBASSADOR_ERRORS,
  ANSWER_MAX,
  EMPTY_AMBASSADOR_INPUT,
  REACH_OPTIONS,
  YEAR_OPTIONS,
  validateAmbassador,
  type AmbassadorField,
  type AmbassadorFieldErrors,
  type AmbassadorInput,
} from "@/lib/ambassador-application";
import { applyForAmbassador } from "./actions";

// Top to bottom, so a failed submit lands on the first thing to fix.
const FIELD_ORDER: AmbassadorField[] = [
  "name",
  "school",
  "year",
  "chapter",
  "instagram",
  "phone",
  "reach",
  "why",
  "fit",
];

// A group's title: the brand book's Subhead (Medium, sentence case), one step
// under the page's capitals, so the form reads as two parts and not a list.
const GROUP_TITLE = "m-0 font-display text-display-s font-medium tracking-title text-[--text]";

/**
 * The /ambassador application. Every field is required.
 *
 * Two parts since 26 October 2026: the facts about the applicant, then two
 * short answers in their own words. Inline validation without nagging: a
 * field is checked when it is left with something in it, every field is
 * checked on submit, and a field already showing an error re-checks as it is
 * typed in, so the message clears the moment it is fixed. The rules are
 * lib/ambassador-application.ts, the same ones the server action applies.
 */
export default function ApplicationForm({
  submitLabel,
  receivedTitle,
  receivedBody,
}: {
  submitLabel: string;
  receivedTitle: string;
  receivedBody: string;
}) {
  const [values, setValues] = useState<AmbassadorInput>(EMPTY_AMBASSADOR_INPUT);
  const [errors, setErrors] = useState<AmbassadorFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const receivedRef = useRef<HTMLDivElement>(null);
  const aboutId = useId();
  const wordsId = useId();

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
    // Radios share one name, so that lookup returns the whole group.
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
      <div ref={receivedRef} tabIndex={-1} role="status" className="focus:outline-none">
        {/* The waitlist's seal (globals.css), inking in: the ring draws, then
            the tick. Pure CSS, so it simply appears under reduced motion. */}
        <svg viewBox="0 0 48 48" className="h-12 w-12 text-[--accent]" aria-hidden="true">
          <circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" strokeWidth="1.25" className="waitlist-seal-ring" />
          <path
            d="M15 24.5 L21.5 31 L33 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="square"
            className="waitlist-seal-tick"
          />
        </svg>
        <p className="m-0 mt-6 font-display text-display-m font-medium leading-[1.1] tracking-title text-[--text]">
          {receivedTitle}
        </p>
        <p className="m-0 mt-3 font-body text-lede text-[--text-secondary]">{receivedBody}</p>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="relative flex flex-col gap-12">
      <div role="group" aria-labelledby={aboutId} className="flex flex-col gap-6">
        <h3 id={aboutId} className={GROUP_TITLE}>
          About you
        </h3>

        <div className="grid gap-6 sm:grid-cols-2">
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
        </div>

        <TileChoice
          name="year"
          legend="Year"
          options={YEAR_OPTIONS}
          value={values.year}
          error={errors.year}
          disabled={busy}
          onChange={(value) => update("year", value)}
          // Four across only where the form has the width: from sm it is the
          // full shell, but from md it shares the row with the heading, and
          // "Sophomore" no longer fits a quarter until lg.
          className="grid-cols-2 sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-4"
          tileClassName="h-12 text-body font-medium"
        />

        {/* A row of its own: the label is long enough to wrap in half a
            column, which would push its box out of line with its neighbour's. */}
        <Field label="Chapter you’re a part of" required error={errors.chapter}>
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

        <TileChoice
          name="reach"
          legend="Roughly how many friends could you bring on a trip?"
          options={REACH_OPTIONS}
          value={values.reach}
          error={errors.reach}
          disabled={busy}
          onChange={(value) => update("reach", value)}
          className="grid-cols-3"
          tileClassName="h-14 text-display-s font-medium tracking-title"
        />
      </div>

      <div role="group" aria-labelledby={wordsId} className="flex flex-col gap-6">
        <h3 id={wordsId} className={GROUP_TITLE}>
          In your words
        </h3>

        <ShortAnswer
          name="why"
          label="Why do you want to do this?"
          value={values.why}
          error={errors.why}
          disabled={busy}
          onChange={(value) => update("why", value)}
          onBlur={() => checkOnLeave("why")}
        />

        <ShortAnswer
          name="fit"
          label="What makes you a good fit?"
          value={values.fit}
          error={errors.fit}
          disabled={busy}
          onChange={(value) => update("fit", value)}
          onBlur={() => checkOnLeave("fit")}
        />
      </div>

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

      <div className="flex flex-col gap-4">
        {/* Reserves nothing when empty; announced when it appears. */}
        {formError && (
          <p role="alert" className="m-0 font-body text-body-s text-[--flag-ink]">
            {formError}
          </p>
        )}
        <div>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            block
            disabled={busy}
            aria-busy={busy || undefined}
            className="sm:w-auto sm:min-w-[14rem]"
          >
            {busy ? "Submitting" : submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}

/**
 * A short written answer: a few lines tall, capped at ANSWER_MAX, with a
 * running count so the limit is something you can see without being told.
 */
function ShortAnswer({
  name,
  label,
  value,
  error,
  disabled,
  onChange,
  onBlur,
}: {
  name: AmbassadorField;
  label: string;
  value: string;
  error?: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  const countId = useId();
  return (
    <Field label={label} required error={error}>
      {(p) => (
        <div className="flex flex-col gap-2">
          <Textarea
            {...p}
            // Field's own ids (the error) plus the limit, read once on focus.
            aria-describedby={[p["aria-describedby"], countId].filter(Boolean).join(" ")}
            name={name}
            rows={3}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            maxLength={ANSWER_MAX}
            disabled={disabled}
            required
            className="min-h-[6.5rem]"
          />
          {/* The running count is visual only (a screen reader announcing
              every keystroke is noise); the limit itself is read once, from
              the hidden line, when the box is focused. maxLength enforces it. */}
          <p className="m-0 self-end t-micro tabular-nums text-[--text-muted]">
            <span aria-hidden="true">
              {value.length}/{ANSWER_MAX}
            </span>
            <span id={countId} className="sr-only">
              Up to {ANSWER_MAX} characters.
            </span>
          </p>
        </div>
      )}
    </Field>
  );
}

/**
 * One-of-several as big tiles rather than a dropdown: one tap on a phone, and
 * every answer is visible. Native radios underneath (visually hidden, still
 * focusable), so arrow keys, required and screen readers behave as the browser
 * means them to.
 */
function TileChoice({
  name,
  legend,
  options,
  value,
  error,
  disabled,
  onChange,
  className,
  tileClassName,
}: {
  name: AmbassadorField;
  legend: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  value: string;
  error?: string;
  disabled: boolean;
  onChange: (value: string) => void;
  /** The grid's columns. */
  className?: string;
  /** The tile's height and type. */
  tileClassName?: string;
}) {
  const errorId = `${name}-error`;
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0" aria-describedby={error ? errorId : undefined}>
      <legend className="t-micro mb-2 p-0 text-[--text-secondary]">
        {legend}
        <span aria-hidden="true" className="ml-1.5 text-[--flag-ink]">
          *
        </span>
      </legend>
      <div className={cn("grid gap-2", className)}>
        {options.map((option) => (
          <label key={option.value} className="relative block cursor-pointer has-[:disabled]:cursor-not-allowed">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              disabled={disabled}
              required
              className="peer sr-only"
            />
            <span
              className={cn(
                "flex items-center justify-center border font-display",
                "transition-colors duration-fast ease-out",
                // The same edges as a text field: the control rule, the flag
                // when the question is unanswered on submit.
                error ? "border-[--flag]" : "border-[--control-rule] hover:border-[--text-secondary]",
                "text-[--text]",
                "peer-checked:border-[--accent-solid] peer-checked:bg-[--accent-solid] peer-checked:text-[--accent-contrast]",
                "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[--focus-ring]",
                "peer-disabled:opacity-50",
                tileClassName,
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
