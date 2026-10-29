"use client";

import { useState } from "react";

/**
 * One story graphic, and the way a phone wants to keep it: the share sheet
 * with the image itself, which offers Save Image (to Photos) and Instagram
 * straight from it. A download would land in Files on an iPhone, where nobody
 * posts from. Where a browser cannot share files, the image opens in a new tab
 * to press and hold, or save on a laptop.
 *
 * `href` is the portal's own toolkit route, which checks the session and
 * redirects to a 60-second signed URL (toolkit/[...path]/route.ts).
 */
export default function ToolkitImage({ href, label, fileName }: { href: string; label: string; fileName: string }) {
  const [busy, setBusy] = useState(false);

  async function saveOrShare() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(href, { credentials: "same-origin" });
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const file = new File([blob], fileName, { type: blob.type || "image/png" });
      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }
      throw new Error("cannot share files");
    } catch (err) {
      // A dismissed share sheet is not a failure; anything else opens the image.
      if (!(err instanceof DOMException && err.name === "AbortError")) window.open(`${href}?download=1`, "_blank", "noopener");
    } finally {
      setBusy(false);
    }
  }

  return (
    <figure className="flex flex-col gap-2">
      {/* A plain img: the source is a redirect to a 60-second signed URL,
          which next/image's optimizer cannot follow with this visitor's
          session. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={href} alt={label} loading="lazy" className="aspect-[9/16] w-full bg-[--surface-inset] object-cover" />
      <button
        type="button"
        onClick={saveOrShare}
        aria-label={`Save or share ${label}`}
        className="t-label inline-flex min-h-11 items-center justify-center border border-[--control-rule] text-[--text] transition-transform duration-fast active:scale-[0.98] disabled:opacity-60"
        disabled={busy}
      >
        {busy ? "Opening" : "Save or share"}
      </button>
    </figure>
  );
}
