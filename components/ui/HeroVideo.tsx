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
 *
 * Phones get the poster and no video at all, unless the caller passes
 * `mobileSrc`. The main file is 2.3MB of 2560x1440 decoration, and
 * `preload="metadata"` is defeated the moment play() is called. /telluride, the
 * page the Instagram ads land on, passes hero-phone.mp4: a 1080x1440 portrait cut
 * of the same clip at about 2MB (1 October 2026, when Carter asked for the
 * site to move the way Palm Tree Crew's does). The poster still paints first.
 */
const MOBILE = "(max-width: 767px)";
export default function HeroVideo({
  src,
  poster,
  mobileSrc,
}: {
  src: string;
  poster: string;
  /** A small portrait cut for phones. Without it, phones get the poster. */
  mobileSrc?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [reduced, setReduced] = useState(false);
  // Starts true so the first client render matches the server, which cannot
  // know the viewport. The effect corrects it before anything is fetched,
  // because the <video> is only mounted once this is false.
  const [small, setSmall] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE);
    const apply = () => setSmall(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const playing = small ? mobileSrc : src;

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

  if (!playing) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- a full-bleed
      // background frame, already the correct size, and next/image adds nothing
      // it does not already have.
      <img
        src={poster}
        alt=""
        aria-hidden="true"
        className="h-full w-full object-cover"
      />
    );
  }

  return (
    <video
      key={playing}
      ref={ref}
      className="h-full w-full object-cover"
      src={playing}
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
