import { Skeleton } from "@/components/ui/skeleton";

// Skeleton matching CourseCard's exact layout (same aspect ratios) so
// swapping in real cards causes zero layout shift.
export function CourseCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
      <Skeleton className="aspect-[16/9] w-full rounded-none" />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-32" />
        <div className="mt-auto flex justify-between pt-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
    </div>
  );
}

export function CourseGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <CourseCardSkeleton key={i} />
      ))}
    </div>
  );
}
