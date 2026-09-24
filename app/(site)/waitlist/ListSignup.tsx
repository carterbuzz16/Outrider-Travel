"use client";

import { cn } from "@/components/ui";
import WaitlistFields from "@/components/ui/WaitlistFields";
import WaitlistShare from "@/components/ui/WaitlistShare";
import { useWaitlistSignup } from "@/components/ui/useWaitlistSignup";

/**
 * The big form: the hero's and the close's.
 *
 * This page is the link that gets handed out (the Instagram bio, the event QR
 * code), so on a phone this form is the first thing anyone does here. It sits
 * on a photograph under a Ski Club blue wash, with espresso type, hence the
 * light tone, and takes the
 * large button because on this page it is the whole point.
 */
export default function ListSignup({
  placement,
  className,
}: {
  placement: string;
  className?: string;
}) {
  const signup = useWaitlistSignup(placement);

  if (signup.status === "done") {
    return <WaitlistShare className={cn("motion-safe:animate-rise", className)} />;
  }

  return (
    <WaitlistFields
      signup={signup}
      tone="light"
      size="lg"
      note="Free, no commitment, unsubscribe any time"
      className={cn("w-full max-w-[34rem]", className)}
    />
  );
}
