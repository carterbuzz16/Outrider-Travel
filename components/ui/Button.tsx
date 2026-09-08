import Link from "next/link";
import { cn } from "./cn";

/**
 * Button — primary, secondary, ghost.
 *
 * All three are square-cornered and set in the tracked mono label voice. They
 * read as stamped instructions rather than app chrome: no pill shapes, no drop
 * shadows, no gradient. Hover only ever changes colour and rule weight; the
 * one moving part is the ghost variant's underline, which draws in from the
 * left over 260ms.
 *
 * Colours come from the semantic layer, so a button inside `.scheme-forest`
 * flips to sky-on-forest with nothing passed in.
 */

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "group relative inline-flex items-center justify-center gap-2.5 " +
  "font-display uppercase tracking-label leading-none whitespace-nowrap " +
  "border transition-[background-color,border-color,color,opacity] duration-fast ease-out " +
  "disabled:pointer-events-none disabled:opacity-45";

const VARIANTS: Record<ButtonVariant, string> = {
  // Filled: the one place a solid block of colour is allowed to sit in a layout.
  // The ground is --accent-solid rather than --accent because brand teal can't
  // carry a 12px label — see the contrast note in globals.css. Hover and its
  // reverse are both scheme-supplied, so no variant overrides are needed here.
  primary:
    "bg-[--accent-solid] text-[--accent-contrast] border-[--accent-solid] " +
    "hover:bg-[--accent-solid-hover] hover:border-[--accent-solid-hover]",

  // A hairline box. The workhorse — safe on any surface, quiet in a stack.
  secondary:
    "bg-transparent text-[--text] border-[--rule-strong] " +
    "hover:bg-[--text] hover:text-[--surface] hover:border-[--text]",

  // No box at all. For tertiary actions and anything sitting in running text.
  ghost:
    "bg-transparent text-[--text] border-transparent px-0 " +
    "hover:text-[--accent]",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "text-micro px-4 py-2.5",
  md: "text-label px-6 py-3.5",
  lg: "text-label px-8 py-[1.15rem]",
};

// Ghost buttons carry no box, so without this they measure ~21px tall and fall
// under the 24px minimum target size. Negative margin keeps the layout put.
const GHOST_SIZES: Record<ButtonSize, string> = {
  sm: "text-micro py-2 -my-2",
  md: "text-label py-2.5 -my-2.5",
  lg: "text-label py-3 -my-3",
};

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Fills the container — use in narrow columns and on mobile forms. */
  block?: boolean;
  className?: string;
  children: React.ReactNode;
};

type ButtonAsButton = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & {
    href?: never;
  };

type ButtonAsLink = CommonProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps> & {
    href: string;
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

export default function Button(props: ButtonProps) {
  const {
    variant = "primary",
    size = "md",
    block = false,
    className,
    children,
    ...rest
  } = props;

  const classes = cn(
    BASE,
    VARIANTS[variant],
    variant === "ghost" ? GHOST_SIZES[size] : SIZES[size],
    block && "w-full",
    className,
  );

  // The ghost variant's rule: a hairline under the label, sitting at 40% so the
  // affordance is legible at rest and inking in on hover. A fade, not a sweep —
  // a growing underline is the kind of flourish this brand doesn't do.
  const underline =
    variant === "ghost" ? (
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-0 -bottom-0.5 h-px bg-current",
          "opacity-40 transition-opacity duration-[--dur] ease-out",
          "group-hover:opacity-100",
        )}
      />
    ) : null;

  if ("href" in rest && rest.href) {
    const { href, ...anchorRest } = rest as ButtonAsLink;
    const external = /^(https?:|mailto:|tel:)/.test(href);

    if (external) {
      return (
        <a className={classes} href={href} {...anchorRest}>
          {children}
          {underline}
        </a>
      );
    }

    return (
      <Link className={classes} href={href} {...anchorRest}>
        {children}
        {underline}
      </Link>
    );
  }

  const { type = "button", ...buttonRest } = rest as ButtonAsButton;

  return (
    <button className={classes} type={type} {...buttonRest}>
      {children}
      {underline}
    </button>
  );
}
