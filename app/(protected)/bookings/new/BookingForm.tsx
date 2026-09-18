"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useState } from "react";
import { Field, Input, RadioControl, RoomPanel, RoomPhotosButton, cn, type RoomView } from "@/components/ui";
import { PendingSubmitButton, SubmitOnceForm } from "@/components/SubmitOnce";
import { createBooking } from "@/app/(protected)/bookings/actions";
import { tierDisplayName } from "@/lib/tier-display";

/*
 * Step 1 of checkout: the package and how to pay, as ONE form.
 *
 * It used to be a full form per package, side by side, three buttons and three
 * sets of plan cards; the owner found it cluttered and hard to read. Now the
 * packages are a single radio group (the cards on the left) and everything
 * else sits once in the order panel beside them: the plan, a group code if
 * there is one, the total, and one button. Nothing else is asked here. The
 * terms are agreed in the one box on the payment step, and texts are opted
 * into later on the trip page.
 *
 * It works before hydration and without script: every choice is a native
 * radio, selected looks come from CSS (`has-[:checked]`), and the form posts
 * straight to createBooking. What script adds is the order panel and the
 * button following the selection; with none, they show the default package,
 * and the server works everything out again from what was posted anyway.
 *
 * The field names are the contract with createBooking and must not change:
 * tripId, tierId, payment_plan, group_code. The figures here are display only;
 * createBooking re-derives every amount from the tier row.
 *
 * The form sends once per press and the button says so until the server
 * answers (components/SubmitOnce.tsx). A second press would otherwise create a
 * second booking holding a second place; createBooking also sends a repeat to
 * the first booking's card form, for the repeats this cannot see.
 */

export type CheckoutTier = {
  id: string;
  name: string;
  soldOut: boolean;
  /**
   * A penthouse another group holds (soldOut is true as well, so it is
   * disabled the same way). Only changes the word: "Booked", not "Sold out".
   */
  taken?: boolean;
  /** Package-specific terms shown on the card (the penthouse fill rule, PENTHOUSE_DISCLAIMER). */
  terms?: string | null;
  /** Qualitative ("Few places left"), never a count; null when unremarkable. */
  availability: string | null;
  /** The room line, or the tier's own description when there is no room. */
  summary: string | null;
  inclusions: string[];
  room: RoomView | null;
  /** The two penthouses share a group, and are shown together under its name. */
  group: string | null;
  groupNote: string | null;
  /** All formatted, exact to the cent: these are the figures that come off the card. */
  priceLabel: string;
  depositLabel: string;
  fullLabel: string;
  balanceLabel: string;
  /** What paying in full saves, or null when there is no discount. */
  savingLabel: string | null;
};

type Plan = "deposit" | "full";

/** How many inclusions a card shows before "See everything included". */
const KEY_INCLUSIONS = 4;

