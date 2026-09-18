/*
 * The fixed choices on the portal's forms, shared by the client forms (to
 * draw the selects) and the server actions (to reject anything else). No
 * server imports here, so a client component can pull it in.
 *
 * The values must match the CHECK constraints in the add_post_booking_forms
 * migration. The labels are free to change.
 */

export const SKI_OR_BOARD = [
  { value: "ski", label: "Ski" },
  { value: "snowboard", label: "Snowboard" },
] as const;

export const ABILITY_LEVELS = [
  { value: "first_time", label: "First time on snow" },
  { value: "beginner", label: "Beginner: green runs" },
  { value: "intermediate", label: "Intermediate: blue runs" },
  { value: "advanced", label: "Advanced: black runs" },
  { value: "expert", label: "Expert: double blacks and off-piste" },
] as const;

export type SkiOrBoard = (typeof SKI_OR_BOARD)[number]["value"];
export type AbilityLevel = (typeof ABILITY_LEVELS)[number]["value"];

export function labelFor(
  options: readonly { value: string; label: string }[],
  value: string | null | undefined
): string {
  return options.find((o) => o.value === value)?.label ?? "Not given";
}

export const MAX_ROOMMATES = 3;
export const MAX_NAME_LENGTH = 80;

/**
 * What every portal action hands back. `fieldErrors` keys are form field
 * names. Nothing in here ever carries a value the traveler typed: the forms
 * keep their own input on an error (see usePortalAction in PortalForms.tsx),
 * so PII never has to make a round trip back to the page.
 */
export type PortalActionResult =
  | { ok: true; message?: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };
