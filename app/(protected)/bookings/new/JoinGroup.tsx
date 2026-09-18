import { Button, Input } from "@/components/ui";

/*
 * "Joining friends in a penthouse?" A plain GET form that reloads the booking
 * page with ?group=CODE. The page checks the code on the server
 * (checkGroupCode in lib/trips.ts); a code that holds a penthouse unlocks it
 * and fills in the group code field. Nothing about who holds what is ever sent
 * to the browser: a wrong code only learns that it is wrong.
 *
 * Kept as its own block so the package layout above it can change without it.
 * No script, so it works before hydration like the rest of the step.
 */

export type JoinGroupResult =
  /** Nothing typed yet. */
  | { state: "none" }
  /** The code holds one of the penthouses on these dates. */
  | { state: "unlocked"; tierNames: string[] }
  /** A real group on the trip, just not a penthouse one. */
  | { state: "not-penthouse" }
  /** Nobody on these dates has this code. */
  | { state: "unknown" };

export default function JoinGroup({
  tripId,
  requestedPackage,
  code,
  result,
}: {
  tripId: string;
  requestedPackage?: string;
  /** What was typed, to put back in the box. */
  code?: string;
  result: JoinGroupResult;
}) {
  return (
    <section
      aria-labelledby="join-group-heading"
      className="mt-10 border border-[--rule] bg-[--surface-raised] p-5 sm:p-6"
    >
      <h2 id="join-group-heading" className="font-body text-body font-medium text-[--text]">
        Friends already booked a penthouse? Use their group code
      </h2>
      <p className="mt-1 font-body text-body-s leading-[1.6] text-[--text-secondary]">
        Each penthouse goes to one group. Once a friend has reserved it, their code is how the rest
        of you get in.
      </p>

      <form method="get" action="/bookings/new" className="mt-4 flex flex-wrap items-end gap-3">
        <input type="hidden" name="trip" value={tripId} />
        {requestedPackage && <input type="hidden" name="package" value={requestedPackage} />}
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="t-micro text-[--text-secondary]">Group code</span>
          <Input
            name="group"
            type="text"
            maxLength={6}
            required
            defaultValue={code}
            placeholder="K7XPQ2"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="w-40"
          />
        </label>
        <Button type="submit" variant="secondary" size="md">
          Find their penthouse
        </Button>
      </form>

      {result.state !== "none" && (
        <p role="status" className="mt-4 font-body text-body-s leading-[1.6] text-[--text]">
          {result.state === "unlocked" &&
            `Found them. ${result.tierNames.join(" and ")} is open to you, and the code is filled in on your order.`}
          {result.state === "not-penthouse" &&
            "That code belongs to a group on these dates, but not one holding a penthouse. It's filled in on your order, so you'll still be grouped with them."}
          {result.state === "unknown" &&
            "We couldn't find that code on these dates. Check it with whoever sent it: six letters and numbers, and it only works on the departure they booked."}
        </p>
      )}
    </section>
  );
}
