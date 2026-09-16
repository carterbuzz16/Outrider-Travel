"use client";

import { useEffect, useRef, useState } from "react";
import { OutriderMark } from "@/components/ui";

/**
 * The next departure, set as a boarding pass, with a live count to it.
 *
 * Everything printed on it is real: the trip, the dates and the night count
 * all come from the published trip, and nothing is invented to fill the
 * layout (no seat, no gate, no flight number). The count runs to the start date at local
 * midnight in Mountain time, because that is the clock the trip runs on.
 *
 * On a pointer that can hover, the pass tilts a few degrees toward the cursor
 * and a sheen follows it. It is the one piece of the page that answers the
 * visitor's hand, so it is kept small: five degrees, eased, and nothing at all
 * under reduced motion or on touch.
 */

type Remaining = { days: number; hours: number; minutes: number; seconds: number };

function remainingUntil(target: number, now: number): Remaining {
  const total = Math.max(0, Math.floor((target - now) / 1000));
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3_600),
    minutes: Math.floor((total % 3_600) / 60),
    seconds: total % 60,
  };
}

/** Deterministic bars from the trip id, so the barcode is stable per trip. */
function barcode(seed: string): number[] {
  let h = 2166136261;
  const bars: number[] = [];
  for (let i = 0; i < 46; i += 1) {
    h ^= seed.charCodeAt(i % seed.length) + i;
    h = Math.imul(h, 16777619);
    bars.push(1 + (Math.abs(h) % 3));
  }
  return bars;
}

