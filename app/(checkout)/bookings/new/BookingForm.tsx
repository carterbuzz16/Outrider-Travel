"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Field, Input, RadioControl, RoomPanel, RoomPhotosButton, cn, type RoomView } from "@/components/ui";
import { PendingSubmitButton, SubmitOnceForm } from "@/components/SubmitOnce";
import EmailCodeSignIn from "@/components/EmailCodeSignIn";
import { Countdown } from "@/components/WelcomeCredit";
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
 * tripId, tierId, payment_plan, group_code, discount_code. The figures here are
 * display only; createBooking re-derives every amount from the tier row.
 *
 * A discount code (lib/discount-codes.ts) is applied by reloading the page with
 * ?code=, so the server checks it and every figure on the page, the plans and
 * the button included, already has it off. Without script the code simply
 * posts with the form and createBooking applies it just the same; the prices
 * here then show it only from the payment step on.
 *
 * Signed out is fine (28 September 2026). The page is public, and the account
 * is made at the button: pressing Continue without a session opens an email
 * box and then a 6-digit code box in its place (components/EmailCodeSignIn),
 * and once the code checks out the form submits itself, so the visitor goes
 * straight on to step 2 with the package and plan they picked. createBooking
 * still requires a confirmed account, and a verified code is one.
 *
 * The new-account credit (lib/welcome-credit.ts) shows as its own line, with
 * its countdown, for an account that has it; the page has already taken it off
 * every figure. Signed out, the figures are the full price and a line says the
 * credit comes off at the next step: a new account gets it at Continue, and an
 * older one signing in there does not, so the price only ever goes down. The
 * credit and a discount code do not combine: the page decides which one comes
 * off, and `setAside` names the other, so nobody wonders where it went.
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
  /** What the discount code takes off this package, or null when it does not come off here. */
  codeLabel: string | null;
  /** The code takes the whole price off, deposit included: nothing to pay, and no card. */
  free: boolean;
};

type Plan = "deposit" | "full";

/** How many inclusions a card shows before "See everything included". */
const KEY_INCLUSIONS = 4;

