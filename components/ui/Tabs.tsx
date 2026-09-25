"use client";

import { useId, useRef, useState } from "react";
import { cn } from "./cn";

/**
 * Tabs: one panel at a time, for detail that would otherwise stack into a
 * long scroll (the rooms, the events and the town on /telluride).
 *
 * Every panel is server-rendered and stays in the DOM; the inactive ones carry
 * `hidden`. So nothing is lost to search or to a reader without JavaScript
 * beyond the switching itself, and a panel's photographs are not refetched on
 * each click.
 *
 * WAI-ARIA tabs pattern with automatic activation: arrow keys move between
 * tabs and select as they go, Home and End jump to the ends, and only the
 * selected tab is in the tab order. The row scrolls sideways on a narrow
 * screen rather than wrapping, so the labels stay on one hairline.
 *
 * Scheme-agnostic: the underline is --accent, which is club ink on paper and
 * club blue on espresso.
 */

export type TabItem = {
  /** Stable key, also the suffix of the tab and panel ids. */
  id: string;
  label: string;
  content: React.ReactNode;
};

export default function Tabs({
  tabs,
  label,
  className,
  panelClassName,
}: {
  tabs: TabItem[];
  /** Names the tab list for screen readers: "Rooms", "The week". */
  label: string;
  className?: string;
  panelClassName?: string;
}) {
  const [active, setActive] = useState(0);
  const base = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  if (tabs.length === 0) return null;

  const select = (index: number) => {
    const next = (index + tabs.length) % tabs.length;
    setActive(next);
    refs.current[next]?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const moves: Record<string, number> = {
      ArrowRight: active + 1,
      ArrowLeft: active - 1,
      Home: 0,
      End: tabs.length - 1,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    select(moves[event.key]);
  };

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="-mx-gutter flex gap-7 overflow-x-auto border-b border-[--rule] px-gutter [scrollbar-width:none] sm:mx-0 sm:px-0 md:gap-10 [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab, i) => {
          const selected = i === active;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                refs.current[i] = node;
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${base}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(i)}
              className={cn(
                "t-label -mb-px shrink-0 whitespace-nowrap border-b-2 pb-4 pt-1 transition-colors duration-fast",
                "focus-visible:outline-offset-4",
                selected
                  ? "border-[--accent] text-[--text]"
                  : "border-transparent text-[--text-secondary] hover:text-[--text]",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {tabs.map((tab, i) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${base}-panel-${tab.id}`}
          aria-labelledby={`${base}-tab-${tab.id}`}
          hidden={i !== active}
          // Focusable so a keyboard user can move from the tab straight into
          // a panel that has no controls of its own.
          tabIndex={0}
          className={cn("pt-10 focus-visible:outline-offset-8 md:pt-12", panelClassName)}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
