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
 * Further than two screens away the clip is let go altogether (5 November 2026, when
 * Carter found /spring-break laggy): a page of these must not keep a decoder and
 * its frames alive for every band it has passed, which is what a phone runs out of.
 * The gap between one screen and two is there so a reader scrolling back a little
 * finds the clip still in hand, rather than fetching it again.
 *
 * The poster is the photograph behind the video, and the video stays invisible
 * until it is really playing. It has no poster of its own, because that fetched
 * each one twice, the original beside the sized one. The picture stays for anyone
 * who has asked for reduced motion, and for a browser that refuses to autoplay.
 * Phones get their own portrait cut, a third of the weight.
 *
 * The headline goes at the top, over the night sky in the town clip, and the
 * clip is pinned to its top edge so the sky is never what gets cropped. The
 * sky is only the top third of the photograph, so a fade in its own deep blue
 * runs down behind the words and clears before the lights of the town, rather
 * than a scrim over the whole frame. Smaller text belongs under the band, on
 * a solid ground.
 *
 * `fade="foot"` is for a clip with no sky to write on (spring break's, 5 November
 * 2026): the words sit at the bottom, on a fade in the page's own espresso.
 */
const MOBILE = "(max-width: 767px)";

export default function VideoBand({
  src,
  poster,
  mobileSrc,
  mobilePoster,
  position,
  alt,
  fade = "top",
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
  fade?: "top" | "foot";
  children: React.ReactNode;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  const [small, setSmall] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [rolling, setRolling] = useState(false);

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

  // Mount the clip when the band comes within a screen of the viewport, and let it go
  // past two.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const coming = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setNear(true);
      },
      { rootMargin: "100% 0px" },
    );
    const going = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) setNear(false);
      },
      { rootMargin: "200% 0px" },
    );
    coming.observe(el);
    going.observe(el);
    return () => {
      coming.disconnect();
      going.disconnect();
    };
  }, []);

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

  // A clip mounted again has to prove itself again.
  useEffect(() => {
    if (!showVideo) setRolling(false);
  }, [showVideo]);

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
            className={cn(
              "absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-[300ms]",
              !rolling && "opacity-0",
            )}
            style={position ? { objectPosition: position } : undefined}
            src={small && mobileSrc ? mobileSrc : src}
            onPlaying={() => setRolling(true)}
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
        className={
          fade === "foot"
            ? "pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[26rem] bg-gradient-to-t from-[rgb(31_26_23_/_0.9)] via-[rgb(31_26_23_/_0.74)] via-50% to-transparent md:h-[62%]"
            : "pointer-events-none absolute inset-x-0 top-0 -z-10 h-[88%] bg-gradient-to-b from-[rgb(12_18_34_/_0.86)] via-[rgb(12_18_34_/_0.62)] to-transparent"
        }
      />
      {children}
    </div>
  );
}
