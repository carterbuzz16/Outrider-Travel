"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { MAX_LENGTHS } from "@/lib/traveler-details";
import { saveIdentityDetails } from "./actions";

/*
 * The identity half of traveler details: checkout's "Your details" step,
 * between the package and the card.
 *
 * Asked before payment so that every paid place has a named, dated traveler
 * behind it and the Terms on the next step are agreed to by that person.
 * Six fields, one of them prefilled from the account name. The gear half
 * stays on the trip page, where the rental shop's questions belong and
 * nobody has to know their boot size to book.
 *
 * Submitted from onSubmit inside a transition rather than through `action`
 * alone, for the same reason the portal's forms are (see usePortalAction in
 * app/trip/[bookingId]/PortalForms.tsx): React 19 resets an uncontrolled form
 * after an action, and on a validation error that would wipe the date of
 * birth and legal name the traveler typed. The only way back would be to
 * echo them from the server, and this form is built so nothing typed here
 * ever makes a second trip.
 */

export default function IdentityForm({
  bookingId,
  defaultName,
  saved,
  payHref,
  className,
}: {
  bookingId: string;
  /** The account's name, so the commonest answer is already filled in. */
  defaultName: string | null;
  /** Already sent. The form collapses to a confirmation with a way back in. */
  saved: boolean;
  /** The payment step, for a traveler who already sent this and came back. */
  payHref: string;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(saveIdentityDetails, null);
  const [editing, setEditing] = useState(false);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  };

  const done = saved || state?.ok === true;
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  if (done && !editing) {
    return (
      <div className={`border border-[--rule] p-5 sm:p-6 ${className ?? ""}`}>
        <h2 className="font-display text-display-s font-medium tracking-title text-[--text]">
          Got them, thank you
        </h2>
        <p className="mt-3 max-w-measure font-body text-body-s leading-[1.7] text-[--text-secondary]">
          {/* Nothing typed is read back: what was sent is not echoed to this
              page, on purpose. */}
          Your name, date of birth and emergency contact are with us. If something was wrong, send
          it again and the new version replaces the old one.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Button href={payHref} variant="primary" size="md">
            Continue to payment
          </Button>
          <Button type="button" variant="ghost" size="sm" className="min-h-11" onClick={() => setEditing(true)}>
            Change something
          </Button>
        </div>
      </div>
    );
  }

  return (
    <section aria-label="Your details" className={className}>
      <form
        onSubmit={onSubmit}
        action={formAction}
        className="flex flex-col gap-6"
        // Stops the browser offering to save a date of birth into autofill on
        // a shared or borrowed machine.
        autoComplete="off"
      >
        <input type="hidden" name="bookingId" value={bookingId} />

        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
          <Field
            label="Legal name"
            hint="Exactly as on your driver's license or passport."
            error={errors.legalName}
            required
            className="sm:col-span-2"
          >
            {(props) => (
              <Input
                {...props}
                name="legalName"
                defaultValue={defaultName ?? ""}
                maxLength={MAX_LENGTHS.legalName}
                required
              />
            )}
          </Field>

          <Field label="Date of birth" error={errors.dateOfBirth} required>
            {(props) => <Input {...props} name="dateOfBirth" type="date" required />}
          </Field>

          <Field label="School" hint="Where you go now." error={errors.school} required>
            {(props) => <Input {...props} name="school" maxLength={MAX_LENGTHS.school} required />}
          </Field>

          <Field label="Your phone" error={errors.phone} required className="sm:col-span-2">
            {(props) => (
              <Input {...props} name="phone" type="tel" inputMode="tel" maxLength={MAX_LENGTHS.phone} required />
            )}
          </Field>

          <Field label="Emergency contact" hint="Someone not on the trip." error={errors.emergencyContactName} required>
            {(props) => (
              <Input {...props} name="emergencyContactName" maxLength={MAX_LENGTHS.emergencyContactName} required />
            )}
          </Field>

          <Field label="Their phone" error={errors.emergencyContactPhone} required>
            {(props) => (
              <Input
                {...props}
                name="emergencyContactPhone"
                type="tel"
                inputMode="tel"
                maxLength={MAX_LENGTHS.emergencyContactPhone}
                required
              />
            )}
          </Field>
        </div>

        <p className="font-body text-body-s text-[--text-secondary]">
          Fields marked <span aria-hidden="true" className="text-[--flag-ink]">*</span>
          <span className="sr-only">with an asterisk</span> are required.
        </p>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Button type="submit" variant="primary" size="md" disabled={pending} aria-busy={pending}>
            {pending ? "Saving" : "Continue to payment"}
          </Button>
          {editing && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-11"
              onClick={() => setEditing(false)}
              disabled={pending}
            >
              Keep what I sent
            </Button>
          )}
        </div>

        {state && !state.ok && (
          <Alert tone="error" title="Not saved">
            {state.message}
          </Alert>
        )}
      </form>
    </section>
  );
}
