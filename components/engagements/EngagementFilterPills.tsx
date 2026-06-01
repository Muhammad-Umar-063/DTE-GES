"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export type FilterKey =
  | "all"
  | "needs-approval"
  | "escalated"
  | "in-execution"
  | "ready-for-release";

const PILLS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "needs-approval", label: "Waiting on me" },
  { key: "escalated", label: "Needs attention" },
  { key: "in-execution", label: "Work in progress" },
  { key: "ready-for-release", label: "Ready to send" },
];

export default function EngagementFilterPills({
  className,
}: {
  className?: string;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const current = (params.get("filter") as FilterKey | null) ?? "all";

  return (
    <div
      className={"inline-flex items-center flex-wrap gap-1 " + (className ?? "")}
      role="tablist"
      aria-label="Engagement filter"
    >
      {PILLS.map((p) => {
        const active = p.key === current;
        const search = new URLSearchParams(params.toString());
        if (p.key === "all") search.delete("filter");
        else search.set("filter", p.key);
        const href = pathname + (search.toString() ? "?" + search.toString() : "");
        return (
          <Link
            key={p.key}
            href={href}
            role="tab"
            aria-selected={active}
            className={
              "inline-flex items-center px-3 py-1 rounded-pill text-badge uppercase tracking-wide transition " +
              (active
                ? "bg-primary text-white"
                : "bg-surface-2 text-text-secondary hover:bg-surface-3")
            }
          >
            {p.label}
          </Link>
        );
      })}
    </div>
  );
}