export default function BookingForm({
  tripId,
  tiers,
  initialTierId,
  depositPercent,
  installmentCount,
  contactEmail,
  initialGroupCode,
}: {
  tripId: string;
  tiers: CheckoutTier[];
  /** Selected on arrival: the package named in the link, or the first open one. */
  initialTierId: string;
  depositPercent: number;
  /** How many scheduled payments the balance is split into. */
  installmentCount: number;
  contactEmail: string;
  /** From a friend's invite link (?group=), already checked by the page. Opens the code box, filled in. */
  initialGroupCode?: string;
}) {
  const [tierId, setTierId] = useState(initialTierId);
  const [plan, setPlan] = useState<Plan>("deposit");
  const selected = tiers.find((t) => t.id === tierId) ?? tiers[0];
  const packagesLegend = useId();
  const planLegend = useId();
  const dueToday = plan === "full" ? selected.fullLabel : selected.depositLabel;
  const installments = installmentCount === 2 ? "two" : String(installmentCount);
  const groups = [...new Set(tiers.map((t) => t.group).filter((g): g is string => Boolean(g)))];

  return (
    <SubmitOnceForm
      action={createBooking}
      className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-12 xl:gap-16"
    >
      <input type="hidden" name="tripId" value={tripId} />

      {/* -- the packages ------------------------------------------------------ */}
      <fieldset className="m-0 min-w-0 border-0 p-0" aria-labelledby={packagesLegend}>
        <legend id={packagesLegend} className="t-subheading float-left w-full p-0 text-[--text]">
          Choose your package
        </legend>
        <p className="clear-both pt-2 font-body text-body-s leading-[1.6] text-[--text-secondary]">
          Everyone gets the same days on the mountain and the same nights out. Your package decides the room.
        </p>
        <div className="mt-6 flex flex-col gap-4">
          {tiers
            .filter((tier) => !tier.group)
            .map((tier) => (
              <PackageCard
                key={tier.id}
                tier={tier}
                defaultChecked={tier.id === initialTierId}
                onSelect={() => setTierId(tier.id)}
              />
            ))}
          {/* The penthouses: one choice in two versions, so they sit together
              under their own heading rather than as two more equal cards.
              Still the same radio group, so the form posts exactly as before. */}
          {groups.map((group) => {
            const members = tiers.filter((tier) => tier.group === group);
            const note = members.find((tier) => tier.groupNote)?.groupNote;
            return (
              <div key={group} className="mt-4 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5 border-t border-[--rule-strong] pt-5">
                  <p className="font-display text-display-s font-medium tracking-title text-[--text]">{group}</p>
                  {note && (
                    <p className="font-body text-body-s leading-[1.6] text-[--text-secondary]">{note}</p>
                  )}
                </div>
                {members.map((tier) => (
                  <PackageCard
                    key={tier.id}
                    tier={tier}
                    defaultChecked={tier.id === initialTierId}
                    onSelect={() => setTierId(tier.id)}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </fieldset>

      {/* -- the order panel --------------------------------------------------- */}
      <aside
        aria-label="Your order"
        className="border border-[--rule] bg-[--surface-raised] lg:sticky lg:top-8"
      >
        <div className="border-b border-[--rule] p-5 sm:p-6">
          <p className="t-micro text-[--text-secondary]">Your package</p>
          <div className="mt-2 flex items-baseline justify-between gap-4">
            <p className="font-display text-display-s font-medium tracking-title text-[--text]">{tierDisplayName(selected.name)}</p>
            <p className="font-body text-body tabular-nums text-[--text]">{selected.priceLabel}</p>
          </div>
          {selected.summary && (
            <p className="mt-1 font-body text-body-s leading-[1.6] text-[--text-secondary]">{selected.summary}</p>
          )}
        </div>

        <fieldset className="m-0 min-w-0 border-0 border-b border-[--rule] p-5 sm:p-6" aria-labelledby={planLegend}>
          <legend id={planLegend} className="t-micro float-left w-full p-0 text-[--text-secondary]">
            How you pay
          </legend>
          <div className="clear-both flex flex-col gap-2.5 pt-3">
            <PlanOption
              value="deposit"
              defaultChecked
              onSelect={() => setPlan("deposit")}
              title={`${depositPercent}% deposit today`}
              amount={selected.depositLabel}
              // The timing restates INSTALLMENT_OFFSETS_DAYS in lib/installments.ts
              // (server-only, so not importable here). Change both together.
              detail={`The other ${selected.balanceLabel} in ${installments} payments, charged to your card 60 and 30 days before the trip.`}
            />
            <PlanOption
              value="full"
              onSelect={() => setPlan("full")}
              title="Pay in full"
              amount={selected.fullLabel}
              detail={
                selected.savingLabel
                  ? `${selected.savingLabel} off the price, and nothing more to pay later.`
                  : "One payment, and nothing more to pay later."
              }
            />
          </div>
        </fieldset>

        <details className="group border-b border-[--rule] px-5 sm:px-6" open={Boolean(initialGroupCode)}>
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 font-body text-body-s text-[--text] [&::-webkit-details-marker]:hidden">
            Have a group code?
            <Chevron />
          </summary>
          <div className="pb-5">
            <Field label="Group code" hint="Friends already booked? Their code puts you in the same group.">
              {(field) => (
                <Input
                  {...field}
                  name="group_code"
                  type="text"
                  maxLength={6}
                  defaultValue={initialGroupCode}
                  placeholder="K7XPQ2"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                />
              )}
            </Field>
          </div>
        </details>

        <div className="p-5 sm:p-6">
          <dl className="m-0 flex flex-col gap-2.5 font-body text-body-s">
            <Line label="Trip price" value={selected.priceLabel} />
            {plan === "full" && selected.savingLabel && (
              <Line label="Paying in full" value={`−${selected.savingLabel}`} />
            )}
            {plan === "deposit" && <Line label="Paid later" value={selected.balanceLabel} />}
            <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-[--rule-strong] pt-4">
              <dt className="font-body text-body font-medium text-[--text]">Due today</dt>
              <dd className="m-0 font-display text-display-s font-medium tabular-nums tracking-title text-[--text]">
                {dueToday}
              </dd>
            </div>
          </dl>

          <PendingSubmitButton
            variant="primary"
            size="lg"
            block
            pendingLabel="Holding your spot"
            // Wraps rather than overflowing the panel at 375px; the base
            // button is nowrap, so this needs the important modifier to win.
            className="mt-6 !whitespace-normal text-center !leading-[1.35]"
            disabled={selected.soldOut}
          >
            Continue to payment · {dueToday}
          </PendingSubmitButton>

          <ul className="m-0 mt-5 flex list-none flex-col gap-2 p-0 font-body text-body-s leading-[1.5] text-[--text-secondary]">
            <li className="flex items-start gap-2.5">
              <LockGlyph />
              <span>You add your card on the next step. Stripe handles the payment.</span>
            </li>
            <li className="pl-[1.375rem]">
              Deposits aren&rsquo;t refundable. Here are the{" "}
              <Link href="/terms#cancellation" target="_blank" rel="noreferrer" className={LINK}>
                cancellation terms
              </Link>
              .
            </li>
            <li className="pl-[1.375rem]">
              Questions?{" "}
              <a href={`mailto:${contactEmail}`} className={LINK}>
                {contactEmail}
              </a>
            </li>
          </ul>
        </div>
      </aside>
    </SubmitOnceForm>
  );
}

const LINK = "text-[--accent] underline underline-offset-2";

/* -- one package ------------------------------------------------------------ */

/*
 * A package as a selectable card, room first. The radio is native and the
 * card's selected look is `:has(:checked)`, so it is right before hydration.
 *
 * The picture and the text are both <label>s for the radio, so a tap almost
 * anywhere selects it. The two things that are not (the full inclusions list
 * and the photo viewer) sit outside the labels: interactive content inside a
 * label is invalid and would fight the radio for the tap.
 */
function PackageCard({
  tier,
  defaultChecked,
  onSelect,
}: {
  tier: CheckoutTier;
  defaultChecked: boolean;
  onSelect: () => void;
}) {
  const inputId = useId();
  const key = tier.inclusions.slice(0, KEY_INCLUSIONS);
  const more = tier.inclusions.length > KEY_INCLUSIONS;
  const photo = tier.room?.photos[0] ?? null;

  return (
    <div
      className={cn(
        "grid border border-[--rule] bg-[--surface-raised] transition-[border-color,box-shadow] duration-fast ease-out",
        "sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] md:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]",
        tier.soldOut
          ? "opacity-60"
          : "hover:border-[--rule-strong] has-[:checked]:border-[--accent-solid] has-[:checked]:shadow-[inset_0_0_0_1px_var(--accent-solid)]",
        "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[color:var(--focus-ring)]",
      )}
    >
      {tier.room && (
        <label htmlFor={inputId} className={cn("block", tier.soldOut ? "cursor-not-allowed" : "cursor-pointer")}>
          {photo ? (
            <span className="relative block aspect-[3/2] h-full w-full overflow-hidden bg-[--surface-inset] sm:aspect-auto sm:min-h-full">
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes="(min-width: 768px) 17rem, (min-width: 640px) 14rem, 100vw"
                className="object-cover"
              />
            </span>
          ) : (
            <RoomPanel room={tier.room} size="card" />
          )}
        </label>
      )}

      <div className={cn("flex min-w-0 flex-col p-5 sm:p-6", !tier.room && "sm:col-span-2")}>
        <label
          htmlFor={inputId}
          className={cn("flex items-start gap-3.5", tier.soldOut ? "cursor-not-allowed" : "cursor-pointer")}
        >
          <RadioControl
            id={inputId}
            name="tierId"
            value={tier.id}
            defaultChecked={defaultChecked}
            disabled={tier.soldOut}
            required
            onChange={(e) => {
              if (e.target.checked) onSelect();
            }}
            // The card carries the focus ring; a second one on the dot is noise.
            className="mt-1 [&>input:focus-visible]:outline-none"
          />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="font-display text-display-s font-medium tracking-title text-[--text]">
                {tierDisplayName(tier.name)}
              </span>
              <span className="font-body text-body tabular-nums text-[--text]">
                {tier.priceLabel}
                <span className="ml-1.5 text-body-s text-[--text-secondary]">per person</span>
              </span>
            </span>
            {tier.summary && (
              <span className="mt-1 font-body text-body leading-[1.5] text-[--text-secondary]">{tier.summary}</span>
            )}
            {tier.taken ? (
              <span className="mt-3 flex flex-col gap-1">
                <span className="t-micro text-[--text-secondary]">Taken</span>
                <span className="font-body text-body-s leading-[1.5] text-[--text-secondary]">
                  Booked by another group. Have their group code? Enter it below.
                </span>
              </span>
            ) : (
              (tier.soldOut || tier.availability) && (
                <span
                  className={cn(
                    "t-micro mt-3",
                    tier.soldOut ? "text-[--text-secondary]" : "text-[--flag-ink]",
                  )}
                >
                  {tier.soldOut ? "Sold out" : tier.availability}
                </span>
              )
            )}
            {tier.terms && !tier.taken && (
              <span className="mt-3 border-l-2 border-[--rule-strong] pl-3 font-body text-body-s leading-[1.55] text-[--text-secondary]">
                {tier.terms}
              </span>
            )}
            {key.length > 0 && (
              <span className="mt-4 flex flex-col gap-1.5" role="list">
                {key.map((item) => (
                  <Inclusion key={item}>{item}</Inclusion>
                ))}
              </span>
            )}
          </span>
        </label>

        {(more || (tier.room?.photos.length ?? 0) > 0) && (
          <div className="mt-2 flex flex-wrap items-start gap-x-6 pl-[2.125rem]">
            {more && (
              <details className="group min-w-0 basis-full">
                <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 font-body text-body-s text-[--accent] underline underline-offset-4 [&::-webkit-details-marker]:hidden">
                  <span className="group-open:hidden">See everything included</span>
                  <span className="hidden group-open:inline">Show less</span>
                </summary>
                <span className="flex flex-col gap-1.5 pb-1" role="list">
                  {tier.inclusions.slice(KEY_INCLUSIONS).map((item) => (
                    <Inclusion key={item}>{item}</Inclusion>
                  ))}
                </span>
              </details>
            )}
            {tier.room && tier.room.photos.length > 0 && (
              <RoomPhotosButton photos={tier.room.photos} title={tier.room.title} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Inclusion({ children }: { children: React.ReactNode }) {
  return (
    <span role="listitem" className="flex gap-3 font-body text-body-s leading-[1.55] text-[--text]">
      <span aria-hidden="true" className="mt-[0.6em] h-1 w-1 shrink-0 bg-[--accent]" />
      <span>{children}</span>
    </span>
  );
}

/* -- one plan --------------------------------------------------------------- */

function PlanOption({
  value,
  defaultChecked,
  onSelect,
  title,
  amount,
  detail,
}: {
  value: Plan;
  defaultChecked?: boolean;
  onSelect: () => void;
  title: string;
  amount: string;
  detail: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3.5 border border-[--rule] bg-[--surface] p-4",
        "transition-[border-color,box-shadow] duration-fast ease-out hover:border-[--rule-strong]",
        "has-[:checked]:border-[--accent-solid] has-[:checked]:shadow-[inset_0_0_0_1px_var(--accent-solid)]",
        "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[color:var(--focus-ring)]",
      )}
    >
      <RadioControl
        name="payment_plan"
        value={value}
        defaultChecked={defaultChecked}
        onChange={(e) => {
          if (e.target.checked) onSelect();
        }}
        className="mt-0.5 [&>input:focus-visible]:outline-none"
      />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="font-body text-body font-medium text-[--text]">{title}</span>
          <span className="font-body text-body font-medium tabular-nums text-[--text]">{amount}</span>
        </span>
        <span className="mt-1 font-body text-body-s leading-[1.5] text-[--text-secondary]">{detail}</span>
      </span>
    </label>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-[--text-secondary]">{label}</dt>
      <dd className="m-0 tabular-nums text-[--text]">{value}</dd>
    </div>
  );
}

function Chevron() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 8"
      className="h-2 w-3 shrink-0 text-[--text-secondary] transition-transform duration-fast group-open:rotate-180"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
    >
      <path d="M1 1.5l5 5 5-5" />
    </svg>
  );
}

/* The padlock from CheckoutForm, in the same 1px vocabulary. Decorative. */
function LockGlyph() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 14"
      className="mt-[0.3rem] h-3 w-3 shrink-0 text-[--accent]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
    >
      <rect x="0.5" y="5.5" width="11" height="8" />
      <path d="M3 5.5V3.5a3 3 0 0 1 6 0v2" />
    </svg>
  );
}
