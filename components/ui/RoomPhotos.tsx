"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "./cn";

/**
 * One room's photographs: a hero, a row of thumbnails, and a lightbox.
 *
 * Every picture is a button that opens the lightbox at that photograph, so the
 * page stays light (one hero, a few thumbnails) and the full set is one tap
 * away. The lightbox is a native <dialog> opened with showModal(): the browser
 * supplies the top layer, the inert page behind, Escape to close and focus
 * handling, which is what a hand-rolled overlay gets subtly wrong. Arrow keys
 * and a horizontal swipe move between photographs; the count is announced.
 *
 * Only ever handed files that exist (lib/room-media.ts checks on the server),
 * so there is no broken-image state to design for. With no photographs the
 * caller renders the typographic panel instead of this.
 */

export type RoomPhoto = { src: string; alt: string };

export default function RoomPhotos({
  photos,
  title,
  ratio = "aspect-[3/2]",
  sizes,
  maxThumbs = 4,
  priority = false,
  className,
}: {
  photos: RoomPhoto[];
  /** The room's name, for the lightbox heading and button labels. */
  title: string;
  ratio?: string;
  /** next/image sizes for the hero. */
  sizes: string;
  /** Thumbnails shown under the hero; the last becomes "+N" when there are more. */
  maxThumbs?: number;
  priority?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const lastTrigger = useRef<HTMLButtonElement | null>(null);

  const show = (index: number, trigger: HTMLButtonElement) => {
    lastTrigger.current = trigger;
    setOpen(index);
  };

  if (photos.length === 0) return null;

  // Thumbnails are the photographs after the hero. When they run past the
  // row, the last slot says how many more there are and opens on that one.
  const rest = photos.slice(1);
  const visible = rest.slice(0, maxThumbs);
  const hidden = rest.length - visible.length;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <button
        type="button"
        onClick={(e) => show(0, e.currentTarget)}
        className={cn("group relative block w-full overflow-hidden bg-[--surface-inset]", ratio)}
        aria-label={`${title}: view ${photos.length === 1 ? "photograph" : `all ${photos.length} photographs`}`}
      >
        <Image
          src={photos[0].src}
          alt={photos[0].alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover transition-transform duration-slow ease-out motion-safe:group-hover:scale-[1.02]"
        />
        {photos.length > 1 && (
          <span className="t-micro absolute bottom-3 right-3 bg-[rgb(var(--rgb-espresso-deep)_/_0.78)] px-2.5 py-1.5 text-[--color-paper]">
            {photos.length} photos
          </span>
        )}
      </button>

      {visible.length > 0 && (
        <ul className="m-0 grid list-none grid-cols-4 gap-2 p-0">
          {visible.map((photo, i) => {
            const index = i + 1;
            const more = i === visible.length - 1 && hidden > 0;
            return (
              <li key={photo.src}>
                <button
                  type="button"
                  onClick={(e) => show(index, e.currentTarget)}
                  aria-label={more ? `${title}: ${hidden + 1} more photographs` : `${title}: ${photo.alt}`}
                  className="group relative block aspect-[3/2] min-h-11 w-full overflow-hidden bg-[--surface-inset]"
                >
                  <Image
                    src={photo.src}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 12vw, 25vw"
                    className="object-cover transition-opacity duration-fast group-hover:opacity-85"
                  />
                  {more && (
                    <span className="absolute inset-0 grid place-items-center bg-[rgb(var(--rgb-espresso-deep)_/_0.62)] font-display text-body font-medium tabular-nums text-[--color-paper]">
                      +{hidden + 1}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Lightbox
        photos={photos}
        title={title}
        index={open}
        onIndex={setOpen}
        onClose={() => {
          setOpen(null);
          // After the dialog has closed: while it is open the page is inert
          // and cannot take focus.
          requestAnimationFrame(() => lastTrigger.current?.focus());
        }}
      />
    </div>
  );
}

/**
 * Just the lightbox, behind a text button: for places with no room for the
 * hero and thumbnails, like a package card at checkout.
 */
export function RoomPhotosButton({
  photos,
  title,
  className,
}: {
  photos: RoomPhoto[];
  title: string;
  className?: string;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  if (photos.length === 0) return null;

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen(0)}
        className={cn(
          "inline-flex min-h-11 items-center font-body text-body-s text-[--accent] underline underline-offset-4",
          className,
        )}
      >
        View {photos.length === 1 ? "photo" : `${photos.length} photos`}
        <span className="sr-only"> of {title}</span>
      </button>
      <Lightbox
        photos={photos}
        title={title}
        index={open}
        onIndex={setOpen}
        onClose={() => {
          setOpen(null);
          requestAnimationFrame(() => trigger.current?.focus());
        }}
      />
    </>
  );
}

function Lightbox({
  photos,
  title,
  index,
  onIndex,
  onClose,
}: {
  photos: RoomPhoto[];
  title: string;
  index: number | null;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const touchX = useRef<number | null>(null);
  const isOpen = index !== null;
  const count = photos.length;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      dialog.showModal();
      // The page behind stays put; showModal makes it inert but not unscrollable.
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previous;
      };
    }
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  const step = useCallback(
    (delta: number) => {
      if (index === null) return;
      onIndex((index + delta + count) % count);
    },
    [index, count, onIndex],
  );

  if (count === 0) return null;
  const current = index ?? 0;
  const photo = photos[current];

  return (
    <dialog
      ref={ref}
      aria-labelledby={headingId}
      // Escape fires `cancel`; closing goes through state so focus returns.
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // A browser can still close it natively (Chrome does on a repeated
      // Escape); keep the state in step when it does.
      onClose={() => {
        if (isOpen) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") step(1);
        if (e.key === "ArrowLeft") step(-1);
        // Handled here as well as through `cancel`, which some browsers only
        // fire for Escape once per activation.
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
      }}
      onTouchStart={(e) => {
        touchX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        const end = e.changedTouches[0]?.clientX;
        touchX.current = null;
        if (start === null || end === undefined || Math.abs(end - start) < 40) return;
        step(end < start ? 1 : -1);
      }}
      className={cn(
        "scheme-espresso m-0 h-[100dvh] max-h-none w-screen max-w-none border-0 bg-[--surface-inset] p-0 text-[--text]",
        "backdrop:bg-[rgb(var(--rgb-espresso-deep)_/_0.92)]",
        "open:flex open:flex-col",
      )}
    >
      {isOpen && (
        <>
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <h2 id={headingId} className="t-label min-w-0 truncate text-[--text]">
              {title}
              <span className="ml-3 tabular-nums text-[--text-secondary]" aria-live="polite">
                {current + 1} / {count}
              </span>
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="t-label -mr-2 inline-flex min-h-11 items-center gap-2 px-2 text-[--text] hover:text-[--accent]"
              autoFocus
            >
              Close
              <svg aria-hidden="true" viewBox="0 0 12 12" className="h-3 w-3" stroke="currentColor" strokeWidth="1.25" fill="none">
                <path d="M1 1l10 10M11 1L1 11" />
              </svg>
            </button>
          </div>

          <figure className="relative m-0 flex min-h-0 flex-1 flex-col">
            <div className="relative min-h-0 flex-1">
              <Image
                key={photo.src}
                src={photo.src}
                alt={photo.alt}
                fill
                sizes="100vw"
                className="object-contain motion-safe:animate-fade"
              />
            </div>
            <figcaption className="px-4 pb-2 pt-3 text-center font-body text-body-s leading-[1.6] text-[--text-secondary] sm:px-6">
              {photo.alt}
            </figcaption>
          </figure>

          {count > 1 && (
            <div className="flex items-center justify-center gap-2 px-4 pb-5 pt-2">
              <StepButton label="Previous photograph" onClick={() => step(-1)} direction="left" />
              <StepButton label="Next photograph" onClick={() => step(1)} direction="right" />
            </div>
          )}
        </>
      )}
    </dialog>
  );
}

function StepButton({
  label,
  onClick,
  direction,
}: {
  label: string;
  onClick: () => void;
  direction: "left" | "right";
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid h-11 w-11 place-items-center border border-[--rule-strong] text-[--text] transition-colors duration-fast hover:bg-[--text] hover:text-[--surface-inset]"
    >
      <svg
        width="15"
        height="10"
        viewBox="0 0 15 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        aria-hidden="true"
        className={direction === "left" ? "rotate-180" : undefined}
      >
        <path d="M0 5h13.5M9.5 1l4 4-4 4" />
      </svg>
    </button>
  );
}
