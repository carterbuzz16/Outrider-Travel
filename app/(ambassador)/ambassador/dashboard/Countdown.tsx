"use client";

import { useEffect, useState } from "react";

/**
 * Time left until `to`, as four tiles (days, hours, minutes, seconds) that
 * tick each second. The ticking figures are hidden from screen readers, which
 * get the deadline once in words (`spoken`) rather than a number read out
 * every second. Dashes until the browser's clock is read, so nothing jumps.
 */
export default function Countdown({ to, spoken, closed }: { to: string; spoken: string; closed: string }) {
  const end = Date.parse(to);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (now !== null && now >= end) return <p className="t-subheading">{closed}</p>;

  const s = now === null ? null : Math.floor((end - now) / 1000);
  const tiles: [string, string][] = [
    [s === null ? "--" : String(Math.floor(s / 86400)), "days"],
    [s === null ? "--" : String(Math.floor((s % 86400) / 3600)).padStart(2, "0"), "hrs"],
    [s === null ? "--" : String(Math.floor((s % 3600) / 60)).padStart(2, "0"), "min"],
    [s === null ? "--" : String(s % 60).padStart(2, "0"), "sec"],
  ];
  return (
    <>
      <span className="sr-only">{spoken}</span>
      <span aria-hidden="true" className="grid grid-cols-4 gap-1.5">
        {tiles.map(([n, unit]) => (
          <span key={unit} className="flex flex-col items-center bg-[rgb(var(--rgb-paper)/0.08)] py-2.5">
            <span className="t-subheading tabular-nums">{n}</span>
            <span className="t-micro mt-1 text-[--text-secondary]">{unit}</span>
          </span>
        ))}
      </span>
    </>
  );
}
