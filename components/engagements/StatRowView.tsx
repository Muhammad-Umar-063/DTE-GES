"use client";

import { useCallback, useState } from "react";
import StatCard from "@/components/StatCard";
import { useRealtimeChannel } from "@/lib/hooks/useRealtimeChannel";
import type { DashboardCounts } from "@/lib/data/engagements";

export default function StatRowView({
  initialCounts,
  className,
}: {
  initialCounts: DashboardCounts;
  className?: string;
}) {
  const [counts, setCounts] = useState(initialCounts);

  const refetch = useCallback(async () => {
    const res = await fetch("/api/dashboard-stats", { cache: "no-store" });
    if (!res.ok) return;
    const json = (await res.json()) as { counts: DashboardCounts };
    setCounts(json.counts);
  }, []);

  // Engagements drive every stat (active, awaiting, escalated, releasedThisWeek).
  useRealtimeChannel({
    table: "engagements",
    onChange: () => {
      void refetch();
    },
  });

  // Approvals affect "awaiting your approval" (cpa_approval_id flips).
  useRealtimeChannel({
    table: "engagement_approvals",
    onChange: () => {
      void refetch();
    },
  });

  return (
    <div
      className={
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-card " +
        (className ?? "")
      }
    >
      <StatCard
        className="animate-content-reveal stagger-1"
        value={counts.active}
        label={`${counts.active === 1 ? "Active engagement" : "Active engagements"}`}
        sublabel="In progress right now"
        color="primary"
      />
      <StatCard
        className="animate-content-reveal stagger-2"
        value={counts.awaitingApproval}
        label="Waiting on me"
        sublabel={
          counts.awaitingApproval > 0
            ? "Engagements need your approval"
            : "Nothing waiting on you"
        }
        color="amber"
        pulse={counts.awaitingApproval > 0}
      />
      <StatCard
        className="animate-content-reveal stagger-3"
        value={counts.escalated}
        label="Flagged"
        sublabel={
          counts.escalated > 0
            ? "Engagements need attention"
            : "Everything's moving normally"
        }
        color="red"
      />
      <StatCard
        className="animate-content-reveal stagger-4"
        value={counts.releasedThisWeek}
        label="Sent this week"
        sublabel="Engagements delivered to clients"
        color="green"
      />
    </div>
  );
}
