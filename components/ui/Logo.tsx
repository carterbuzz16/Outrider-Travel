import { cn } from "./cn";

/**
 * The Outrider logo.
 *
 * Two pieces: the eye/horizon mark (a pupil on a long horizon line, the rider
 * looking out ahead) and the OUTRIDER wordmark. Both are outlined vector paths
 * lifted straight from the source artwork, so the letterforms and proportions
 * are the comp's own — no web font to load, nothing to flash on first paint.
 *
 * Colour is a prop rather than a wrapper's responsibility because the logo has
 * to sit on cream, on charcoal and on teal, and `tone="inherit"` (the default)
 * lets it simply take the colour of whatever scheme it lands in.
 */

export type LogoTone = "inherit" | "cream" | "charcoal" | "teal" | "forest" | "sky";

const TONES: Record<LogoTone, string | undefined> = {
  inherit: undefined,
  cream: "var(--color-cream)",
  charcoal: "var(--color-charcoal)",
  teal: "var(--color-teal)",
  forest: "var(--color-forest)",
  sky: "var(--color-sky)",
};

// Exported so the Open Graph image can draw the real artwork as vector paths
// rather than duplicating it or depending on a font being loadable in Satori.
export const MARK_D = "M36.466 19.829L43.883 16.785L2.986 0.001L2.986 6.088Z M57.06 60.995L96.63 44.623C99.393 43.48 99.388 39.564 96.622 38.429L57.113 22.215L96.407 6.088L96.407 0L49.697 19.171L49.696 19.171L42.28 22.215L2.772 38.429C0.005 39.564 0 43.48 2.763 44.623L36.537 58.597L43.929 55.563L17.542 44.646C14.778 43.502 14.784 39.587 17.551 38.451L49.697 25.258L81.843 38.451C84.609 39.587 84.615 43.502 81.852 44.646L49.697 57.949L49.696 57.949L42.333 60.995L2.986 77.274L2.986 83.367L49.697 64.041L96.407 83.367L96.407 77.274Z M49.697 32.67C45.781 32.67 42.607 36.705 42.607 41.682C42.607 46.66 45.781 50.695 49.697 50.695C53.613 50.695 56.786 46.66 56.786 41.682C56.786 36.705 53.613 32.67 49.697 32.67";
export const WORDMARK_D = "M0 7.461L0 6.963C0 2.726 2.148 0 5.491 0C8.854 0 11.002 2.726 11.002 6.963L11.002 7.461C11.002 11.699 8.854 14.425 5.491 14.425C2.148 14.425 0 11.699 0 7.461 M8.575 7.461L8.575 6.963C8.575 3.999 7.421 2.248 5.491 2.248C3.561 2.248 2.427 3.999 2.427 6.963L2.427 7.461C2.427 10.425 3.561 12.176 5.491 12.176C7.421 12.176 8.575 10.425 8.575 7.461 M13.847 8.973L13.847 0.259L16.235 0.259L16.235 8.913C16.235 10.923 17.21 12.156 19.02 12.156C20.89 12.156 21.826 10.923 21.826 8.913L21.826 0.259L24.213 0.259L24.213 8.973C24.213 12.276 22.343 14.425 19.02 14.425C15.717 14.425 13.847 12.336 13.847 8.973 M27.137 0.259L37.98 0.259L37.98 2.447L33.762 2.447L33.762 14.186L31.355 14.186L31.355 2.447L27.137 2.447Z M41.361 0.259L46.395 0.259C49.18 0.259 51.13 1.771 51.13 4.497C51.13 6.506 49.817 8.178 47.609 8.536L52.085 14.186L49.2 14.186L44.963 8.675L43.729 8.675L43.729 14.186L41.361 14.186Z M43.729 6.666L46.395 6.666C47.748 6.666 48.723 5.87 48.723 4.517C48.723 3.164 47.748 2.408 46.395 2.408L43.729 2.408Z M55.049 11.958L58.431 11.958L58.431 2.488L55.049 2.488L55.049 0.259L64.181 0.259L64.181 2.488L60.799 2.488L60.799 11.958L64.181 11.958L64.181 14.186L55.049 14.186Z M78.466 7.023L78.466 7.441C78.466 11.5 75.7 14.186 72.099 14.186L68.259 14.186L68.259 0.259L72.119 0.259C75.7 0.259 78.466 2.945 78.466 7.023 M70.627 11.977L72.119 11.977C74.367 11.977 76.019 10.206 76.019 7.441L76.019 7.023C76.019 4.218 74.367 2.467 72.119 2.467L70.627 2.467Z M82.425 0.259L91.418 0.259L91.418 2.427L84.812 2.427L84.812 5.969L90.961 5.969L90.961 8.078L84.812 8.078L84.812 12.018L91.458 12.018L91.458 14.186L82.425 14.186Z M95.476 0.259L100.51 0.259C103.295 0.259 105.245 1.771 105.245 4.497C105.245 6.506 103.932 8.178 101.723 8.536L106.2 14.186L103.315 14.186L99.077 8.675L97.843 8.675L97.843 14.186L95.476 14.186Z M97.843 6.666L100.51 6.666C101.862 6.666 102.837 5.87 102.837 4.517C102.837 3.164 101.862 2.408 100.51 2.408L97.843 2.408Z";

