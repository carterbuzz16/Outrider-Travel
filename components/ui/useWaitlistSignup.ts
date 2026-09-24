"use client";

import { useCallback, useState } from "react";
import { track } from "@vercel/analytics";
import { joinWaitlist, type SignupContext } from "@/app/waitlist-actions";
import {
  EMPTY_WAITLIST_INPUT,
  validateWaitlist,
  type WaitlistField,
  type WaitlistFieldErrors,
  type WaitlistInput,
} from "@/lib/waitlist-signup";

/**
 * The waitlist submit path, once.
 *
 * The inline block, the dialog, the page hero and the coming-soon panel all
 * used to carry their own copy of this state machine, and they had already
 * started to drift (one cleared the field on success, one did not). They now
 * differ only in layout, and each passes a `placement` so a signup can be
 * traced to the form it came through. The fields themselves are drawn by
 * WaitlistFields.
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
 *
 * `src` is the team's own short tag (?src=launch on an event QR code), kept
 * apart from utm_source so it can be filtered on by itself.
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
    src: params.get("src") ?? undefined,
    source: params.get("utm_source") ?? params.get("ref") ?? undefined,
    medium: params.get("utm_medium") ?? undefined,
    campaign: params.get("utm_campaign") ?? undefined,
    referrer,
  };
}

export function useWaitlistSignup(placement: string) {
  const [values, setValues] = useState<WaitlistInput>(EMPTY_WAITLIST_INPUT);
  const [fieldErrors, setFieldErrors] = useState<WaitlistFieldErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  // Bumped on every refused submit, so the form can move focus to the first
  // field that needs fixing, even when it is the same field as last time.
  const [attempt, setAttempt] = useState(0);

  const setField = useCallback(<K extends WaitlistField>(key: K, value: WaitlistInput[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    // Changing a field is an answer to its error, so that error steps aside.
    setFieldErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
    setStatus((s) => (s === "error" ? "idle" : s));
  }, []);

  const reset = useCallback(() => {
    setValues(EMPTY_WAITLIST_INPUT);
    setFieldErrors({});
    setStatus("idle");
    setMessage("");
  }, []);

  const submit = useCallback(
    async (event?: React.FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      if (status === "busy") return;

      // The same rules the server applies, answered without a round trip.
      const checked = validateWaitlist(values);
      if (!checked.ok) {
        setFieldErrors(checked.errors);
        setStatus("error");
        setMessage("");
        setAttempt((n) => n + 1);
        return;
      }

      captureFirstTouch();
      setStatus("busy");
      setMessage("");
      setFieldErrors({});
      try {
        const result = await joinWaitlist(values, { placement, ...firstTouch });
        if (result.ok) {
          setValues(EMPTY_WAITLIST_INPUT);
          setStatus("done");
          // Cookieless, like the page views: no identifier and no address,
          // only which form worked and which campaign brought them.
          track("Waitlist signup", {
            placement,
            source: firstTouch?.source ?? null,
            src: firstTouch?.src ?? null,
          });
        } else {
          setStatus("error");
          setFieldErrors(result.fieldErrors ?? {});
          // Field errors speak for themselves next to each field; the summary
          // line is for failures that belong to no one field.
          setMessage(result.fieldErrors ? "" : result.message);
          if (result.fieldErrors) setAttempt((n) => n + 1);
        }
      } catch {
        // The action returns its failures rather than throwing, so reaching
        // here means the request itself never completed.
        setStatus("error");
        setMessage("Something went wrong. Try again.");
      }
    },
    [values, status, placement],
  );

  return { values, setField, fieldErrors, status, message, attempt, submit, reset };
}

export type WaitlistSignup = ReturnType<typeof useWaitlistSignup>;
