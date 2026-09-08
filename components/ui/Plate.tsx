import Image from "next/image";
import { cn } from "./cn";
import { OutriderMark } from "./Logo";

/**
 * A picture, or the designed stand-in for one.
 *
 * Outrider has one photograph so far, so most plates are empty. The empty state
 * is deliberately quiet: an inset paper tone with a muted mark, not a saturated
 * brand-teal block. A full-chroma rectangle is a louder signal than any real
 * photograph would be, which made the placeholder the loudest thing on a page
 * and read as "unfinished" rather than "brand".
 */

export type PlateImage = { src: string; alt: string };

export default function Plate({
  image,
  /** Any aspect utility, e.g. "aspect-[4/5]". Omit when the parent sets height. */
  ratio = "aspect-[4/3]",
  /** Photos in a grid size themselves; a backdrop fills its parent. */
  fill = false,
  /**
   * Draw the mark in the empty state. Off for backdrop plates sitting behind
   * type, where the mark shows through as a ghost behind the headline.
   */
  mark = true,
  sizes = "(min-width: 1024px) 50vw, 100vw",
  priority = false,
  /** Focal point for the crop, e.g. "68% 42%". */
  position,
  className,
}: {
  image?: PlateImage | null;
  ratio?: string;
  fill?: boolean;
  mark?: boolean;
  sizes?: string;
  priority?: boolean;
  position?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden",
        image ? "bg-[--surface-inset]" : "bg-[--surface-inset]",
        fill ? "h-full w-full" : ratio,
        className,
      )}
    >
      {image ? (
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
          style={position ? { objectPosition: position } : undefined}
        />
      ) : (
        mark && (
          <span className="absolute inset-0 grid place-items-center">
            <OutriderMark className="w-[18%] min-w-[40px] text-[--text-muted] opacity-40" />
          </span>
        )
      )}
    </div>
  );
}
