import { cn } from "./cn";
import { OutriderMark } from "./Logo";

/**
 * Circular stamp badge — the passport/luggage-label device.
 *
 * A double hairline ring with type set around the inside of it and the eye
 * mark at the centre. Use it as a seal on a hero corner, a section opener, or
 * a "chartered" mark on a trip page. One per screen, at most: the moment there
 * are two of these in view the whole conceit reads as decoration.
 */

type StampProps = {
  /** Set around the ring. Repeated to fill the circle, with a separator. */
  text: string;
  /** Slow rotation, 32s a turn. Off by default; honours reduced-motion. */
  spin?: boolean;
  /** Rendered at the centre. Defaults to the eye mark. */
  center?: React.ReactNode;
  className?: string;
};

/** Characters that sit comfortably around the ring at this radius and size. */
const RING_CAPACITY = 40;
/** Circumference of the r=74 text circle below (2 x pi x 74), to 2dp. */
const RING_LENGTH = 464.96;

/** Stable, collision-tolerant: two stamps with the same text share a path, and
 *  since the path is identical that renders correctly either way. */
function pathId(text: string) {
  let h = 0;
  for (let i = 0; i < text.length; i += 1)
    h = (h * 31 + text.charCodeAt(i)) | 0;
  return `stamp-arc-${Math.abs(h).toString(36)}`;
}

export default function Stamp({
  text,
  spin = false,
  center,
  className,
}: StampProps) {
  const id = pathId(text);
  const label = text.trim().replace(/\s*·\s*$/, "");

  // Fill the ring, always.
  //
  // Repeating by whole passes leaves a gap whenever the text does not divide
  // the circumference: "SCOUTED · PREPARED · " is 21 characters against a ring
  // holding about 40, so flooring gave a single pass and left the top right of
  // the stamp visibly empty. Repeat to roughly fill, then let textLength close
  // the circle exactly. lengthAdjust="spacing" only moves glyphs apart, it
  // never distorts them.
  const unit = `${label.toUpperCase()} · `;
  const ring = unit.repeat(Math.max(1, Math.round(RING_CAPACITY / unit.length)));

  return (
    // The root deliberately sets no `position`: a caller pinning the stamp with
    // `absolute` would otherwise lose to a `relative` here, since Tailwind emits
    // .relative after .absolute. The inner wrapper is the positioning context.
    <div className={cn("aspect-square w-32", className)}>
      <div className="relative h-full w-full">
        <svg
          viewBox="0 0 200 200"
          className={cn("h-full w-full", spin && "animate-stamp-rotate")}
          role="img"
          aria-label={label}
        >
          {/* Two rings, close-set, the way an inked seal doubles its border. */}
          <circle
            cx="100"
            cy="100"
            r="96"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.5"
          />
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.9"
          />

          {/* Full circle rather than an arc, so the text wraps continuously. */}
          <path
            id={id}
            d="M100,100 m-74,0 a74,74 0 1,1 148,0 a74,74 0 1,1 -148,0"
            fill="none"
          />
          <text
            fill="currentColor"
            className="stamp-type"
            style={{ fontSize: "12px", letterSpacing: "0.3em" }}
          >
            <textPath
              href={`#${id}`}
              startOffset="0%"
              textLength={RING_LENGTH}
              lengthAdjust="spacing"
            >
              {ring}
            </textPath>
          </text>
        </svg>

        {/* Counter-rotation would be the fussy answer; instead the centre simply
          sits outside the spinning SVG and never moves. */}
        <span className="pointer-events-none absolute inset-0 grid place-items-center">
          {center ?? <OutriderMark className="w-[26%]" />}
        </span>
      </div>
    </div>
  );
}
