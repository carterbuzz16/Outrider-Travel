"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The hero's background video.
 *
 * Deliberately no `autoPlay` attribute. Script decides whether to start it, so
 * someone who has asked for reduced motion never sees a frame of movement rather
 * than seeing it start and then stop. If scripting fails the poster simply stays,
 * which is a reasonable hero on its own.
 *
 * The poster is a real image underneath, and the video stays invisible until it
 * is actually playing, so a refused autoplay or a slow connection never shows
 * anything but the picture. `mobilePoster` gives phones one in their own shape
 * rather than the wide one, and the browser chooses before any script runs.
 *
 * Always muted and inline: a hero that makes noise is never acceptable, and on
 * iOS an unmuted or non-inline video refuses to autoplay at all and takes over
 * the screen instead.
 *
 * Phones get the poster and no video at all, unless the caller passes
 * `mobileSrc`. The main file is 2.3MB of 2560x1440 decoration, and
 * `preload="metadata"` is defeated the moment play() is called. /telluride, the
 * page the Instagram ads land on, passes hero-phone.mp4: a 1080x1440 portrait cut
 * of the same clip at about 2MB (1 October 2026, when Carter asked for the
 * site to move the way Palm Tree Crew's does).
 */
const MOBILE = "(max-width: 767px)";
export default function HeroVideo({
  src,
  poster,
  mobileSrc,
  mobilePoster,
}: {
  src: string;
  poster: string;
  /** A small portrait cut for phones. Without it, phones get the poster. */
  mobileSrc?: string;
  /** The poster in that shape. */
  mobilePoster?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [reduced, setReduced] = useState(false);
  const [rolling, setRolling] = useState(false);
  // Unknown until the first effect, because the server cannot see the viewport, and
  // nothing is mounted until it is known. Mounting on a guess had a desktop start
  // downloading the phone's clip as well as its own (1.5MB on /spring-break, measured
  // 5 November 2026).
  const [small, setSmall] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE);
    const apply = () => setSmall(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const playing = small === null ? undefined : small ? mobileSrc : src;

  useEffect(() => {
    if (!playing) return;
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

    // Chrome pauses a muted video that play() started once it scrolls off
    // screen, and does not start it again on the way back, so a reader who
    // scrolled down and returned found the masthead frozen (seen on /about,
    // 1 October 2026). Play whenever it is in view, pause when it is not.
    const el = ref.current;
    const io =
      el && typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(([entry]) => {
            if (mq.matches) return;
            if (entry.isIntersecting) void el.play().catch(() => {});
            else el.pause();
          })
        : null;
    if (el && io) io.observe(el);

    return () => {
      mq.removeEventListener("change", apply);
      io?.disconnect();
    };
  }, [playing]);

  return (
    <div className="relative h-full w-full">
      {poster && (
        <picture>
          {mobilePoster && <source media={MOBILE} srcSet={mobilePoster} />}
          {/* eslint-disable-next-line @next/next/no-img-element -- a full-bleed
              background frame, already the correct size, and next/image adds nothing
              it does not already have. */}
          <img
            src={poster}
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </picture>
      )}
      {playing && (
        <video
          key={playing}
          ref={ref}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[300ms] ${rolling ? "" : "opacity-0"}`}
          src={playing}
          muted
          loop
          playsInline
          preload="metadata"
          onPlaying={() => setRolling(true)}
          // Decorative: the headline carries the meaning.
          aria-hidden="true"
          tabIndex={-1}
          data-reduced={reduced ? "true" : undefined}
        />
      )}
    </div>
  );
}
