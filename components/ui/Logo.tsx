import { cn } from "./cn";
import { HORIZONTAL, MARK, SKI_CLUB, VERTICAL, WORDMARK } from "./logo-art";

/**
 * The Outrider logo, final identity.
 *
 * The nav and page headers use the plain `inline` lock-up. The site otherwise
 * wears the Ski Club look, and the club lock-up appears below the nav:
 * `club-stacked` in the footer, `club` on the share card.
 *
 * Five pieces of artwork, all taken verbatim from the delivered SVG masters
 * (see ./logo-art.ts): the brand icon, the OUTRIDER logotype, the primary
 * horizontal lock-up, the secondary vertical lock-up, and the Ski Club
 * extension. The lock-ups are drawn from their own masters rather than
 * assembled from the icon and logotype in CSS, so the gap between mark and
 * name is the designer's, at every size.
 *
 * Color is a prop because the logo has to sit on paper, on espresso, on club
 * blue and over photographs. `tone="inherit"` (the default) takes the color of
 * whatever scheme it lands in, which is right almost everywhere.
 */

export type LogoTone =
  | "inherit"
  | "espresso"
  | "black"
  | "paper"
  | "warm-gray"
  | "club";

const TONES: Record<LogoTone, string | undefined> = {
  inherit: undefined,
  espresso: "var(--color-espresso)",
  black: "var(--color-black)",
  paper: "var(--color-paper)",
  "warm-gray": "var(--color-warm-gray)",
  club: "var(--color-club)",
};

// Exported for the Open Graph images, which render in Satori and draw the
// artwork as raw paths rather than through this component.
export { HORIZONTAL, MARK, SKI_CLUB, VERTICAL, WORDMARK };

type PieceProps = {
  className?: string;
  tone?: LogoTone;
};

/** The brand icon on its own: favicons, placeholders, a stamp center. */
export function OutriderMark({ className, tone = "inherit" }: PieceProps) {
  return (
    <svg
      className={className}
      viewBox={`0 0 ${MARK.w} ${MARK.h}`}
      fill="currentColor"
      style={{ color: TONES[tone] }}
      aria-hidden="true"
      focusable="false"
    >
      <path d={MARK.d} />
    </svg>
  );
}

/** The logotype on its own, for anywhere the icon would crowd. */
export function OutriderWordmark({ className, tone = "inherit" }: PieceProps) {
  return (
    <svg
      className={className}
      viewBox={`0 0 ${WORDMARK.w} ${WORDMARK.h}`}
      fill="currentColor"
      style={{ color: TONES[tone] }}
      aria-hidden="true"
      focusable="false"
    >
      <path d={WORDMARK.d} />
    </svg>
  );
}

type LogoProps = PieceProps & {
  /**
   * `inline` is the primary horizontal lock-up (nav, most places), `lockup`
   * the secondary vertical one (footer, a centred panel), `club` the Ski Club
   * extension, and `club-stacked` sets SKI CLUB centred under the vertical
   * lock-up, as on the club tile in the brand book. `mark` and `wordmark` are
   * the single pieces.
   */
  variant?: "inline" | "lockup" | "club" | "club-stacked" | "mark" | "wordmark";
  /**
   * The Ski Club lock-up comes in one color and two. Pass a tone here to color
   * the SKI CLUB name separately, e.g. `clubTone="club"` on paper, which is the
   * brand book's two-color version.
   */
  clubTone?: LogoTone;
  /** Rendered width. Height follows the artwork's own ratio. */
  width?: number | string;
  /** Read by screen readers and search; the artwork itself is decorative. */
  label?: string;
};

// Default rendered widths, chosen so the logotype's cap height is the same
// (~11px) across the three lock-ups when nothing else sizes them.
const DEFAULT_WIDTH: Record<NonNullable<LogoProps["variant"]>, string> = {
  inline: "w-[140px]",
  lockup: "w-[112px]",
  club: "w-[238px]",
  "club-stacked": "w-[112px]",
  mark: "w-8",
  wordmark: "w-[104px]",
};

export default function Logo({
  variant = "inline",
  tone = "inherit",
  clubTone,
  width,
  label,
  className,
}: LogoProps) {
  const color = TONES[tone];
  const sized = !width && !/\bw-/.test(className ?? "");
  const wrapper = cn("inline-flex shrink-0", sized && DEFAULT_WIDTH[variant], className);
  const name =
    label ?? (variant === "club" || variant === "club-stacked" ? "Outrider Ski Club" : "Outrider");
  const clubFill = clubTone ? TONES[clubTone] : undefined;

  let art: React.ReactNode;
  if (variant === "mark") {
    art = <OutriderMark className="h-auto w-full" />;
  } else if (variant === "wordmark") {
    art = <OutriderWordmark className="h-auto w-full" />;
  } else if (variant === "club-stacked") {
    // No stacked club master was delivered, so it is composed from two that
    // were: the vertical lock-up, and the SKI CLUB name from the horizontal
    // club master, scaled to 0.6 (its width is then 55% of OUTRIDER's, as on
    // the book's club tile), centred, and set 16 units below. Offsets come
    // from the measured bounding boxes of both paths.
    art = (
      <svg
        className="h-auto w-full"
        viewBox={`0 0 ${VERTICAL.w} 193.3`}
        fill="currentColor"
        aria-hidden="true"
        focusable="false"
      >
        <path d={VERTICAL.mark} />
        <path d={VERTICAL.word} />
        <path
          d={SKI_CLUB.club}
          fill={clubFill}
          transform="translate(-206.07 156.28) scale(0.6)"
        />
      </svg>
    );
  } else {
    const src = variant === "lockup" ? VERTICAL : variant === "club" ? SKI_CLUB : HORIZONTAL;
    art = (
      <svg
        className="h-auto w-full"
        viewBox={`0 0 ${src.w} ${src.h}`}
        fill="currentColor"
        aria-hidden="true"
        focusable="false"
      >
        <path d={src.mark} />
        <path d={src.word} />
        {"club" in src && <path d={src.club} fill={clubFill} />}
      </svg>
    );
  }

  return (
    <span className={wrapper} style={{ color, width }}>
      {art}
      <span className="sr-only">{name}</span>
    </span>
  );
}
