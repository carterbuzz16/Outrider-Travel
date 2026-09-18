"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { AcceptTerms, Badge, CheckRow, Field, Input, RadioControl, cn } from "@/components/ui";
import { SMS_CONSENT_FIELD, SMS_CONSENT_PARTS } from "@/lib/sms-consent";
import { PendingSubmitButton, SubmitOnceForm } from "@/components/SubmitOnce";
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
 * The plan choice is two native radios drawn as cards. Their selected look is
 * CSS (`has-[:checked]`), so it is right before hydration; the only thing
 * state drives is the button's label, which names the plan and the amount.
 *
 * The figures in the labels are display only. The form posts which plan was
 * picked and nothing else about money; createBooking works out both amounts
 * again from the tier row.
 *
 * The form sends once per press and the button says so until the server
 * answers (components/SubmitOnce.tsx). A second press would otherwise create a
 * second booking holding a second place in the tier; createBooking also sends
 * a repeat to the first booking's card form, for the repeats this cannot see.
 */
export default function BookingForm({
  tripId,
  tierId,
  tierName,
  priceLabel,
  depositLabel,
  fullLabel,
  savingLabel,
  soldOut = false,
}: {
  tripId: string;
  tierId: string;
  tierName: string;
  /** The tier price before any discount, formatted: "$4,500". */
  priceLabel: string;
  /** The deposit, formatted: "$450". */
  depositLabel: string;
  /** The pay-in-full price after any discount, formatted. */
  fullLabel: string;
  /** What paying in full saves, formatted, or null when there is no discount. */
  savingLabel: string | null;
  soldOut?: boolean;
}) {
  const [plan, setPlan] = useState<"deposit" | "full">("deposit");
  const legendId = useId();

  if (soldOut) {
    // Nothing to fill in: the button is the whole message, and a disabled
    // group-code box under a sold-out package only reads as broken.
    return (
      <div className="flex flex-col gap-3">
        <p className="font-body text-body-s leading-[1.7] text-[--text-secondary]">
          Every place in this package is taken. Another package on the same dates may still be open.
        </p>
        <button
          type="button"
          disabled
          className="t-label min-h-12 w-full border border-[--rule] px-6 text-[--text-secondary]"
        >
          Sold out<span className="sr-only">, {tierName}</span>
        </button>
      </div>
    );
  }

  return (
    <SubmitOnceForm action={createBooking} className="flex flex-col">
      <input type="hidden" name="tripId" value={tripId} />
      <input type="hidden" name="tierId" value={tierId} />

      <fieldset className="m-0 min-w-0 border-0 p-0" aria-labelledby={legendId}>
        <legend id={legendId} className="t-micro p-0 text-[--text-secondary]">
          How you pay
        </legend>
        <div className="mt-3 flex flex-col gap-3">
          <PlanOption
            name="payment_plan"
            value="deposit"
            defaultChecked
            onSelect={() => setPlan("deposit")}
            title="Deposit"
            amount={depositLabel}
            amountNote="today"
            detail={`Holds your place. The rest of the ${priceLabel} is taken in two scheduled payments before you travel.`}
          />
          <PlanOption
            name="payment_plan"
            value="full"
            onSelect={() => setPlan("full")}
            title="Pay in full"
            amount={fullLabel}
            amountNote="today"
            was={savingLabel ? priceLabel : undefined}
            badge={savingLabel ? `Save ${savingLabel}` : undefined}
            detail="One payment now, and nothing more to pay later."
          />
        </div>
      </fieldset>

      <Field
        label="Group code"
        hint="Friends already booked? Their code puts you in the same group. Leave it blank to start one."
        className="mt-8"
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
          />
        )}
      </Field>

      <div className="mt-8 flex flex-col gap-3">
        {/* createBooking rejects a submission without this, and writes a
            versioned acceptance row before any PaymentIntent exists — see
            app/(protected)/bookings/actions.ts and lib/legal-acceptance.ts. */}
        <AcceptTerms />

        {/* Separate from the terms and never required: carriers reject an
            opt-in that is bundled with the purchase or ticked in advance. */}
        <SmsConsent />
      </div>

      <PendingSubmitButton variant="primary" size="lg" block pendingLabel="Holding your spot" className="mt-8">
        {plan === "full" ? `Pay ${fullLabel} in full` : `Pay ${depositLabel} deposit`}
        <span className="sr-only">, {tierName}</span>
      </PendingSubmitButton>
      <p className="mt-3 text-center font-body text-body-s text-[--text-secondary]">
        You enter your card on the next screen.
      </p>
    </SubmitOnceForm>
  );
}

