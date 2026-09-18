"use client";

import { useState } from "react";
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

  return (
    <div className="mt-7 border-t border-[--rule-faint] pt-6">
      <p className="stamp-type text-[--text-muted]">Pay ahead</p>
      <p className="mt-3 max-w-measure font-body text-body-s leading-[1.7] text-[--text-secondary]">
        Pay some or all of what is left now. It comes off your scheduled payments, earliest first.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
        <SubmitOnceForm action={startBalancePayment}>
          <input type="hidden" name="booking_id" value={bookingId} />
          <input type="hidden" name="mode" value="remaining" />
          <PendingSubmitButton variant="secondary" size="sm" pendingLabel="Starting payment">
            Pay the remaining balance ({formatAmount(remaining)})
          </PendingSubmitButton>
        </SubmitOnceForm>

        {!custom && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={false}
            onClick={() => setCustom(true)}
          >
            Pay a different amount
          </Button>
        )}
      </div>

      {custom && (
        <SubmitOnceForm action={startBalancePayment} className="mt-6 flex max-w-md flex-col gap-4">
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
              />
            )}
          </Field>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <PendingSubmitButton variant="primary" size="sm" pendingLabel="Starting payment">
              Continue to payment
            </PendingSubmitButton>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-[--text-secondary]"
              onClick={() => setCustom(false)}
            >
              Never mind
            </Button>
          </div>
        </SubmitOnceForm>
      )}
    </div>
  );
}
