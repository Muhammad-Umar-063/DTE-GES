import StatCard from "@/components/StatCard";
import { createClient } from "@/lib/supabase/server";

// ─────────────────────────────────────────────────────────────
// Phase 4: Realtime — subscribe to engagements changes and recompute.
// ─────────────────────────────────────────────────────────────

export default async function StatRow({ className }: { className?: string }) {
  const supabase = createClient();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [active, awaitingApproval, escalated, releasedThisWeek] = await Promise.all([
    supabase
      .from("engagements")
      .select("*", { count: "exact", head: true })
      .not("current_state", "in", "(RELEASED,ARCHIVED)"),
    supabase
      .from("engagements")
      .select("*", { count: "exact", head: true })
      .eq("current_state", "REVIEW_REQUIRED")
      .is("cpa_approval_id", null),
    supabase
      .from("engagements")
      .select("*", { count: "exact", head: true })
      .eq("current_state", "ESCALATED"),
    supabase
      .from("engagements")
      .select("*", { count: "exact", head: true })
      .eq("current_state", "RELEASED")
      .gte("updated_at", sevenDaysAgo),
  ]);

  const awaiting = awaitingApproval.count ?? 0;

  return (
    <div
      className={
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-card " +
        (className ?? "")
      }
    >
      <StatCard
        value={active.count ?? 0}
        label="Active engagements"
        sublabel="Currently in progress"
        color="primary"
      />
      <StatCard
        value={awaiting}
        label="Awaiting your approval"
        sublabel="Approval gate blocked"
        color="amber"
        pulse={awaiting > 0}
      />
      <StatCard
        value={escalated.count ?? 0}
        label="Active escalations"
        sublabel="Require resolution"
        color="red"
      />
      <StatCard
        value={releasedThisWeek.count ?? 0}
        label="Released this week"
        sublabel="Packets delivered"
        color="green"
      />
    </div>
  );
}
