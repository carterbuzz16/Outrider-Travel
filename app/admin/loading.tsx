import { Skeleton, SkeletonGroup } from "@/components/ui";

/*
 * The back office's loading boundary.
 *
 * Shaped like the screens under it — a short masthead, a row of figures, then
 * a table — so the page settles rather than jumping from a line of text into a
 * full layout. Every admin read is `force-dynamic` and unbatched, so this is
 * on screen often enough to be worth drawing properly.
 */
export default function Loading() {
  return (
    <SkeletonGroup label="Loading the back office" className="shell pb-16">
      <div className="border-b border-[--rule] pb-6 pt-8 md:pt-10">
        <Skeleton className="h-2.5 w-24" />
        <Skeleton className="mt-4 h-7 w-64 max-w-full bg-[--rule]" />
      </div>

      <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="border-t border-[--rule-strong] pt-3.5">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="mt-4 h-6 w-16" />
          </div>
        ))}
      </div>

      <div className="mt-10 border border-[--rule] bg-[--surface-raised]">
        <div className="border-b border-[--rule] px-5 py-4">
          <Skeleton className="h-2.5 w-28" />
        </div>
        <div className="flex flex-col gap-px bg-[--rule-faint]">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-6 bg-[--surface-raised] px-5 py-4">
              <Skeleton className="h-3 w-1/4" />
              <Skeleton className="h-3 w-1/5" />
              <Skeleton className="h-3 w-1/6" />
              <Skeleton className="h-3 w-1/12" />
            </div>
          ))}
        </div>
      </div>
    </SkeletonGroup>
  );
}
