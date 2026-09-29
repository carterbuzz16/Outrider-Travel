"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { adsOptedOut, gpcSignal, setAdsOptOut } from "@/lib/meta-pixel";

/**
 * The privacy policy's opt-out from ad sharing (section "Cookies, the Meta
 * Pixel and your ad choices", anchored #ad-choices, linked from the footer as
 * "Your privacy choices").
 *
 * What it controls is only ever this browser, and the copy says so: the
 * choice lives in localStorage, because there is no account to hang it on for
 * most visitors and a cookie would be one more thing for the policy to list.
 * A Global Privacy Control signal is an opt-out the visitor has already made,
 * so it is reported rather than offered.
 *
 * The state is read after mount: the server cannot know it, and guessing would
 * flash the wrong sentence at someone who has opted out.
 */
type Choice = "loading" | "gpc" | "out" | "in";

export default function AdChoices() {
  const [choice, setChoice] = useState<Choice>("loading");

  useEffect(() => {
    setChoice(gpcSignal() ? "gpc" : adsOptedOut() ? "out" : "in");
  }, []);

  const sentence = {
    loading: "Checking this browser.",
    gpc: "Your browser is sending a Global Privacy Control signal, so you are already opted out: the Meta Pixel does not run for you on this site.",
    out: "You are opted out on this browser. The Meta Pixel does not run here.",
    in: "The Meta Pixel can run on this browser.",
  }[choice];

  return (
    <div className="my-6 flex flex-col gap-4 border border-[--rule] p-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="m-0 font-body text-body-s leading-[1.6] text-[--text]" aria-live="polite">
        {sentence}
      </p>
      {choice === "in" && (
        <Button
          variant="secondary"
          size="sm"
          type="button"
          onClick={() => {
            setAdsOptOut(true);
            setChoice("out");
          }}
        >
          Opt out of ad sharing
        </Button>
      )}
      {choice === "out" && (
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => {
            setAdsOptOut(false);
            setChoice("in");
          }}
        >
          Opt back in
        </Button>
      )}
    </div>
  );
}
