"use client";

import { useEffect, useState } from "react";
import { cn } from "@/components/ui";

/**
 * Copies a link on this site to the clipboard. Takes a path, not a URL, so
 * the server never has to know which domain the page is being read on
 * (preview, production, localhost); the origin is added at click time.
 */
export default function CopyLinkButton({
  path,
  label = "Copy invite link",
  className,
}: {
  path: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2400);
    return () => window.clearTimeout(id);
  }, [copied]);

  async function copy() {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Clipboard access can be refused outright; a prompt can still be copied from by hand.
      window.prompt("Copy this link", url);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "inline-flex min-h-11 items-center border border-[--rule-strong] px-4 font-body text-body-s text-[--text]",
        "transition-colors duration-fast hover:border-[--accent-solid]",
        className,
      )}
    >
      <span aria-live="polite">{copied ? "Link copied" : label}</span>
    </button>
  );
}
