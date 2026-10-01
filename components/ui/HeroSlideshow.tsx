"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "./cn";

/**
 * Full-resolution photographs that crossfade behind a masthead, each one
 * easing slowly closer while it is on screen.
 *
 * Replaced the cut-together video reel on 1 October 2026. Carter found the
 * reel blurry: a video is encoded at one fixed size (ours was 1280 wide), so
 * a large or high-density screen stretches it. Photographs through next/image
 * are served at the size the screen actually needs, up to 3840 wide, from
 * 3200-wide sources, so every frame is sharp. He asked for "three or four
 * photos that cycle through, the high-quality, good ones".
 *
 * The first slide is the LCP image and is fetched with priority; the rest
 * load behind it. Reduced motion: the first slide only, still. With one
 * slide it simply holds and eases in, which the About page uses.
 */
export type Slide = {
  src: string;
  alt: string;
  /** object-position from md up. */
  position?: string;
  /** object-position on a phone, where the frame is tall and crops the sides. */
  mobilePosition?: string;
};

const HOLD = 6000; // ms each photograph stays
const FADE = 1600; // ms crossfade

export default function HeroSlideshow({ slides, className }: { slides: Slide[]; className?: string }) {
  const [active, setActive] = useState(0);
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setMoving(true);
    if (slides.length < 2) return;
    const t = window.setInterval(() => setActive((i) => (i + 1) % slides.length), HOLD);
    return () => window.clearInterval(t);
  }, [slides.length]);

  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)} aria-hidden={slides.length > 1 ? undefined : true}>
      {slides.map((slide, i) => {
        const on = i === active;
        return (
          <div
            key={slide.src}
            className="absolute inset-0 transition-opacity ease-in-out"
            style={{ opacity: on ? 1 : 0, transitionDuration: `${FADE}ms` }}
          >
            <Image
              src={slide.src}
              alt={i === 0 ? slide.alt : ""}
              fill
              priority={i === 0}
              quality={85}
              sizes="100vw"
              className={cn(
                "object-cover [object-position:var(--pos-m)] md:[object-position:var(--pos)]",
                moving && on && "hero-slide-zoom",
              )}
              style={
                {
                  "--pos": slide.position ?? "50% 50%",
                  "--pos-m": slide.mobilePosition ?? slide.position ?? "50% 50%",
                  animationDuration: `${HOLD + FADE * 2}ms`,
                } as React.CSSProperties
              }
            />
          </div>
        );
      })}
    </div>
  );
}
