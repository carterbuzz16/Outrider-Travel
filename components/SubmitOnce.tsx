"use client";

import { createContext, useContext, useEffect, useRef, type ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui";

/*
 * A server-action form that sends once per press, however fast the presses.
 *
 * For the forms that start a payment (booking a trip, paying down a balance),
 * where a second submit would open a second card form that could be paid as
 * well. The server guards against that too (see bookings/actions.ts); this is
 * the half that keeps it from being asked twice in the first place, and that
 * tells the traveler their press registered.
 *
 * useFormStatus only reports pending on the render after the submit, so a
 * double-click lands both presses before the button disables. The ref closes
 * that gap, the same way CancelBookingButton does. When the action settles
 * without leaving the page (it redirected back with an error), the form is
 * released so it can be tried again.
 */

const Guard = createContext<React.MutableRefObject<boolean> | null>(null);

export function SubmitOnceForm({ onSubmit, children, ...props }: ComponentProps<"form">) {
  const inFlight = useRef(false);

  function guard(event: Parameters<NonNullable<ComponentProps<"form">["onSubmit"]>>[0]) {
    if (inFlight.current) {
      event.preventDefault();
      return;
    }
    onSubmit?.(event);
    if (!event.defaultPrevented) inFlight.current = true;
  }

  return (
    <form {...props} onSubmit={guard}>
      <Guard.Provider value={inFlight}>
        {children}
        <ReleaseWhenSettled />
      </Guard.Provider>
    </form>
  );
}

function ReleaseWhenSettled() {
  const inFlight = useContext(Guard);
  const { pending } = useFormStatus();
  useEffect(() => {
    if (!pending && inFlight) inFlight.current = false;
  }, [pending, inFlight]);
  return null;
}

/** A submit button that disables itself and says so while its form is sending. */
export function PendingSubmitButton({
  pendingLabel,
  children,
  disabled,
  ...props
}: Omit<Extract<ButtonProps, { href?: never }>, "type"> & { pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button {...props} type="submit" disabled={disabled || pending} aria-busy={pending}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
