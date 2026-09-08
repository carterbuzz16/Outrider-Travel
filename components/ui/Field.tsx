"use client";

import { useId } from "react";
import { cn } from "./cn";

/**
 * Form controls, drawn as travel paperwork.
 *
 * Every control is a hairline box on a transparent ground with its label set
 * above it in tracked mono — a customs form, not an app. There is no filled
 * grey input, no rounded pill, no floating label. Focus darkens the rule to the
 * scheme's accent and the browser's own focus ring sits outside it.
 *
 * `Field` owns the label/hint/error scaffolding and hands its child a set of
 * wired-up ids, so a control is never left without an accessible name and an
 * error is never left unannounced.
 */

const CONTROL =
  "w-full bg-transparent border border-[--rule-strong] rounded-sm " +
  "px-3.5 py-3 font-body text-body text-[--text] " +
  "placeholder:text-[--text-muted] placeholder:font-display " +
  "placeholder:text-label placeholder:uppercase placeholder:tracking-label " +
  "transition-colors duration-fast ease-out " +
  "hover:border-[--text-secondary] focus:border-[--accent] " +
  "disabled:opacity-50 disabled:cursor-not-allowed " +
  "aria-[invalid=true]:border-[--flag]";

type FieldRenderArgs = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

type FieldProps = {
  label: string;
  /** Quiet helper copy under the control. */
  hint?: string;
  /** Present means invalid: the rule turns burnt orange and this is announced. */
  error?: string;
  /** Hides the label visually but keeps it for screen readers. */
  hideLabel?: boolean;
  required?: boolean;
  className?: string;
  children: (props: FieldRenderArgs) => React.ReactNode;
};

export function Field({
  label,
  hint,
  error,
  hideLabel = false,
  required = false,
  className,
  children,
}: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ");

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label
        htmlFor={id}
        className={cn("t-micro text-[--text-secondary]", hideLabel && "sr-only")}
      >
        {label}
        {required && (
          <span aria-hidden="true" className="ml-1.5 text-[--flag-ink]">
            *
          </span>
        )}
      </label>

      {children({
        id,
        "aria-describedby": describedBy || undefined,
        "aria-invalid": error ? true : undefined,
      })}

      {hint && !error && (
        <p id={hintId} className="font-body text-body-s text-[--text-muted]">
          {hint}
        </p>
      )}

      {/* Assertive rather than polite: the reader has just tried to submit. */}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="t-micro text-[--flag-ink]"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(CONTROL, className)} {...props} />;
}

export function Textarea({
  className,
  rows = 5,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={rows} className={cn(CONTROL, "resize-y", className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={cn(CONTROL, "appearance-none pr-10 cursor-pointer", className)}
        {...props}
      >
        {children}
      </select>
      {/* A drawn chevron rather than the OS one, so the control matches the
          hairline weight of everything around it. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 12 8"
        className="pointer-events-none absolute right-3.5 top-1/2 w-3 -translate-y-1/2 text-[--text-secondary]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
      >
        <path d="M1 1.5 6 6.5 11 1.5" />
      </svg>
    </div>
  );
}

/**
 * The underlined variant — one line, no box. For the single-input moments
 * (waitlist capture, a footer signup) where a full box would be too much
 * furniture on the page.
 */
export function InlineInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full min-w-0 border-0 border-b border-[--rule-strong] bg-transparent",
        "px-0 py-3 font-display text-label uppercase tracking-label text-[--text]",
        "placeholder:text-[--text-muted]",
        "transition-colors duration-fast ease-out focus:border-[--accent]",
        "focus-visible:outline-none",
        "aria-[invalid=true]:border-[--flag]",
        className,
      )}
      {...props}
    />
  );
}

export function Checkbox({
  label,
  className,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className={cn("flex items-start gap-3", className)}>
      {/* A square that fills with the accent when checked — no rounded tick
          chip, no custom SVG check; the native mark is fine at this size. */}
      <input
        id={id}
        type="checkbox"
        className={cn(
          "mt-1 h-4 w-4 shrink-0 appearance-none border border-[--rule-strong]",
          "bg-transparent transition-colors duration-fast",
          "checked:border-[--accent] checked:bg-[--accent]",
          "cursor-pointer disabled:opacity-50",
        )}
        {...props}
      />
      <label htmlFor={id} className="font-body text-body-s text-[--text-secondary]">
        {label}
      </label>
    </div>
  );
}
