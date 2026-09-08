import { Skeleton, SkeletonGroup } from "@/components/ui";

/*
 * The booking flow's loading boundary.
 *
 * Shaped like the dashboard it usually precedes — masthead, then two booking
 * cards — so the page settles into place instead of jumping from a line of
 * text to a full layout.
 *
 * Scoped here on purpose. An app-wide app/loading.tsx streams its skeleton
 * immediately, which commits a 200 before a later notFound() can change it, and
 * every draft trip then answered 200 with the 404 page in its body. Do not add
 * one above this directory; see the note at the top of
 * app/(site)/trips/[id]/page.tsx.
 */
export default function Loading() {
  return (
    <SkeletonGroup label="Loading your bookings" className="shell py-14 md:py-20">
      <Skeleton className="h-2.5 w-28" />
      <Skeleton className="mt-6 h-10 w-64 max-w-full bg-[--rule]" />

      <div className="mt-10 border-t border-[--rule] pt-7">
        <Skeleton className="h-2.5 w-20" />
        <Skeleton className="mt-4 h-6 w-52 max-w-full" />
      </div>

      <div className="mt-12 flex flex-col gap-5">
        {[0, 1].map((i) => (
          <div key={i} className="border border-[--rule] bg-[--surface-raised] p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <Skeleton className="h-2.5 w-24" />
                <Skeleton className="mt-4 h-7 w-3/4 bg-[--rule]" />
                <Skeleton className="mt-3 h-3 w-2/5" />
              </div>
              <Skeleton className="h-7 w-28 shrink-0" />
            </div>

            <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 border-t border-[--rule-faint] pt-6 lg:grid-cols-4">
              {[0, 1, 2, 3].map((j) => (
                <div key={j}>
                  <Skeleton className="h-2.5 w-16" />
                  <Skeleton className="mt-3 h-5 w-24" />
                </div>
              ))}
            </div>

            <Skeleton className="mt-8 h-px w-full bg-[--rule]" />
            <Skeleton className="mt-6 h-9 w-40" />
          </div>
        ))}
      </div>
    </SkeletonGroup>
  );
}
