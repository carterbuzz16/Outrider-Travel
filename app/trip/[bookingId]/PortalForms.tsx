"use client";

import { startTransition, useActionState, useEffect, useState, type FormEvent } from "react";
import { Alert, Button, Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import {
  requestFreshPortalLink,
  setFlightsBooked,
  submitRoomingRequest,
  submitTravelerDetails,
} from "./actions";
import { ABILITY_LEVELS, MAX_NAME_LENGTH, MAX_ROOMMATES, SKI_OR_BOARD, type PortalActionResult } from "./fields";

/*
 * The portal's interactive parts. Everything they show comes from the server
 * page as props; nothing here fetches.
 *
 * Every form posts the booking id and the token as hidden fields, because the
 * server action has no session and re-verifies the token itself (see
 * actions.ts). The token is already in this page's URL, so putting it in the
 * markup exposes nothing new.
 */

type Action = (prev: PortalActionResult | null, formData: FormData) => Promise<PortalActionResult>;

/**
 * useActionState, submitted from onSubmit rather than through `action` alone.
 *
 * React 19 resets an uncontrolled form after an action runs. On a validation
 * error that would wipe everything the traveler typed, and the only way to
 * restore it would be to send it back from the server, which for the details
 * form means echoing a date of birth and a legal name in a response. Calling
 * the action inside a transition from onSubmit skips the reset, so the input
 * never leaves the browser twice. `action` is still set so the form works
 * before hydration; React does not run it once onSubmit has prevented default.
 */
function usePortalAction(action: Action) {
  const [state, formAction, pending] = useActionState(action, null);
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  };
  return { state, formAction, pending, onSubmit };
}

function AuthFields({ bookingId, token }: { bookingId: string; token: string }) {
  return (
    <>
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="t" value={token} />
    </>
  );
}

function Failure({ state }: { state: PortalActionResult | null }) {
  if (!state || state.ok) return null;
  return (
    <Alert tone="error" title="Not saved" className="mt-5">
      {state.message}
    </Alert>
  );
}

/* -- flights --------------------------------------------------------------- */

export function FlightsToggle({
  bookingId,
  token,
  booked,
}: {
  bookingId: string;
  token: string;
  booked: boolean;
}) {
  const { state, formAction, pending, onSubmit } = usePortalAction(setFlightsBooked);

  return (
    <form action={formAction} onSubmit={onSubmit} className="mt-6">
      <AuthFields bookingId={bookingId} token={token} />
      <input type="hidden" name="booked" value={booked ? "0" : "1"} />
      {booked ? (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <p className="font-body text-body-s text-[--text-secondary]">Marked as booked.</p>
          <Button type="submit" variant="ghost" size="sm" className="min-h-11" disabled={pending}>
            {pending ? "Saving" : "I have not booked yet"}
          </Button>
        </div>
      ) : (
        <Button type="submit" variant="primary" size="md" disabled={pending}>
          {pending ? "Saving" : "I've booked my flights"}
        </Button>
      )}
      <Failure state={state} />
    </form>
  );
}

/* -- rooming --------------------------------------------------------------- */

