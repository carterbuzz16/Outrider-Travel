"use client";

import { useEffect, useState } from "react";
import { cn } from "@/components/ui";

/**
 * One tap to copy a value (the referral link, the code, a script), and on a
 * phone that can share, one more to send it straight to a chat. The value is
 * fixed by the server; nothing here reads it back from the page.
 */
export default function CopyValue({
  value,
  label,
  copiedLabel = "Copied",
  share = false,
  className,
}: {
  value: string;
  label: string;
  copiedLabel?: string;
  /** Offer the phone's share sheet too, where there is one. */
  share?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(share && typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, [share]);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2400);
    return () => window.clearTimeout(id);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard access can be refused outright; a prompt can still be copied from by hand.
      window.prompt("Copy this", value);
    }
  }

  async function shareIt() {
    try {
      await navigator.share({ text: value });
    } catch {
      // Dismissing the share sheet rejects; nothing to do.
    }
  }

  const button =
    "inline-flex min-h-11 items-center justify-center border border-[--control-rule] px-4 t-label text-[--text] " +
    "transition-colors duration-fast hover:border-[--accent-solid] hover:bg-[--surface-raised]";

  return (
    <span className={cn("flex flex-wrap gap-2", className)}>
      <button type="button" onClick={copy} className={button}>
        <span aria-live="polite">{copied ? copiedLabel : label}</span>
      </button>
      {canShare && (
        <button type="button" onClick={shareIt} className={button}>
          Share
        </button>
      )}
    </span>
  );
}
