"use client";

import { useEffect, useState } from "react";

/**
 * The team's latest note at the top of Home, dismissible so it stops taking
 * the first screen once read. Dismissing is remembered in this browser for
 * this note only (keyed on when it was posted): the next one shows again.
 * Storage can be refused (private browsing); then it simply shows each time.
 */
const KEY = "outrider-ambassador-announcement-read";

export default function AnnouncementBar({ id, body }: { id: string; body: string }) {
  const [read, setRead] = useState(false);

  useEffect(() => {
    try {
      setRead(window.localStorage.getItem(KEY) === id);
    } catch {
      // No storage: keep showing it.
    }
  }, [id]);

  if (read) return null;

  function dismiss() {
    setRead(true);
    try {
      window.localStorage.setItem(KEY, id);
    } catch {
      // No storage: it shows again next visit, which is fine.
    }
  }

  return (
    <section aria-label="Announcement" className="scheme-stone scheme-paint">
      <div className="shell-narrow flex items-start justify-between gap-4 py-4">
        <div className="min-w-0">
          <p className="t-micro text-[--text-secondary]">From Outrider</p>
          {/* Plain text from the database, rendered as text: React escapes it. */}
          <p className="mt-1.5 whitespace-pre-line font-body text-body-s text-[--text]">{body}</p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="t-micro -mr-2 -mt-1 inline-flex min-h-11 shrink-0 items-center px-2 text-[--text-secondary] transition-transform duration-fast hover:text-[--text] active:scale-[0.97]"
        >
          Got it
        </button>
      </div>
    </section>
  );
}
