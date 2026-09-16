"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Text that settles like an airport departure board.
 *
 * Each character cycles through the alphabet and locks into place from left to
 * right, once, the first time the line scrolls into view. The server renders
 * the final text, so search engines, screen readers and anyone without
 * JavaScript get the words and never the animation, and reduced motion skips
 * straight to the end.
 */

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const FRAME_MS = 45;
/** Frames the first character spins for; each later one spins a little longer. */
const BASE_FRAMES = 6;
const STEP_FRAMES = 1.5;

export default function SplitFlap({
  text,
  className,
  delay = 0,
}: {
  text: string;
  className?: string;
  /** Milliseconds before the board starts turning, for staggering rows. */
  delay?: number;
}) {
  const target = text.toUpperCase();
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(target);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let timer: number | undefined;
    let start: number | undefined;

    const tick = () => {
      frame += 1;
      let settled = true;
      const next = Array.from(target, (char, i) => {
        // Spaces and punctuation are the board's fixed separators.
        if (!/[A-Z0-9]/.test(char)) return char;
        if (frame >= BASE_FRAMES + i * STEP_FRAMES) return char;
        settled = false;
        return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }).join("");
      setShown(next);
      if (!settled) timer = window.setTimeout(tick, FRAME_MS);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        start = window.setTimeout(tick, delay);
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(node);

    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
      window.clearTimeout(start);
    };
  }, [target, delay]);

  return (
    <span ref={ref} className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {Array.from(shown, (char, i) => (
          <span key={i} className="flap">
            {char === " " ? " " : char}
          </span>
        ))}
      </span>
    </span>
  );
}
