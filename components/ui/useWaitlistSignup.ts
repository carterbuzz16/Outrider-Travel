"use client";

import { useCallback, useState } from "react";
import { track } from "@vercel/analytics";
import { joinWaitlist, type SignupContext } from "@/app/waitlist-actions";

/**
 * The waitlist submit path, once.
 *
 * The inline block, the dialog, the page hero and the footer all used to carry
 * their own copy of this state machine, and they had already started to drift
 * (one cleared the field on success, one did not). They now differ only in
 * layout, and each passes a `placement` so a signup can be traced to the form
 * it came through.
 */

type Status = "idle" | "busy" | "done" | "error";

/*
 * First-touch campaign tags, held in memory for the life of the tab.
 *
 * Someone arriving on /?utm_source=instagram usually reads a page or two before
 * joining, and client-side navigation drops the query string on the first
 * click. Capturing it once, the first time any page reads it, keeps it across
 * those navigations. Deliberately not written to a cookie or to storage: the
 * site sets no tracking storage, and the privacy position depends on that.
 */
let firstTouch: Omit<SignupContext, "placement"> | null = null;

export function captureFirstTouch() {
  if (firstTouch || typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  let referrer: string | undefined;
  try {
    const host = document.referrer ? new URL(document.referrer).hostname : "";
    // Our own host is not a referrer, it is a reload.
    if (host && host !== window.location.hostname) referrer = host;
  } catch {
    referrer = undefined;
  }
  firstTouch = {
    source: params.get("utm_source") ?? params.get("ref") ?? undefined,
    medium: params.get("utm_medium") ?? undefined,
    campaign: params.get("utm_campaign") ?? undefined,
    referrer,
  };
}

export function useWaitlistSignup(placement: string) {
  const [email, setEmailState] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const setEmail = useCallback((value: string) => {
    setEmailState(value);
    // Typing again is an answer to the error, so the error steps aside.
    setStatus((s) => (s === "error" ? "idle" : s));
  }, []);

  const reset = useCallback(() => {
    setEmailState("");
    setStatus("idle");
    setMessage("");
  }, []);

  const submit = useCallback(
    async (event?: React.FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      const value = email.trim();
      if (!value || status === "busy") return;

      captureFirstTouch();
      setStatus("busy");
      setMessage("");
      try {
        const result = await joinWaitlist(value, { placement, ...firstTouch });
        if (result.ok) {
          setEmailState("");
          setStatus("done");
          // Cookieless, like the page views: no identifier and no address,
          // only which form worked and which campaign brought them.
          track("Waitlist signup", {
            placement,
            source: firstTouch?.source ?? null,
          });
        } else {
          setStatus("error");
          setMessage(result.message);
        }
      } catch {
        // The action returns its failures rather than throwing, so reaching
        // here means the request itself never completed.
        setStatus("error");
        setMessage("Something went wrong. Try again.");
      }
    },
    [email, status, placement],
  );

  return { email, setEmail, status, message, submit, reset };
}
