"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { cn } from "./cn";

/**
 * A full-bleed moving photograph partway down a page, with words set on it.
 *
 * Added 1 October 2026, when Carter asked for the site to have the movement
 * and presence of Palm Tree Crew's. The same day he found the clips blurry
 * (a 1600-wide video stretched across a large screen), so the bands now run
 * as still photographs from full-resolution sources, easing slowly closer;
 * the video path stays for a future clip shot at full size. The clips are slow push-ins made from his
 * own photographs (a seamless in-and-out loop, no cuts, no sound), so a band
 * reads as the place breathing rather than as a video player.
 *
 * Unlike the masthead it is below the fold, so nothing is fetched until the
 * band is close to the screen, and the clip pauses again when it scrolls away.
 * The poster paints first and stays for anyone who has asked for reduced
 * motion, and for a browser that refuses to autoplay. Phones get their own
 * portrait cut, a third of the weight.
 *
 * The headline goes at the top, over the night sky in the town clip, and the
 * clip is pinned to its top edge so the sky is never what gets cropped. The
 * sky is only the top third of the photograph, so a fade in its own deep blue
 * runs down behind the words and clears before the lights of the town, rather
 * than a scrim over the whole frame. Smaller text belongs under the band, on
 * a solid ground.
 */
const MOBILE = "(max-width: 767px)";

export default function VideoBand({
  src,
  poster,
  mobileSrc,
  mobilePoster,
  position,
  alt,
  children,
  className,
}: {
  /** Omit both clips for a still band: the poster alone, sharp at any size,
   *  easing slowly closer while on screen. */
  src?: string;
  poster: string;
  mobileSrc?: string;
  mobilePoster?: string;
  /** object-position for the photograph. */
  position?: string;
  /** What the clip shows. Read once, as the poster's alt text. */
  alt: string;
  children: React.ReactNode;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  const [small, setSmall] = useState(false);
  const [reduced, setReduced] = useState(true);

  useEffect(() => {
    const mobile = window.matchMedia(MOBILE);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      setSmall(mobile.matches);
      setReduced(motion.matches);
    };
    apply();
    mobile.addEventListener("change", apply);
    motion.addEventListener("change", apply);
    return () => {
      mobile.removeEventListener("change", apply);
      motion.removeEventListener("change", apply);
    };
  }, []);

  // Mount the clip once the band is within a screen of the viewport.
  useEffect(() => {
    const el = box.current;
    if (!el || near) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setNear(true);
      },
      { rootMargin: "100% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near]);

  // Play while on screen, pause when not.
  useEffect(() => {
    const el = box.current;
    const v = video.current;
    if (!el || !v) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void v.play().catch(() => {});
      else v.pause();
    });
    io.observe(el);
    return () => io.disconnect();
  }, [near, small, reduced]);

  const showVideo = near && !reduced && Boolean(src);

  return (
    <div
      ref={box}
      className={cn(
        "scheme-espresso relative isolate flex min-h-[72svh] flex-col overflow-hidden bg-[--color-espresso-deep] md:min-h-[86svh]",
        className,
      )}
    >
      <div className="absolute inset-0 -z-10">
        <Image
          src={small && mobilePoster ? mobilePoster : poster}
          alt={alt}
          fill
          sizes="100vw"
          quality={src ? 75 : 85}
          className={src ? "object-cover object-top" : `object-cover ${near && !reduced ? "hero-slide-zoom" : ""}`}
          style={src ? undefined : { objectPosition: position ?? "50% 50%", animationDuration: "14000ms" }}
        />
        {showVideo && (
          <video
            key={small && mobileSrc ? mobileSrc : src}
            ref={video}
            className="absolute inset-0 h-full w-full object-cover object-top"
            src={small && mobileSrc ? mobileSrc : src}
            poster={small && mobilePoster ? mobilePoster : poster}
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden="true"
            tabIndex={-1}
          />
        )}
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[88%] bg-gradient-to-b from-[rgb(12_18_34_/_0.86)] via-[rgb(12_18_34_/_0.62)] to-transparent"
      />
      {children}
    </div>
  );
}