/*
 * The text-message opt-in. Unchecked by default, not required, and its own
 * box rather than a clause in AcceptTerms, because consent to texts must not
 * be a condition of booking. The wording comes from lib/sms-consent.ts, which
 * also holds the version createBooking stores with the tick. The links open in
 * a new tab for the same reason AcceptTerms' do: nobody loses a part-filled
 * form to read them.
 */
function SmsConsent() {
  return (
    <CheckRow name={SMS_CONSENT_FIELD}>
      {SMS_CONSENT_PARTS.lead}
      <Link href="/privacy" target="_blank" rel="noreferrer" className={LINK}>
        {SMS_CONSENT_PARTS.privacyLabel}
      </Link>
      {SMS_CONSENT_PARTS.between}
      <Link href="/terms" target="_blank" rel="noreferrer" className={LINK}>
        {SMS_CONSENT_PARTS.termsLabel}
      </Link>
      {SMS_CONSENT_PARTS.tail}
    </CheckRow>
  );
}

const LINK = "text-[--accent] underline underline-offset-2";

/*
 * One plan, as a selectable card. The native radio stays in the tree for
 * keyboard and screen readers (arrow keys move between the two, as a radio
 * group should), and the whole card is its label, so the target is the card,
 * not the dot. Selected is a doubled espresso rule, drawn from `:has(:checked)`
 * so it needs no script; keyboard focus shows as the ring on the card.
 */
function PlanOption({
  name,
  value,
  defaultChecked,
  onSelect,
  title,
  amount,
  amountNote,
  was,
  badge,
  detail,
}: {
  name: string;
  value: string;
  defaultChecked?: boolean;
  onSelect: () => void;
  title: string;
  amount: string;
  amountNote: string;
  /** The undiscounted price, struck through beside the amount. */
  was?: string;
  badge?: string;
  detail: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-4 border border-[--rule] bg-[--surface] p-4 sm:p-5",
        "transition-[border-color,box-shadow] duration-fast ease-out hover:border-[--rule-strong]",
        "has-[:checked]:border-[--accent-solid] has-[:checked]:shadow-[inset_0_0_0_1px_var(--accent-solid)]",
        "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[color:var(--focus-ring)]",
      )}
    >
      <RadioControl
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        onChange={(e) => {
          if (e.target.checked) onSelect();
        }}
        // The card carries the focus ring; a second one on the dot is noise.
        className="mt-0.5 [&>input:focus-visible]:outline-none"
      />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <span className="t-micro text-[--text]">{title}</span>
          {badge && <Badge tone="open" plain>{badge}</Badge>}
        </span>
        <span className="mt-2.5 flex flex-wrap items-baseline gap-x-2.5">
          <span className="font-display text-display-s font-medium leading-none tabular-nums tracking-title text-[--text]">
            {amount}
          </span>
          {was && (
            <s className="font-body text-body-s tabular-nums text-[--text-secondary]">
              <span className="sr-only">instead of </span>
              {was}
            </s>
          )}
          <span className="font-body text-body-s text-[--text-secondary]">{amountNote}</span>
        </span>
        <span className="mt-2 block font-body text-body-s leading-[1.6] text-[--text-secondary]">
          {detail}
        </span>
      </span>
    </label>
  );
}
