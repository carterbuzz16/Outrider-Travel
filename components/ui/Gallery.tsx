"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "./cn";

/**
 * The trip gallery.
 *
 * A scroll-snap track rather than a timed carousel. Nothing advances on its
 * own: an auto-rotating gallery moves the thing you are looking at out from
 * under you, and there is no good answer for someone who reads slowly. The
 * reader drives it, by swipe, by arrow key, or by the buttons.
 *
 * Native horizontal scrolling does the work, so touch and trackpad gestures
 * behave exactly as the platform expects and it degrades to a plain scrollable
 * row if script never runs.
 */

export type GalleryImage = { src: string; alt: string };

export default function Gallery({
  images,
  className,
}: {
  images: GalleryImage[];
  className?: string;
}) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);

  // Which slide is in view, derived from scroll position rather than tracked
  // separately, so a swipe and a button press stay in agreement.
  const onScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const slide = el.scrollWidth / Math.max(1, images.length);
    setIndex(Math.round(el.scrollLeft / slide));
  }, [images.length]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  const goTo = useCallback(
    (next: number) => {
      const el = trackRef.current;
      if (!el) return;
      const clamped = Math.max(0, Math.min(images.length - 1, next));
      const slide = el.scrollWidth / Math.max(1, images.length);
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollTo({ left: clamped * slide, behavior: reduced ? "auto" : "smooth" });
    },
    [images.length],
  );

  if (images.length === 0) return null;

  const atStart = index <= 0;
  const atEnd = index >= images.length - 1;

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <ul
        ref={trackRef}
        // A labeled, focusable scroll region: keyboard users can reach it and
        // drive it with the arrow keys without needing the buttons.
        tabIndex={0}
        aria-label="Trip photographs"
        className={cn(
          "m-0 flex snap-x snap-mandatory list-none gap-4 overflow-x-auto p-0",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        )}
      >
        {images.map((image, i) => (
          <li
            key={image.src}
            className="relative aspect-[3/2] w-[86%] shrink-0 snap-start overflow-hidden sm:w-[60%] lg:w-[46%]"
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              sizes="(min-width: 1024px) 46vw, (min-width: 640px) 60vw, 86vw"
              className="object-cover"
              // The first two are likely on screen at once on a wide display.
              loading={i < 2 ? "eager" : "lazy"}
            />
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between gap-6">
        <p className="t-micro text-[--text-muted]" aria-live="polite">
          {index + 1} of {images.length}
        </p>

        <div className="flex items-center gap-2">
          <GalleryButton label="Previous photograph" disabled={atStart} onClick={() => goTo(index - 1)}>
            <Arrow direction="left" />
          </GalleryButton>
          <GalleryButton label="Next photograph" disabled={atEnd} onClick={() => goTo(index + 1)}>
            <Arrow direction="right" />
          </GalleryButton>
        </div>
      </div>
    </div>
  );
}

function GalleryButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid h-11 w-11 place-items-center border border-[--rule-strong] text-[--text]",
        "transition-colors duration-fast",
        "hover:enabled:bg-[--text] hover:enabled:text-[--surface]",
        "disabled:border-[--rule] disabled:text-[--text-muted]",
      )}
    >
      {children}
    </button>
  );
}

function Arrow({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      width="15"
      height="10"
      viewBox="0 0 15 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      aria-hidden="true"
      className={direction === "left" ? "rotate-180" : undefined}
    >
      <path d="M0 5h13.5M9.5 1l4 4-4 4" />
    </svg>
  );
}
