"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Past this many pixels a press is a drag, and letting go does not open the list. */
const DRAG_THRESHOLD = 6;

/** How long a flick keeps gliding, in ms. Higher runs further. */
const GLIDE_DECAY = 320;

/** A pointer that rested this long before letting go was not flicking. */
const FLICK_WINDOW = 80;

/**
 * What lets a reader get hold of the strip (Carter, 3 November 2026: "users can
 * scroll it, or click on it"). Dragging, swiping or a trackpad moves it, and a plain
 * tap opens the full list. Only this wrapper is a client component, so the names stay
 * in server-rendered HTML.
 *
 * It moves the CSS animation's own clock instead of replacing it with scrolling, so
 * the strip keeps running on the compositor, with no seam, and nothing changes until
 * someone touches it. A press freezes it with playbackRate rather than pause(),
 * because a script's pause() would stop the hover rule in globals.css from working.
 *
 * Under reduced motion there is no animation, so all of this stands aside and the
 * strip scrolls natively (.marquee in globals.css). A tap is mouse and touch only:
 * keyboard readers have the real link beside the label.
 */
export default function CampusMarqueeScrub({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  const dragged = useRef(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const el = box.current;
    const track = el?.querySelector<HTMLElement>(".marquee-track");
    if (!el || !track) return;

    const animation = () => track.getAnimations()[0];

    function setRate(rate: number) {
      const running = animation();
      if (running) running.playbackRate = rate;
    }

    /** Moves the strip by this many pixels, wrapping, as the loop has no seam. */
    function nudge(dx: number) {
      const running = animation();
      const duration = Number(running?.effect?.getComputedTiming().duration);
      const loop = track!.scrollWidth / 2;
      if (!running || !duration || !loop) return;
      const next = Number(running.currentTime ?? 0) - (dx / loop) * duration;
      running.currentTime = ((next % duration) + duration) % duration;
    }

    let press: { id: number; startX: number; x: number; t: number; v: number } | null = null;
    let glide = 0;

    function onDown(e: PointerEvent) {
      if (e.button !== 0 || !animation()) return;
      cancelAnimationFrame(glide);
      dragged.current = false;
      press = { id: e.pointerId, startX: e.clientX, x: e.clientX, t: e.timeStamp, v: 0 };
      setRate(0);
    }

    function onMove(e: PointerEvent) {
      if (!press || e.pointerId !== press.id) return;
      if (!dragged.current) {
        if (Math.abs(e.clientX - press.startX) < DRAG_THRESHOLD) return;
        dragged.current = true;
        setDragging(true);
        el!.setPointerCapture(e.pointerId);
      }
      const dx = e.clientX - press.x;
      const dt = e.timeStamp - press.t;
      nudge(dx);
      if (dt > 0) press.v = dx / dt;
      press.x = e.clientX;
      press.t = e.timeStamp;
    }

    function onUp(e: PointerEvent) {
      if (!press || e.pointerId !== press.id) return;
      let v = e.timeStamp - press.t > FLICK_WINDOW ? 0 : press.v;
      const wasDrag = dragged.current;
      press = null;
      setDragging(false);
      if (!wasDrag || v === 0) {
        setRate(1);
        return;
      }
      let last = performance.now();
      const step = (now: number) => {
        const dt = now - last;
        last = now;
        v *= Math.exp(-dt / GLIDE_DECAY);
        if (Math.abs(v) < 0.02) {
          setRate(1);
          return;
        }
        nudge(v * dt);
        glide = requestAnimationFrame(step);
      };
      glide = requestAnimationFrame(step);
    }

    // The browser took a touch for itself, to scroll the page.
    function onCancel(e: PointerEvent) {
      if (!press || e.pointerId !== press.id) return;
      press = null;
      setDragging(false);
      setRate(1);
    }

    // A sideways swipe on a trackpad. An up or down one still scrolls the page.
    function onWheel(e: WheelEvent) {
      if (!animation() || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      nudge(-e.deltaX);
    }

    // Stopped while off screen, so it isn't asking for a frame every 16ms that nobody sees.
    const watch = new IntersectionObserver(([entry]) => el.toggleAttribute("data-away", !entry.isIntersecting));
    watch.observe(el);

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onCancel);
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      cancelAnimationFrame(glide);
      watch.disconnect();
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onCancel);
      el.removeEventListener("wheel", onWheel);
    };
  }, []);

  return (
    <div
      ref={box}
      onClick={() => {
        if (dragged.current) dragged.current = false;
        else router.push(href);
      }}
      className={`${dragging ? "cursor-grabbing" : "cursor-pointer"} select-none motion-safe:touch-pan-y ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
