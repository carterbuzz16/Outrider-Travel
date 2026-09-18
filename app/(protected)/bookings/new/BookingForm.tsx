"use client";

import { useId, useState } from "react";
import { AcceptTerms, Button, Field, Input, cn } from "@/components/ui";
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
 *
 * The figures in the labels are display only. The form posts which plan was
 * picked and nothing else about money; createBooking works out both amounts
 * again from the tier row.
 */
export default function BookingForm({
  tripId,
  tierId,
  tierName,
  depositLabel,
  fullLabel,
  savingLabel,
  soldOut = false,
}: {
  tripId: string;
  tierId: string;
  tierName: string;
  /** The deposit, formatted: "$150". */
  depositLabel: string;
  /** The pay-in-full price after any discount, formatted. */
  fullLabel: string;
  /** What paying in full saves, formatted, or null when there is no discount. */
  savingLabel: string | null;
  soldOut?: boolean;
}) {
  const [plan, setPlan] = useState<"deposit" | "full">("deposit");
  const legendId = useId();

  return (
    <form action={createBooking} className="flex flex-col gap-5">
      <input type="hidden" name="tripId" value={tripId} />
      <input type="hidden" name="tierId" value={tierId} />

      {!soldOut && (
        <fieldset className="m-0 flex min-w-0 flex-col gap-2.5 border-0 p-0" aria-labelledby={legendId}>
          <legend id={legendId} className="t-micro mb-2 p-0 text-[--text-secondary]">
            How you pay
          </legend>
          <PlanOption
            name="payment_plan"
            value="deposit"
            checked={plan === "deposit"}
            onSelect={() => setPlan("deposit")}
            title={`Pay the deposit (${depositLabel})`}
            detail="The balance is taken in two scheduled payments."
          />
          <PlanOption
            name="payment_plan"
            value="full"
            checked={plan === "full"}
            onSelect={() => setPlan("full")}
            title={
              savingLabel
                ? `Pay in full: ${fullLabel} (save ${savingLabel})`
                : `Pay in full (${fullLabel})`
            }
            detail="One payment now, and nothing more to pay later."
          />
        </fieldset>
      )}

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
        {soldOut
          ? "Sold out"
          : plan === "full"
            ? `${fullLabel} in full now`
            : `${depositLabel} deposit now`}
        <span className="sr-only">, {tierName}</span>
      </Button>
    </form>
  );
}

/*
 * A radio drawn as a hairline row, so the two plans read as choices on the
 * same paperwork as the fields below them. The native input stays in the
 * tree for keyboard and screen readers, restyled with the same tokens as
 * AcceptTerms' checkbox but round, because it is one-of-two rather than a
 * tick. The whole row is its label, so the target is the row, not the dot.
 */
function PlanOption({
  name,
  value,
  checked,
  onSelect,
  title,
  detail,
}: {
  name: string;
  value: string;
  checked: boolean;
  onSelect: () => void;
  title: string;
  detail: string;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-3.5 border p-4 transition-colors duration-fast",
        checked ? "border-[--accent-solid]" : "border-[--rule] hover:border-[--rule-strong]",
      )}
    >
      <input
        id={id}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onSelect}
        className={cn(
          "mt-1 h-4 w-4 shrink-0 cursor-pointer appearance-none rounded-full border border-[--rule-strong]",
          "bg-transparent transition-colors duration-fast",
          "checked:border-[--accent-solid] checked:bg-[--accent-solid]",
          "checked:shadow-[inset_0_0_0_3px_var(--surface-raised)]",
        )}
      />
      <span className="min-w-0">
        <span className="block font-body text-body-s font-medium leading-[1.5] text-[--text]">{title}</span>
        <span className="mt-1 block font-body text-body-s leading-[1.6] text-[--text-secondary]">{detail}</span>
      </span>
    </label>
  );
}
