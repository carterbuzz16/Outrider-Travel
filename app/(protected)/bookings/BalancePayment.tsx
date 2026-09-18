"use client";

import { useId, useState } from "react";
import { Button, Field, Input } from "@/components/ui";
import { PendingSubmitButton, SubmitOnceForm } from "@/components/SubmitOnce";
import { startBalancePayment } from "@/app/(protected)/bookings/actions";
import { formatAmount, fromCents, minimumBalanceCents, toCents } from "@/lib/balance";

/*
 * The two ways to pay a balance down early, under a booking on /bookings.
 *
 * Client only because the custom amount stays folded away until asked for, and
 * `Field` hands its control down through a render-prop, which a Server
 * Component cannot pass. Both buttons post to startBalancePayment, which
 * re-derives what is owed and checks the amount against it; the figures here
 * are for the traveler to read, and the `min`/`max` on the input are a
 * courtesy, not a control.
 *
 * Each form sends once per press, and its button says so until the server
 * answers (components/SubmitOnce.tsx), so a double-click does not ask for two
 * card forms. startBalancePayment would hand back the first one anyway; this
 * keeps the second request from being made.
 */
export default function BalancePayment({ bookingId, remaining }: { bookingId: string; remaining: number }) {
  const [custom, setCustom] = useState(false);

  const owed = toCents(remaining);
  const minimum = fromCents(minimumBalanceCents(owed));

  const formId = useId();

  return (
    <section className="mt-8 border-t border-[--rule] pt-6" aria-labelledby={`${formId}-heading`}>
      <h3 id={`${formId}-heading`} className="t-micro text-[--text]">
        Pay ahead
      </h3>
      <p className="mt-2 max-w-measure font-body text-body-s leading-[1.7] text-[--text-secondary]">
        Pay some or all of what is left now. It comes off your scheduled payments, earliest first.
      </p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6">
        <SubmitOnceForm action={startBalancePayment} className="flex flex-col sm:block">
          <input type="hidden" name="booking_id" value={bookingId} />
          <input type="hidden" name="mode" value="remaining" />
          <PendingSubmitButton variant="secondary" size="md" pendingLabel="Starting payment">
            Pay the remaining balance ({formatAmount(remaining)})
          </PendingSubmitButton>
        </SubmitOnceForm>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-expanded={custom}
          aria-controls={`${formId}-custom`}
          onClick={() => setCustom((open) => !open)}
          className="min-h-11 self-center sm:self-auto"
        >
          {custom ? "Hide custom amount" : "Pay a different amount"}
        </Button>
      </div>

      {custom && (
        <SubmitOnceForm
          id={`${formId}-custom`}
          action={startBalancePayment}
          className="mt-6 flex max-w-sm flex-col gap-4"
        >
          <input type="hidden" name="booking_id" value={bookingId} />
          <input type="hidden" name="mode" value="custom" />
          <Field
            label="Amount in dollars"
            hint={`Between ${formatAmount(minimum)} and ${formatAmount(remaining)}.`}
          >
            {(field) => (
              <Input
                {...field}
                name="amount"
                type="number"
                inputMode="decimal"
                min={minimum}
                max={remaining}
                step="0.01"
                required
                autoFocus
                placeholder={String(Math.round(minimum))}
                className="tabular-nums"
              />
            )}
          </Field>
          <PendingSubmitButton variant="primary" size="md" pendingLabel="Starting payment" className="self-start">
            Continue to payment
          </PendingSubmitButton>
        </SubmitOnceForm>
      )}
    </section>
  );
}
