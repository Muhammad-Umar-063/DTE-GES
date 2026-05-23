// Reusable shimmer skeletons. Keep them deliberately calm — no flashy
// animation; just enough movement to read as "loading" without distraction.
export function SkeletonLine({ className }: { className?: string }) {
  return (
    <div
      className={
        "h-3 rounded-tag bg-surface-3 animate-pulse " + (className ?? "w-full")
      }
      aria-hidden
    />
  );
}

export function SkeletonBlock({
  className,
  rows = 3,
}: {
  className?: string;
  rows?: number;
}) {
  return (
    <div className={"flex flex-col gap-2 " + (className ?? "")} aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonLine key={i} className={i === rows - 1 ? "w-2/3" : "w-full"} />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="card p-card" aria-hidden>
      <SkeletonBlock rows={rows} />
    </div>
  );
}
