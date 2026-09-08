"use client";

import { AcceptTerms, Button, Field, Input } from "@/components/ui";
import { createBooking } from "@/app/(protected)/bookings/actions";

/*
 * The per-tier booking form.
 *
 * Split out of the page and marked client for one reason: `Field` passes its
 * control down through a render-prop child, and a function cannot cross the
 * server/client boundary. The page around it stays a Server Component, and
 * `createBooking` is still a server action — nothing about the submit path
 * moves into the browser.
 *
 * One form per tier rather than one form with a tier selector: the tier is the
 * thing being chosen, so choosing it and submitting are the same gesture.
 */
export default function BookingForm({
  tripId,
  tierId,
  tierName,
  depositLabel,
  soldOut = false,
}: {
  tripId: string;
  tierId: string;
  tierName: string;
  depositLabel: string;
  soldOut?: boolean;
}) {
  return (
    <form action={createBooking} className="flex flex-col gap-5">
      <input type="hidden" name="tripId" value={tripId} />
      <input type="hidden" name="tierId" value={tierId} />

      <Field
        label="Group code"
        hint="Friends already booked? Their code puts you in the same group. Leave it blank to start one."
      >
        {(field) => (
          <Input
            {...field}
            name="group_code"
            type="text"
            maxLength={6}
            placeholder="K7XPQ2"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            disabled={soldOut}
          />
        )}
      </Field>

      {/* createBooking rejects a submission without this, and writes a
          versioned acceptance row before any PaymentIntent exists — see
          app/(protected)/bookings/actions.ts and lib/legal-acceptance.ts. */}
      {!soldOut && <AcceptTerms />}

      <Button type="submit" variant="primary" size="md" block disabled={soldOut}>
        {soldOut ? "Sold out" : depositLabel}
        <span className="sr-only">, {tierName}</span>
      </Button>
    </form>
  );
}
