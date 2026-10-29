"use client";

import { useEffect, useState } from "react";
import { cn } from "@/components/ui";

/**
 * One tap to send a value (the referral link, the code, a script) where it
 * needs to go. On a phone that can share (nearly all of them), `shareFirst`
 * makes the share sheet the main button, straight into Messages, Instagram or
 * GroupMe, with Copy beside it; anywhere else it is a Copy button. The value
 * is fixed by the server; nothing here reads it back from the page.
 */
export default function CopyValue({
  value,
  label,
  copiedLabel = "Copied",
  share = false,
  shareFirst = false,
  shareLabel = "Share",
  asUrl = false,
  primary = false,
  block = false,
  className,
}: {
  value: string;
  /** The copy button's label, e.g. "Copy link". */
  label: string;
  copiedLabel?: string;
  /** Offer the phone's share sheet too, where there is one. */
  share?: boolean;
  /** Where the phone can share, make sharing the main button and Copy the second. */
  shareFirst?: boolean;
  shareLabel?: string;
  /** Share it as a link (a preview card in Messages), not as text. */
  asUrl?: boolean;
  /** The filled button: the one thing to tap on the screen. */
  primary?: boolean;
  /** Full width, the buttons splitting the row. */
  block?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare((share || shareFirst) && typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, [share, shareFirst]);

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
      await navigator.share(asUrl ? { url: value } : { text: value });
    } catch {
      // Dismissing the share sheet rejects; nothing to do.
    }
  }

  const base =
    "inline-flex min-h-12 items-center justify-center px-5 t-label transition-[color,background-color,border-color,transform] duration-fast active:scale-[0.98]";
  const filled = "bg-[--accent-solid] text-[--accent-contrast] hover:bg-[--accent-solid-hover]";
  const outlined = "border border-[--control-rule] text-[--text] hover:border-[--accent-solid]";
  const leadWithShare = shareFirst && canShare;

  const copyButton = (
    <button
      type="button"
      onClick={copy}
      className={cn(base, primary && !leadWithShare ? filled : outlined)}
    >
      <span aria-live="polite">{copied ? copiedLabel : leadWithShare ? "Copy" : label}</span>
    </button>
  );
  const shareButton = canShare && (
    <button type="button" onClick={shareIt} className={cn(base, primary && leadWithShare ? filled : outlined)}>
      {leadWithShare ? shareLabel : "Share"}
    </button>
  );

  return (
    <span
      className={cn(
        block ? (leadWithShare ? "grid grid-cols-[1fr_auto] gap-2" : "grid auto-cols-fr grid-flow-col gap-2") : "flex flex-wrap gap-2",
        className,
      )}
    >
      {leadWithShare ? (
        <>
          {shareButton}
          {copyButton}
        </>
      ) : (
        <>
          {copyButton}
          {shareButton}
        </>
      )}
    </span>
  );
}
