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
        value={counts.active}
        label={`${counts.active === 1 ? "Active engagement" : "Active engagements"}`}
        sublabel="Currently in progress"
        color="primary"
      />
      <StatCard
        value={counts.awaitingApproval}
        label="Awaiting your approval"
        sublabel={
          counts.awaitingApproval > 0
            ? "Approval gate blocked"
            : "Nothing waiting — you're clear"
        }
        color="amber"
        pulse={counts.awaitingApproval > 0}
      />
      <StatCard
        value={counts.escalated}
        label={`${counts.escalated === 1 ? "Active escalation" : "Active escalations"}`}
        sublabel={
          counts.escalated > 0 ? "Require resolution" : "All moving normally"
        }
        color="red"
      />
      <StatCard
        value={counts.releasedThisWeek}
        label="Released this week"
        sublabel="Packets delivered"
        color="green"
      />
    </div>
  );
}