type PieceProps = {
  className?: string;
  tone?: LogoTone;
};

/** The mark on its own — favicons, loading states, a stamp centre. */
export function OutriderMark({ className, tone = "inherit" }: PieceProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 99.393 83.367"
      fill="currentColor"
      style={{ color: TONES[tone] }}
      aria-hidden="true"
      focusable="false"
    >
      <path d={MARK_D} />
    </svg>
  );
}

/** The wordmark on its own — nav bars, footers, anywhere the mark would crowd. */
export function OutriderWordmark({ className, tone = "inherit" }: PieceProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 106.2 14.425"
      fill="currentColor"
      style={{ color: TONES[tone] }}
      aria-hidden="true"
      focusable="false"
    >
      <path d={WORDMARK_D} />
    </svg>
  );
}

type LogoProps = PieceProps & {
  /**
   * `lockup` sets the mark above the wordmark (hero, footer), `inline` sets it
   * beside (nav), and the two single-piece variants speak for themselves.
   */
  variant?: "lockup" | "inline" | "mark" | "wordmark";
  /** Wordmark width. The mark is sized off it so the lockup stays in ratio. */
  width?: number | string;
  /** Rendered for screen readers and search; the SVGs themselves are decorative. */
  label?: string;
};

export default function Logo({
  variant = "inline",
  tone = "inherit",
  width,
  label = "Outrider",
  className,
}: LogoProps) {
  const color = TONES[tone];

  // The single-piece variants take their size from the wrapper, so `width` and
  // any utility width on `className` both work.
  if (variant === "mark" || variant === "wordmark") {
    const Piece = variant === "mark" ? OutriderMark : OutriderWordmark;
    return (
      <span
        className={cn("inline-flex", !width && !className && "w-[104px]", className)}
        style={{ color, width }}
      >
        <Piece className="h-auto w-full" />
        <span className="sr-only">{label}</span>
      </span>
    );
  }

  const stacked = variant === "lockup";

  return (
    <span
      className={cn(
        "inline-flex",
        stacked ? "flex-col items-center gap-4" : "flex-row items-center gap-3",
        className,
      )}
      style={{ color, width }}
    >
      {/* In the inline lockup the mark reads as a small fixed glyph; in the
          stacked one it scales with the wordmark above it. */}
      <OutriderMark
        className={cn("h-auto shrink-0", stacked ? "w-[22%] min-w-[44px]" : "w-6")}
      />
      <OutriderWordmark className={cn("h-auto", stacked ? "w-full" : "w-[104px]")} />
      <span className="sr-only">{label}</span>
    </span>
  );
}
