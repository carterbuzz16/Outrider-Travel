"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "./cn";

/**
 * A headline whose letters grow into place, top down, one after another.
 *
 * Added 1 October 2026 after research into Palm Tree Crew's site, where every
 * display headline arrives this way and it is most of why the site feels
 * alive (Carter: ours "doesn't have any umph"). Each letter scales from 0 to 1
 * vertically from its top edge, 30ms apart, on a slightly springy curve.
 *
 * `onLoad` is for a masthead: it plays once the page is ready, after `delay`.
 * Otherwise it plays the first time the heading scrolls into view, once.
 *
 * Accessibility and failure:
 *   - the whole text is the heading's accessible name; the letter spans are
 *     aria-hidden, so a screen reader reads words, not letters;
 *   - the hidden state sits behind `html.js` like .reveal, so with scripting
 *     off the headline is simply there;
 *   - if the bundle is slow, a CSS failsafe shows the letters after 2.5s
 *     whatever happens (.split in globals.css);
 *   - reduced motion: no movement at all.
 * Words never break inside themselves: each word is one inline-block.
 */
export default function SplitHeading({
  as: Tag = "h2",
  text,
  id,
  className,
  onLoad = false,
  delay = 0,
}: {
  as?: "h1" | "h2" | "h3" | "p";
  text: string;
  id?: string;
  className?: string;
  /** Play on page load (mastheads) instead of on scroll. */
  onLoad?: boolean;
  /** Milliseconds before the first letter moves. */
  delay?: number;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    if (onLoad) {
      const t = window.setTimeout(() => setShown(true), 60);
      return () => window.clearTimeout(t);
    }
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShown(true);
        io.disconnect();
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [onLoad]);

  let n = 0;
  const words = text.split(" ");

  return (
    <Tag ref={ref} id={id} aria-label={text} className={cn("split", className)} data-in={shown ? "true" : "false"}>
      {words.map((word, w) => (
        <span key={`${word}-${w}`} aria-hidden="true">
          <span className="inline-block whitespace-nowrap">
            {[...word].map((ch, c) => (
              <span
                key={c}
                className="split-ch"
                style={{ transitionDelay: `${delay + n++ * 30}ms` }}
              >
                {ch}
              </span>
            ))}
          </span>
          {w < words.length - 1 ? " " : null}
        </span>
      ))}
    </Tag>
  );
}