export default function BookingForm({
  tripId,
  tiers,
  initialTierId,
  depositPercent,
  installmentOffsets,
  contactEmail,
  initialGroupCode,
  discount = null,
  rejectedCode = null,
  signedIn,
  credit = null,
  setAside = null,
  creditOffer = null,
}: {
  tripId: string;
  tiers: CheckoutTier[];
  /** Selected on arrival: the package named in the link, or the first open one. */
  initialTierId: string;
  depositPercent: number;
  /** How many scheduled payments the balance is split into. */
  /** INSTALLMENT_OFFSETS_DAYS, passed down: lib/installments.ts is server-only. */
  installmentOffsets: number[];
  contactEmail: string;
  /** From a friend's invite link (?group=), already checked by the page. Opens the code box, filled in. */
  initialGroupCode?: string;
  /**
   * A discount code the page checked (?code=). The tier figures already have
   * it off, and each tier's codeLabel says how much: a code can be for one
   * package only, or worth a share of each.
   */
  discount?: { code: string } | null;
  /** A ?code= that did not check out: shown in its box with a line saying so. */
  rejectedCode?: string | null;
  /** A session with a confirmed email. Without one, Continue asks for an email and a code first. */
  signedIn: boolean;
  /** The account's new-account credit, already off the tier figures, and when it runs out. */
  credit?: { label: string; expiresAt: string } | null;
  /** The credit or the code that does not come off, because the other one does. */
  setAside?: { kind: "code"; code: string } | { kind: "credit"; label: string } | null;
  /** Signed out: what a new account takes off, said beside the total. */
  creditOffer?: string | null;
}) {
  const router = useRouter();
  const [tierId, setTierId] = useState(initialTierId);
  const [codeInput, setCodeInput] = useState(
    discount?.code ?? (setAside?.kind === "code" ? setAside.code : null) ?? rejectedCode ?? "",
  );
  // The code in the box, when it is the one set aside for the credit.
  const codeSetAside = setAside?.kind === "code" ? setAside.code : null;
  const [plan, setPlan] = useState<Plan>("deposit");
  const selected = tiers.find((t) => t.id === tierId) ?? tiers[0];
  const packagesLegend = useId();
  const planLegend = useId();
  const dueToday = plan === "full" ? selected.fullLabel : selected.depositLabel;
  const continueLabel = selected.free ? "Continue, nothing due today" : `Continue, ${dueToday} due today`;
  // The packages the code works on, for saying so beside one it does not.
  const codePackages = tiers.filter((t) => t.codeLabel).map((t) => tierDisplayName(t.name));
  const installments = installmentOffsets.length === 2 ? "two" : String(installmentOffsets.length);
  // "70 and 40", or "90, 60 and 30" if the schedule ever grows a third.
  const installmentDays =
    installmentOffsets.length > 1
      ? `${installmentOffsets.slice(0, -1).join(", ")} and ${installmentOffsets[installmentOffsets.length - 1]}`
      : String(installmentOffsets[0]);
  const groups = [...new Set(tiers.map((t) => t.group).filter((g): g is string => Boolean(g)))];

  // The account step (see the note at the top). `authed` starts from the
  // server's answer and flips when a code checks out; `submitting` then asks
  // the effect below to submit, once the real button is back on screen to
  // show "Holding your spot".
  const [authed, setAuthed] = useState(signedIn);
  const [askingEmail, setAskingEmail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (authed && submitting) panelRef.current?.closest("form")?.requestSubmit();
  }, [authed, submitting]);

  // Whether the box holds the code the page already checked (applied, or set
  // aside for the credit), so its button takes it off rather than re-applying.
  function applied(input: string) {
    const typed = input.trim().toUpperCase();
    return Boolean(typed) && (typed === discount?.code || typed === codeSetAside);
  }

  // Reloads the page with the code (or with an empty one, to take it off),
  // keeping the package picked and any group code from the link. Empty rather
  // than left out: with no ?code= at all, the page applies the $100 code this
  // browser asked for (lib/code-offer-server.ts), and taking that one off
  // has to stick.
  function goWithCode(code: string) {
    // Taking a code off clears the box too. The form keeps its state across the
    // reload, and the box is posted with the booking, so a code left sitting in
    // it would come off at createBooking after all.
    if (!code.trim()) setCodeInput("");
    const params = new URLSearchParams({ trip: tripId, package: tierId });
    if (initialGroupCode) params.set("group", initialGroupCode);
    params.set("code", code.trim());
    router.push(`/bookings/new?${params.toString()}`, { scroll: false });
  }

  return (
    <SubmitOnceForm
      action={createBooking}
      onSubmit={(event) => {
        // No account yet: this press opens the email step instead of posting.
        if (!authed) {
          event.preventDefault();
          setAskingEmail(true);
        }
      }}
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

        {selected.free && (
          <div className="border-b border-[--rule] p-5 sm:p-6">
            <p className="t-micro text-[--text-secondary]">How you pay</p>
            <p className="mt-3 font-body text-body-s leading-[1.55] text-[--text]">
              Nothing. Your code covers the whole trip, deposit included, so there&rsquo;s no card to add.
            </p>
          </div>
        )}
        {/* Hidden rather than left out on a package the code covers: there is
            nothing to choose (both plans come to $0), and kept mounted, the
            radios still match `plan` when another package is picked again. */}
        <fieldset
          className={cn("m-0 min-w-0 border-0 border-b border-[--rule] p-5 sm:p-6", selected.free && "hidden")}
          aria-labelledby={planLegend}
        >
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
              detail={`The other ${selected.balanceLabel} in ${installments} payments, charged to your card ${installmentDays} days before the trip.`}
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

        <details
          className="group border-b border-[--rule] px-5 sm:px-6"
          open={Boolean(discount || rejectedCode || codeSetAside)}
        >
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 font-body text-body-s text-[--text] [&::-webkit-details-marker]:hidden">
            Have a discount code?
            <Chevron />
          </summary>
          <div className="pb-5">
            <Field
              label="Discount code"
              hint={
                codeSetAside
                  ? `${codeSetAside} doesn't combine with your account credit, and the credit is worth more, so the credit comes off instead.`
                  : discount && selected.free
                    ? `${discount.code} covers ${tierDisplayName(selected.name)} in full, deposit included.`
                    : discount && selected.codeLabel
                      ? `${discount.code} takes ${selected.codeLabel} off. It's in the prices above.`
                      : discount
                        ? `${discount.code} works on ${codePackages.join(" and ")} only. Choose it above to use the code.`
                        : undefined
              }
              error={rejectedCode ? "That code didn't work. It may be mistyped or already used." : undefined}
            >
              {(field) => (
                <div className="flex gap-2">
                  <Input
                    {...field}
                    name="discount_code"
                    type="text"
                    maxLength={32}
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    onKeyDown={(e) => {
                      // Enter in this box applies the code; it must not submit
                      // the booking with a code the prices have not caught up to.
                      if (e.key === "Enter") {
                        e.preventDefault();
                        goWithCode(codeInput);
                      }
                    }}
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    className="min-w-0 flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => goWithCode(applied(codeInput) ? "" : codeInput)}
                    className="min-h-11 shrink-0 border border-[--rule-strong] px-4 font-body text-body-s text-[--text] transition-colors duration-fast hover:border-[--accent-solid]"
                  >
                    {applied(codeInput) ? "Remove" : "Apply"}
                  </button>
                </div>
              )}
            </Field>
          </div>
        </details>

        <div ref={panelRef} className="p-5 sm:p-6">
          <dl className="m-0 flex flex-col gap-2.5 font-body text-body-s">
            <Line label="Trip price" value={selected.priceLabel} />
            {discount && selected.codeLabel && (
              <Line label={`Code ${discount.code}`} value={`−${selected.codeLabel}`} />
            )}
            {setAside?.kind === "credit" && (
              <p className="m-0 text-body-s leading-[1.5] text-[--text-secondary]">
                Your {setAside.label} account credit doesn&rsquo;t combine with codes, so the code comes off
                instead.
              </p>
            )}
            {credit && (
              <div className="flex flex-col gap-0.5">
                <Line label="Account credit" value={`−${credit.label}`} />
                <p className="m-0 text-body-s text-[--accent]">
                  {/* Out of time: reload, so the figures are the ones Continue will charge. */}
                  <Countdown expiresAt={credit.expiresAt} onExpire={() => router.refresh()} /> left to use it
                </p>
              </div>
            )}
            {!selected.free && plan === "full" && selected.savingLabel && (
              <Line label="Paying in full" value={`−${selected.savingLabel}`} />
            )}
            {!selected.free && plan === "deposit" && <Line label="Paid later" value={selected.balanceLabel} />}
            <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-[--rule-strong] pt-4">
              <dt className="font-body text-body font-medium text-[--text]">Due today</dt>
              <dd className="m-0 font-display text-display-s font-medium tabular-nums tracking-title text-[--text]">
                {dueToday}
              </dd>
            </div>
          </dl>

          {creditOffer && !authed && (
            // Signed out: the figures above are the full price. The credit is
            // taken off at the next step, once the account exists.
            <p className="m-0 mt-4 border-l-2 border-[--accent] pl-3 font-body text-body-s leading-[1.55] text-[--text]">
              New here? {creditOffer} credit goes into your account when you make it at Continue, and comes off
              before you pay.
            </p>
          )}

          {!authed && askingEmail ? (
            <div className="mt-6 border-t border-[--rule-strong] pt-5">
              <p className="t-micro text-[--text]">Your email</p>
              <p className="mb-4 mt-1.5 font-body text-body-s leading-[1.55] text-[--text-secondary]">
                Your booking, receipts and trip page link go here.
              </p>
              <EmailCodeSignIn
                askName
                offerList
                autoFocus
                continueLabel={continueLabel}
                busyLabel="Holding your spot"
                onSignedIn={() => {
                  setAuthed(true);
                  setSubmitting(true);
                }}
              />
            </div>
          ) : (
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
              {continueLabel}
            </PendingSubmitButton>
          )}

          <ul className="m-0 mt-5 flex list-none flex-col gap-2 p-0 font-body text-body-s leading-[1.5] text-[--text-secondary]">
            <li className="flex items-start gap-2.5">
              <LockGlyph />
              <span>
                {selected.free
                  ? "Next, who\u2019s going. Then you confirm, with no card needed."
                  : "Next, who\u2019s going. Then your card, which Stripe handles."}
              </span>
            </li>
            {!selected.free && (
              <li className="pl-[1.375rem]">
                Deposits aren&rsquo;t refundable. Here are the{" "}
                <Link href="/terms#cancellation" target="_blank" rel="noreferrer" className={LINK}>
                  cancellation terms
                </Link>
                .
              </li>
            )}
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
 * The photograph never takes the card's height. It used to fill a narrow side
 * column top to bottom, and a penthouse card (terms, perks) is tall, so a
 * landscape room became a zoomed portrait strip, upscaled from an image
 * fetched for a 17rem slot: grainy, and the owner's most important picture.
 * Now a penthouse leads with its main photograph as a wide banner across the
 * whole card, and the shared rooms keep a small landscape thumbnail at the
 * top of their side column. Both are fetched at the size they are drawn.
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
  // The penthouses are what the page sells hardest: their photograph goes
  // across the top of the card instead of down the side.
  const banner = tier.room?.key === "PENTHOUSE" || tier.room?.key === "TOP";

  return (
    <div
      className={cn(
        "grid border border-[--rule] bg-[--surface-raised] transition-[border-color,box-shadow] duration-fast ease-out",
        !banner && "sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] md:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]",
        tier.soldOut
          ? "opacity-60"
          : "hover:border-[--rule-strong] has-[:checked]:border-[--accent-solid] has-[:checked]:shadow-[inset_0_0_0_1px_var(--accent-solid)]",
        "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[color:var(--focus-ring)]",
      )}
    >
      {tier.room && (
        <label
          htmlFor={inputId}
          className={cn("block self-start", tier.soldOut ? "cursor-not-allowed" : "cursor-pointer")}
        >
          {photo ? (
            <span
              className={cn(
                "relative block w-full overflow-hidden bg-[--surface-inset]",
                // Landscape at every width. The banner is a touch wider than
                // the photograph (3:2) so it reads as a banner; the crop
                // loses a sliver of ceiling and floor, never the room.
                banner ? "aspect-[3/2] sm:aspect-[2/1]" : "aspect-[3/2] sm:aspect-[4/3]",
              )}
            >
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes={
                  banner
                    ? "(min-width: 1280px) 48rem, (min-width: 1024px) 60vw, 100vw"
                    : "(min-width: 768px) 17rem, (min-width: 640px) 14rem, 100vw"
                }
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
            {tier.free && !tier.soldOut && (
              <span className="t-micro mt-3 text-[--accent]">Covered by your code</span>
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
