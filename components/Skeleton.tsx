// Reusable shimmer skeletons. Calm shimmer animation — enough movement to
// read as "loading" without distraction.
export function SkeletonLine({ className }: { className?: string }) {
  return (
    <div
      className={"h-3 rounded-tag shimmer " + (className ?? "w-full")}
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

// Three-dot pulsing loader, used in places where we want a tiny "working…"
// indicator inline with content.
export function DotsLoader({
  label,
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={"inline-flex items-center gap-2 " + (className ?? "")}
      role="status"
      aria-live="polite"
    >
      <span className="dots-loader" aria-hidden>
        <span />
        <span />
        <span />
      </span>
      {label && <span className="text-body text-text-secondary">{label}</span>}
    </span>
  );
}

// Thin animated bar — for the top of a page while a route loads.
export function TopbarLoader({ className }: { className?: string }) {
  return (
    <div
      className={"topbar-loader " + (className ?? "")}
      role="progressbar"
      aria-label="Loading"
    />
  );
}
