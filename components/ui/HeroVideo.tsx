"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The hero's background video.
 *
 * Deliberately no `autoPlay` attribute. The element ships paused showing its
 * poster, and script decides whether to start it, so someone who has asked for
 * reduced motion never sees a frame of movement rather than seeing it start and
 * then stop. If scripting fails the poster simply stays, which is a reasonable
 * hero on its own.
 *
 * Always muted and inline: a hero that makes noise is never acceptable, and on
 * iOS an unmuted or non-inline video refuses to autoplay at all and takes over
 * the screen instead.
 */
export default function HeroVideo({
  src,
  poster,
}: {
  src: string;
  poster: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      setReduced(mq.matches);
      const el = ref.current;
      if (!el) return;
      if (mq.matches) {
        el.pause();
        el.currentTime = 0;
      } else {
        // Autoplay can still be refused (low power mode, data saver). The
        // rejection is caught so it fails to a static poster, not an error.
        void el.play().catch(() => {});
      }
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return (
    <video
      ref={ref}
      className="h-full w-full object-cover"
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="metadata"
      // Decorative: the headline carries the meaning.
      aria-hidden="true"
      tabIndex={-1}
      data-reduced={reduced ? "true" : undefined}
    />
  );
}
