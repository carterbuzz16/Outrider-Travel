"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import { Button, Dialog } from "@/components/ui";
import { cancelBooking } from "@/app/(protected)/bookings/actions";

/**
 * "Cancel booking", with a question in between.
 *
 * Cancelling is one click from a list of bookings and cannot be undone online,
 * so the click opens a dialog that names the trip and says what the
 * cancellation does to money, both the payments still to come and the ones
 * already taken, before anything is sent.
 *
 * It is still the same plain server-action form. The trigger is a real submit
 * button that, once hydrated, opens the dialog instead of submitting; the
 * dialog's own button is what submits. Before hydration, or with scripts off,
 * the trigger submits directly, which is how this worked before the dialog and
 * is better than a button that does nothing.
 *
 * The money copy restates the cancellation terms rather than adding to them:
 * cancelling stops future installments but refunds nothing by itself, the
 * deposit is non-refundable, and anything above it is refunded by hand, to the
 * original card, on the sliding scale at /terms#cancellation. See the "How to
 * cancel" part of that section and the notes on cancelBooking in actions.ts.
 */
export default function CancelBookingButton({
  bookingId,
  tripName,
  paidLabel,
  depositLabel,
}: {
  bookingId: string;
  tripName: string;
  /** What has actually cleared on the booking, formatted; null when nothing has. */
  paidLabel: string | null;
  depositLabel: string;
}) {
  const [open, setOpen] = useState(false);
  // Button does not forward a ref, and whatever had focus is where it should
  // go back to anyway (see WaitlistButton).
  const restoreTo = useRef<HTMLElement | null>(null);
  // useFormStatus only flips to pending on the next render, so a fast second
  // press could otherwise send the action twice. This closes that gap.
  const inFlight = useRef(false);

  const close = useCallback(() => {
    setOpen(false);
    restoreTo.current?.focus();
  }, []);

  // A cancel that worked redirects to /bookings, where this booking is no
  // longer cancellable and this component is gone. One that failed also lands
  // back on /bookings, with the reason in the alert at the top of the page, and
  // the dialog would only be covering it, so it closes.
  const settle = useCallback(() => {
    if (!inFlight.current) return;
    inFlight.current = false;
    close();
  }, [close]);

  function guard(event: FormEvent<HTMLFormElement>) {
    if (inFlight.current) {
      event.preventDefault();
      return;
    }
    inFlight.current = true;
  }

  return (
    <form action={cancelBooking} onSubmit={guard} className="flex items-center">
      <input type="hidden" name="booking_id" value={bookingId} />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        // Quiet on purpose: the destructive action on the card is a text
        // button in the secondary ink, and only its dialog carries the flag.
        className="min-h-11 text-[--text-secondary]"
        aria-haspopup="dialog"
        onClick={(event) => {
          event.preventDefault();
          restoreTo.current = event.currentTarget as HTMLElement;
          setOpen(true);
        }}
      >
        Cancel booking
      </Button>

      <ConfirmCancel
        open={open}
        onKeep={close}
        onSettled={settle}
        tripName={tripName}
        paidLabel={paidLabel}
        depositLabel={depositLabel}
      />
    </form>
  );
}

/**
 * The dialog itself. Its own component because useFormStatus reads the form it
 * is rendered inside, and the pending state has to reach both buttons and the
 * dialog's lock.
 */
function ConfirmCancel({
  open,
  onKeep,
  onSettled,
  tripName,
  paidLabel,
  depositLabel,
}: {
  open: boolean;
  onKeep: () => void;
  onSettled: () => void;
  tripName: string;
  paidLabel: string | null;
  depositLabel: string;
}) {
  const { pending } = useFormStatus();

  useEffect(() => {
    if (!pending) onSettled();
  }, [pending, onSettled]);

  return (
    <Dialog
      open={open}
      onClose={onKeep}
      role="alertdialog"
      locked={pending}
      title={`Cancel your booking for ${tripName}?`}
      description={
        <>
          <p>
            Your booking is cancelled and your spot is released. Any payments still scheduled on it
            are stopped, and nothing more will be taken from your card. There is no way to undo this
            online.
          </p>
          <p className="mt-4">
            {paidLabel ? (
              <>
                You have paid {paidLabel} so far. Cancelling does not refund any of it
                automatically. The {depositLabel} deposit is non-refundable, and anything you paid
                above it is refunded by hand to the original card, on the schedule in the{" "}
                <Link href="/terms#cancellation" className="text-[--accent] underline underline-offset-2">
                  cancellation terms
                </Link>
                .
              </>
            ) : (
              <>
                Nothing has been charged on this booking yet, so there is nothing to refund. The{" "}
                <Link href="/terms#cancellation" className="text-[--accent] underline underline-offset-2">
                  cancellation terms
                </Link>{" "}
                have the full policy.
              </>
            )}
          </p>
        </>
      }
    >
      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {/* The safe choice takes focus, so Enter or Space on arrival keeps the
            booking. It is also the way out while nothing is running. */}
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={onKeep}
          disabled={pending}
          data-autofocus
        >
          Keep my booking
        </Button>
        <Button
          type="submit"
          variant="danger"
          size="md"
          disabled={pending}
          // aria-busy as well as the label, so the wait is announced and not
          // only read.
          aria-busy={pending}
        >
          {pending ? "Cancelling" : "Cancel booking"}
        </Button>
      </div>
    </Dialog>
  );
}
