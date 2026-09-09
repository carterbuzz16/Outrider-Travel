/**
 * The Outrider design system.
 *
 * Tokens live in app/globals.css (brand → semantic → scheme) and are surfaced
 * to Tailwind in tailwind.config.ts. Nothing in here hard-codes a hex.
 */
export { default as Logo, OutriderMark, OutriderWordmark } from "./Logo";
export type { LogoTone } from "./Logo";

export { default as Button } from "./Button";
export type { ButtonProps, ButtonVariant, ButtonSize } from "./Button";

export { default as NavBar, DEFAULT_LINKS } from "./NavBar";
export type { NavLink } from "./NavBar";

export { default as Footer } from "./Footer";

export { default as TripCard } from "./TripCard";
export type { Trip } from "./TripCard";

export { default as Gallery } from "./Gallery";
export type { GalleryImage } from "./Gallery";
export { default as Hero } from "./Hero";
export { default as HeroVideo } from "./HeroVideo";
export { default as Plate } from "./Plate";
export type { PlateImage } from "./Plate";
export { default as Comparison } from "./Comparison";
export { default as ComparisonTable } from "./ComparisonTable";
export type { ComparisonRow } from "./Comparison";
export { default as EditorialPair } from "./EditorialPair";
export { default as TierTable } from "./TierTable";
export type { TierView } from "./TierTable";

export { default as SectionDivider } from "./SectionDivider";
export { default as Stamp } from "./Stamp";

export { default as Skeleton, SkeletonGroup } from "./Skeleton";

export { default as Badge, StatusBadge, TRIP_STATUS } from "./Badge";
export type { BadgeTone, TripStatus } from "./Badge";

export { Field, Input, InlineInput, Textarea, Select, Checkbox } from "./Field";

export { default as AcceptTerms } from "./AcceptTerms";
export { default as Alert } from "./Alert";
export type { AlertTone } from "./Alert";

export { ToastProvider, useToast } from "./Toast";

export { default as Reveal } from "./Reveal";

// Renders only when lib/consent.ts sets TRACKING_ENABLED — see the audit note
// at the top of that file for why it is currently off.
export { default as CookieConsent } from "./CookieConsent";
export { cn } from "./cn";

export { OrganizationSchema, TripSchema } from "./StructuredData";
export { default as WaitlistCTA } from "./WaitlistCTA";
export { cellGridClass, cellSpanClass } from "./cell-grid";
