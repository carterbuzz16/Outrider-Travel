"use client";

import { useEffect, useState } from "react";

/**
 * Time left until `to`, ticking each second: "14d 06h 12m 09s". The ticking
 * figures are hidden from screen readers, which get the deadline once in
 * words (`spoken`) instead of a number read out every second. Renders the
 * server's own reading first, so the figures do not jump on load.
 */
export default function Countdown({ to, spoken, closed }: { to: string; spoken: string; closed: string }) {
  const end = Date.parse(to);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const left = Math.max(0, end - (now ?? end - 1));
  if (now !== null && left === 0) return <span>{closed}</span>;

  const s = Math.floor(left / 1000);
  const parts: [number, string][] = [
    [Math.floor(s / 86400), "d"],
    [Math.floor((s % 86400) / 3600), "h"],
    [Math.floor((s % 3600) / 60), "m"],
    [s % 60, "s"],
  ];
  return (
    <>
      <span className="sr-only">{spoken}</span>
      <span aria-hidden="true" className="tabular-nums">
        {now === null
          ? " "
          : parts.map(([n, unit], i) => (
              <span key={unit}>
                {i > 0 ? " " : ""}
                {i === 0 ? n : String(n).padStart(2, "0")}
                {unit}
              </span>
            ))}
      </span>
    </>
  );
}