export default function BoardingPass({
  tripId,
  name,
  destination,
  startDate,
  dates,
  nights,
}: {
  tripId: string;
  name: string;
  destination: string;
  /** YYYY-MM-DD */
  startDate: string;
  dates: string;
  nights: number;
}) {
  // Mountain Standard Time: every departure here is in winter, when Colorado
  // is on UTC-7. If a summer trip is ever listed this wants the real zone.
  const target = Date.parse(`${startDate}T00:00:00-07:00`);
  const [left, setLeft] = useState<Remaining | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const tearRef = useRef<HTMLHRElement>(null);
  const [notchY, setNotchY] = useState<number | null>(null);

  // The punched notches belong on the tear line, and where that falls depends
  // on how the trip name wraps. Measured rather than guessed.
  useEffect(() => {
    const tear = tearRef.current;
    if (!tear || typeof ResizeObserver === "undefined") return;
    const measure = () => setNotchY(tear.offsetTop);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(tear.parentElement ?? tear);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const update = () => setLeft(remainingUntil(target, Date.now()));
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [target]);

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const card = cardRef.current;
    if (!card || event.pointerType !== "mouse") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    card.style.setProperty("--tilt-x", `${(0.5 - y) * 6}deg`);
    card.style.setProperty("--tilt-y", `${(x - 0.5) * 8}deg`);
    card.style.setProperty("--sheen-x", `${x * 100}%`);
    card.style.setProperty("--sheen-y", `${y * 100}%`);
    card.style.setProperty("--sheen-o", "1");
  }

  function onPointerLeave() {
    const card = cardRef.current;
    if (!card) return;
    card.style.setProperty("--tilt-x", "0deg");
    card.style.setProperty("--tilt-y", "0deg");
    card.style.setProperty("--sheen-o", "0");
  }

  const pad = (n: number, width = 2) => String(n).padStart(width, "0");
  const units = [
    { label: "Days", value: left ? pad(left.days, 3) : "000" },
    { label: "Hrs", value: left ? pad(left.hours) : "00" },
    { label: "Min", value: left ? pad(left.minutes) : "00" },
    { label: "Sec", value: left ? pad(left.seconds) : "00" },
  ];

  return (
    <div className="[perspective:1400px]" onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
      <div
        ref={cardRef}
        className={[
          "scheme-light relative text-[--text]",
          "transition-transform duration-slow ease-out will-change-transform",
          "[transform:rotateX(var(--tilt-x,0deg))_rotateY(var(--tilt-y,0deg))]",
          // drop-shadow rather than box-shadow: it follows the punched notches in
          // the stub instead of drawing a rectangle behind them.
          "[filter:drop-shadow(0_30px_40px_rgb(0_0_0_/_0.45))]",
        ].join(" ")}
      >
        <div
          className="stub bg-[--surface] !border-0"
          style={notchY === null ? undefined : ({ "--notch-y": `${notchY}px` } as React.CSSProperties)}
        >
          {/* ---- the pass ------------------------------------------------ */}
          <div className="p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <OutriderMark className="h-auto w-6 text-[--text]" />
                <span className="t-micro text-[--text]">Outrider</span>
              </div>
              <span className="t-micro text-[--text-muted]">Early access</span>
            </div>

            <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-end gap-4">
              <div>
                <p className="t-micro text-[--text-muted]">From</p>
                <p className="mt-2 font-display text-display-s uppercase leading-none tracking-title">
                  Home
                </p>
              </div>
              <svg viewBox="0 0 40 12" className="mb-1 w-10 text-[--accent]" aria-hidden="true">
                <path d="M0 6h37M32 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1" />
              </svg>
              <div className="text-right">
                <p className="t-micro text-[--text-muted]">To</p>
                <p className="mt-2 font-display text-display-s uppercase leading-none tracking-title">
                  {destination.split(",")[0]}
                </p>
              </div>
            </div>

            <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-[--rule] pt-5">
              <div>
                <dt className="t-micro text-[--text-muted]">Trip</dt>
                <dd className="mt-2 font-body text-body-s leading-snug">{name}</dd>
              </div>
              <div>
                <dt className="t-micro text-[--text-muted]">Dates</dt>
                <dd className="mt-2 font-body text-body-s leading-snug">{dates}</dd>
              </div>
              <div>
                <dt className="t-micro text-[--text-muted]">Nights</dt>
                <dd className="mt-2 font-body text-body-s leading-snug">{nights}</dd>
              </div>
            </dl>
          </div>

          <hr ref={tearRef} className="perforation mx-6" />

          {/* ---- the counterfoil -------------------------------------------- */}
          <div className="p-6 sm:p-8">
            <p className="t-micro text-[--text-muted]">Until departure</p>
            <div
              className="mt-3 flex items-end gap-3 sm:gap-5"
              // Announcing a clock every second would be unbearable; the
              // accessible version is the date, which is printed above.
              aria-hidden="true"
            >
              {units.map((unit, i) => (
                <div key={unit.label} className="flex items-end gap-3 sm:gap-5">
                  {i > 0 && <span className="pb-6 font-display text-display-s text-[--text-muted]">:</span>}
                  <div>
                    <p className="font-display text-display-m leading-none tabular-nums tracking-title">
                      {unit.value}
                    </p>
                    <p className="t-micro mt-2 text-[--text-muted]">{unit.label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-7 flex items-end justify-between gap-6">
              <div className="flex h-9 min-w-0 items-stretch gap-[2px] overflow-hidden text-[--text]" aria-hidden="true">
                {barcode(tripId).map((w, i) => (
                  <span key={i} className="shrink-0 bg-current" style={{ width: w, opacity: i % 7 === 3 ? 0 : 1 }} />
                ))}
              </div>
              <p className="t-micro shrink-0 text-right text-[--accent]">List boards first</p>
            </div>
          </div>
        </div>

        {/* The sheen. Mix-blend keeps it a lift in brightness rather than a
            white smear over the type. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 transition-opacity duration-slow [opacity:var(--sheen-o,0)] [background:radial-gradient(circle_at_var(--sheen-x,50%)_var(--sheen-y,50%),rgb(255_255_255_/_0.35),transparent_45%)] mix-blend-soft-light"
        />
      </div>
    </div>
  );
}
