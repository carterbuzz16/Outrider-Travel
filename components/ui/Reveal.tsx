"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "./cn";

/**
 * Scroll reveal — the only entrance motion in the system.
 *
 * Eight pixels of lift and a fade over 620ms, once, the first time an element
 * crosses into view. It never replays on scroll-back, it never staggers more
 * than a few hundred milliseconds, and `prefers-reduced-motion` collapses it to
 * a plain appearance (handled in the .reveal rule in globals.css).
 *
 * The hidden state lives behind `html.js`, so a reader whose JS is off or whose
 * bundle fails to load gets the content plainly rather than a blank page. The
 * markup is fully server-rendered either way.
 */

type RevealProps = {
  children: React.ReactNode;
  /** Milliseconds. Keep stagger steps to 80–120ms and no more than four deep. */
  delay?: number;
  /** Render as something other than a div — `as="li"` inside a list, etc. */
  as?: React.ElementType;
  className?: string;
};

export default function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
  className,
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // No observer (old browser, jsdom) — show it rather than trap it hidden.
    if (typeof IntersectionObserver === "undefined") {
      setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setRevealed(true);
        observer.disconnect();
      },
      // Fire a little before the element is fully on screen, so the motion has
      // finished by the time the reader's eye actually arrives.
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={cn("reveal", className)}
      data-revealed={revealed ? "true" : "false"}
      style={delay ? ({ "--reveal-delay": `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </Tag>
  );
}
