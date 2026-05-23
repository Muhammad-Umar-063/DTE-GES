// Shared engagement-fetch logic used by:
//   - the server component initial render (EngagementTable),
//   - the /api/engagements endpoint that drives realtime refetches,
//   - the dashboard stats endpoint.
// Keeping it in one place stops the SQL filter logic from drifting between
// SSR and CSR.
import { createClient } from "@/lib/supabase/server";
import type { EngagementRow } from "@/lib/db-types";
import type { FilterKey } from "@/components/engagements/EngagementFilterPills";

export type EngagementScope = "active" | "all";

export async function fetchEngagements(opts: {
  scope: EngagementScope;
  filter: FilterKey;
}): Promise<EngagementRow[]> {
  const supabase = createClient();

  let query = supabase
    .from("engagements")
    .select("*")
    .order("updated_at", { ascending: false });

  if (opts.scope === "active") {
    query = query.not("current_state", "in", "(RELEASED,ARCHIVED)");
  }

  switch (opts.filter) {
    case "needs-approval":
      query = query
        .eq("current_state", "REVIEW_REQUIRED")
        .is("cpa_approval_id", null);
      break;
    case "escalated":
      query = query.eq("current_state", "ESCALATED");
      break;
    case "in-execution":
      query = query.in("current_state", ["EXECUTION_ACTIVE", "READY_FOR_EXECUTION"]);
      break;
    case "ready-for-release":
      query = query.in("current_state", ["APPROVED", "RELEASE_READY"]);
      break;
    default:
      break;
  }

  const { data } = await query;
  return (data ?? []) as EngagementRow[];
}

export type DashboardCounts = {
  active: number;
  awaitingApproval: number;
  escalated: number;
  releasedThisWeek: number;
};

export async function fetchDashboardCounts(): Promise<DashboardCounts> {
  const supabase = createClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [active, awaiting, escalated, releasedWeek] = await Promise.all([
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

  return {
    active: active.count ?? 0,
    awaitingApproval: awaiting.count ?? 0,
    escalated: escalated.count ?? 0,
    releasedThisWeek: releasedWeek.count ?? 0,
  };
}