export function RoomingTask({
  bookingId,
  token,
  existing,
}: {
  bookingId: string;
  token: string;
  /** null until the first request; names are shown back, they are not PII. */
  existing: { names: string[]; noPreference: boolean; submittedLabel: string } | null;
}) {
  const [editing, setEditing] = useState(false);
  const { state, formAction, pending, onSubmit } = usePortalAction(submitRoomingRequest);
  const [noPreference, setNoPreference] = useState(existing?.noPreference ?? false);

  // A save re-renders the page with the new request, so close the form.
  useEffect(() => {
    if (state?.ok) setEditing(false);
  }, [state]);

  if (existing && !editing) {
    return (
      <div className="mt-6">
        {existing.noPreference ? (
          <p className="font-body text-body text-[--text]">No preference. Put me anywhere.</p>
        ) : (
          <ul className="flex list-none flex-col gap-1.5 p-0">
            {existing.names.map((name, i) => (
              <li key={i} className="font-body text-body text-[--text]">
                {name}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 max-w-measure font-body text-body-s leading-[1.7] text-[--text-secondary]">
          Received {existing.submittedLabel}. Rooms are assigned in the order requests arrive, and
          editing yours keeps its place.
        </p>
        <div className="mt-5">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => {
              setNoPreference(existing.noPreference);
              setEditing(true);
            }}
          >
            Edit request
          </Button>
        </div>
      </div>
    );
  }

  const names = existing?.names ?? [];

  return (
    <form action={formAction} onSubmit={onSubmit} className="mt-6 flex max-w-[34rem] flex-col gap-5">
      <AuthFields bookingId={bookingId} token={token} />
      {Array.from({ length: MAX_ROOMMATES }, (_, i) => (
        <Field key={i} label={`Roommate ${i + 1}`} hint={i === 0 ? "Their full name, as they booked." : undefined}>
          {(props) => (
            <Input
              {...props}
              name="roommate"
              maxLength={MAX_NAME_LENGTH}
              autoComplete="off"
              defaultValue={names[i] ?? ""}
              disabled={noPreference || pending}
            />
          )}
        </Field>
      ))}
      <Checkbox
        name="noPreference"
        label="No preference, put me anywhere"
        checked={noPreference}
        onChange={(e) => setNoPreference(e.target.checked)}
        disabled={pending}
      />
      <p className="font-body text-body-s leading-[1.7] text-[--text-muted]">
        Rooms are assigned in the order requests arrive. We match names by hand, so the people you
        name do not need to have booked yet.
      </p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Button type="submit" variant="primary" size="md" disabled={pending}>
          {pending ? "Sending" : existing ? "Save changes" : "Send request"}
        </Button>
        {existing && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-11"
            onClick={() => setEditing(false)}
            disabled={pending}
          >
            Cancel
          </Button>
        )}
      </div>
      <Failure state={state} />
    </form>
  );
}

/* -- traveler details ------------------------------------------------------ */

/**
 * The details form, and what stands in for it once sent.
 *
 * After a submission this never shows the legal name, date of birth, phone
 * numbers or emergency contact again, not even pre-filled into the form:
 * the link gets forwarded, and whoever opens it next should see that the
 * details are in, not what they are. The page does not even load those
 * columns. "Replace my details" opens an empty form and overwrites the lot.
 */
export function DetailsTask({
  bookingId,
  token,
  submitted,
}: {
  bookingId: string;
  token: string;
  submitted: { label: string } | null;
}) {
  const [replacing, setReplacing] = useState(false);
  const { state, formAction, pending, onSubmit } = usePortalAction(submitTravelerDetails);

  useEffect(() => {
    if (state?.ok) setReplacing(false);
  }, [state]);

  if (submitted && !replacing) {
    return (
      <div className="mt-6">
        <p className="font-body text-body-s leading-[1.7] text-[--text-secondary]">
          {submitted.label} For your privacy, your name, date of birth and contact numbers are not
          shown here.
        </p>
        <div className="mt-5">
          <Button type="button" variant="secondary" size="md" onClick={() => setReplacing(true)}>
            Replace my details
          </Button>
        </div>
      </div>
    );
  }

  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <form
      action={formAction}
      onSubmit={onSubmit}
      className="mt-6 flex max-w-[40rem] flex-col gap-10"
      // Stops the browser offering to save a date of birth into autofill on a
      // phone that may not be the traveler's own.
      autoComplete="off"
    >
      <AuthFields bookingId={bookingId} token={token} />

      {submitted && (
        <Alert tone="info" title="Replacing your details">
          Fill in every field again. This replaces what you sent before.
        </Alert>
      )}

      <Group title="For the insurer" hint="The trip insurer needs both.">
        <Field
          label="Legal name"
          hint="Exactly as on your driver's license or passport."
          error={errors.legalName}
          required
          className="sm:col-span-2"
        >
          {(props) => <Input {...props} name="legalName" maxLength={200} required />}
        </Field>

        <Field label="Date of birth" error={errors.dateOfBirth} required>
          {(props) => <Input {...props} name="dateOfBirth" type="date" required />}
        </Field>
      </Group>

      <Group title="Contact" hint="A number to reach you on the trip, and someone at home.">
        <Field label="Your mobile" error={errors.phone} required className="sm:col-span-2">
          {(props) => <Input {...props} name="phone" type="tel" inputMode="tel" maxLength={40} required />}
        </Field>

        <Field
          label="Emergency contact"
          hint="Someone not on the trip, usually a parent."
          error={errors.emergencyContactName}
          required
        >
          {(props) => <Input {...props} name="emergencyContactName" maxLength={200} required />}
        </Field>

        <Field label="Their phone" error={errors.emergencyContactPhone} required>
          {(props) => (
            <Input {...props} name="emergencyContactPhone" type="tel" inputMode="tel" maxLength={40} required />
          )}
        </Field>
      </Group>

      <Group title="Rentals" hint="So your skis or board are ready when you arrive.">
        <Field label="Ski or snowboard" error={errors.skiOrBoard} required>
          {(props) => (
            <Select {...props} name="skiOrBoard" defaultValue="" required>
              <option value="" disabled>
                Choose one
              </option>
              {SKI_OR_BOARD.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="Ability" error={errors.abilityLevel} required>
          {(props) => (
            <Select {...props} name="abilityLevel" defaultValue="" required>
              <option value="" disabled>
                Choose one
              </option>
              {ABILITY_LEVELS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="Height" hint={`For example 5'10" or 178 cm.`} error={errors.height} required>
          {(props) => <Input {...props} name="height" maxLength={40} required />}
        </Field>

        <Field label="Weight" hint="For example 165 lb. Used only to set bindings." error={errors.weight} required>
          {(props) => <Input {...props} name="weight" maxLength={40} required />}
        </Field>

        <Field label="Shoe size" hint="US size, and men's or women's." error={errors.shoeSize} required>
          {(props) => <Input {...props} name="shoeSize" maxLength={40} required />}
        </Field>
      </Group>

      <Group title="Food">
        <Field
          label="Dietary needs"
          hint="Allergies, vegetarian, anything the kitchen should know. Leave blank if none."
          className="sm:col-span-2"
        >
          {(props) => <Textarea {...props} name="dietaryRestrictions" rows={3} maxLength={1000} />}
        </Field>
      </Group>

      <div className="flex flex-col gap-4">
        <p className="font-body text-body-s text-[--text-secondary]">
          Fields marked <span aria-hidden="true" className="text-[--flag-ink]">*</span>
          <span className="sr-only">with an asterisk</span> are required.
        </p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Button type="submit" variant="primary" size="md" disabled={pending} aria-busy={pending}>
            {pending ? "Sending" : submitted ? "Replace details" : "Send details"}
          </Button>
          {submitted && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-11"
              onClick={() => setReplacing(false)}
              disabled={pending}
            >
              Keep what I sent
            </Button>
          )}
        </div>
        <Failure state={state} />
      </div>
    </form>
  );
}

/*
 * A titled group of fields: a real fieldset, so a screen reader announces
 * "For the insurer" before "Legal name", with the legend set as a label over a
 * hairline the way each section of the page opens. Two columns from sm up;
 * a field that needs the width spans both.
 */
function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="float-left w-full border-b border-[--rule] p-0 pb-3 t-label text-[--text]">
        {title}
      </legend>
      {hint && (
        <p className="clear-both pt-3 font-body text-body-s leading-[1.6] text-[--text-secondary]">{hint}</p>
      )}
      <div className="clear-both grid gap-x-6 gap-y-5 pt-5 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

/* -- a fresh link ---------------------------------------------------------- */

export function FreshLinkForm({ bookingId }: { bookingId: string }) {
  const { state, formAction, pending, onSubmit } = usePortalAction(requestFreshPortalLink);

  if (state?.ok) {
    return (
      <Alert tone="success" title="Requested" className="mt-8">
        {state.message}
      </Alert>
    );
  }

  return (
    <form action={formAction} onSubmit={onSubmit} className="mt-8">
      <input type="hidden" name="bookingId" value={bookingId} />
      <Button type="submit" variant="primary" size="md" disabled={pending}>
        {pending ? "Sending" : "Email me a fresh link"}
      </Button>
      <Failure state={state} />
    </form>
  );
}
