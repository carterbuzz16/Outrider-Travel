"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "./cn";

/**
 * The photo gallery.
 *
 * A scroll-snap track: native horizontal scrolling does the work, so touch and
 * trackpad gestures behave exactly as the platform expects and it degrades to a
 * plain scrollable row if script never runs.
 *
 * `autoplay` opts a gallery into advancing on its own. It is off by default,
 * because a gallery that moves while you are reading the caption beside it is
 * worse than one that waits. Where it is on, it stops the moment anyone shows
 * interest: pointer over the track, keyboard focus inside it, the tab hidden,
 * or the gallery scrolled off screen. It never runs under
 * prefers-reduced-motion. The buttons stay either way, since taking away the
 * manual control is what makes an auto-carousel hostile.
 */

export type GalleryImage = { src: string; alt: string };

export default function Gallery({
  images,
  className,
  label = "Photographs",
  autoplay = false,
  interval = 5000,
}: {
  images: GalleryImage[];
  className?: string;
  label?: string;
  /** Advance on its own. Off by default. */
  autoplay?: boolean;
  /** Milliseconds between advances when `autoplay` is on. */
  interval?: number;
}) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(false);

  /**
   * The width of one slide including the gap after it.
   *
   * Measured rather than derived from scrollWidth / count, which was the bug
   * here: the track has a gap between items and none after the last, so
   * scrollWidth is n*item + (n-1)*gap. Dividing that by n gives something wider
   * than a slide, so every jump overshot, the index drifted, and far enough
   * along you landed between two images looking at the gap.
   */
  const slideWidth = useCallback(() => {
    const el = trackRef.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !first) return 0;
    const gap = parseFloat(getComputedStyle(el).columnGap || "0") || 0;
    return first.getBoundingClientRect().width + gap;
  }, []);

  // Which slide is in view, derived from scroll position rather than tracked
  // separately, so a swipe and a button press stay in agreement.
  /**
   * The furthest slide index you can actually scroll to.
   *
   * Not images.length - 1. Two and a half slides are visible at once on a wide
   * screen, so the track runs out of scroll several slides before the last one
   * reaches the left edge. Treating the last index as the end meant the next
   * button dead-ended, and with autoplay wrapping it stalled there permanently,
   * asking for a position the browser could not scroll to.
   */
  const maxIndex = useCallback(() => {
    const el = trackRef.current;
    const slide = slideWidth();
    if (!el || slide <= 0) return 0;
    return Math.max(0, Math.round((el.scrollWidth - el.clientWidth) / slide));
  }, [slideWidth]);

  const onScroll = useCallback(() => {
    const el = trackRef.current;
    const slide = slideWidth();
    if (!el || slide <= 0) return;
    setIndex(Math.min(maxIndex(), Math.round(el.scrollLeft / slide)));
  }, [maxIndex, slideWidth]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  const goTo = useCallback(
    (next: number, wrap = false) => {
      const el = trackRef.current;
      const slide = slideWidth();
      if (!el || slide <= 0) return;
      const last = maxIndex();
      const target = wrap
        ? next > last
          ? 0
          : next < 0
            ? last
            : next
        : Math.max(0, Math.min(last, next));
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollTo({ left: target * slide, behavior: reduced ? "auto" : "smooth" });
    },
    [maxIndex, slideWidth],
  );

  // Only run while the gallery is actually on screen.
  useEffect(() => {
    const el = trackRef.current;
    if (!el || !autoplay) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [autoplay]);

  // A background tab should not be advancing anything.
  useEffect(() => {
    if (!autoplay) return;
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [autoplay]);

  useEffect(() => {
    if (!autoplay || paused || !visible || images.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => goTo(index + 1, true), interval);
    return () => window.clearInterval(id);
  }, [autoplay, paused, visible, index, interval, images.length, goTo]);

  if (images.length === 0) return null;

  const atStart = index <= 0;
  // Compared against the furthest reachable slide, not the last image.
  const atEnd = index >= maxIndex();

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <ul
        ref={trackRef}
        // A labeled, focusable scroll region: keyboard users can reach it and
        // drive it with the arrow keys without needing the buttons.
        tabIndex={0}
        aria-label={label}
        onMouseEnter={autoplay ? () => setPaused(true) : undefined}
        onMouseLeave={autoplay ? () => setPaused(false) : undefined}
        onFocus={autoplay ? () => setPaused(true) : undefined}
        onBlur={autoplay ? () => setPaused(false) : undefined}
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
              // The first three are on screen at once on a wide display. An
              // autoplaying gallery reaches every slide, so it loads them all
              // rather than waiting for a scroll that arrives at the same
              // moment the image is needed.
              loading={autoplay || i < 3 ? "eager" : "lazy"}
            />
          </li>
        ))}
      </ul>

      {/* The count is not on the page any more, but it stays for screen
          readers: driving a gallery with no idea how far through you are is
          worse than the visual clutter was. It only announces when the reader
          moved it themselves. Under autoplay a live region would interrupt
          them every five seconds, so it is silent there and readable on
          demand instead. */}
      <div className="flex items-center justify-end gap-6">
        <p className="sr-only" aria-live={autoplay ? "off" : "polite"}>
          {index + 1} of {images.length}
        </p>

        <div className="flex items-center gap-2">
          <GalleryButton
            label="Previous photograph"
            disabled={!autoplay && atStart}
            onClick={() => goTo(index - 1, autoplay)}
          >
            <Arrow direction="left" />
          </GalleryButton>
          <GalleryButton
            label="Next photograph"
            disabled={!autoplay && atEnd}
            onClick={() => goTo(index + 1, autoplay)}
          >
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
