import Link from "next/link";
import { Sparkles } from "lucide-react";
import PageHeader from "@/components/shell/PageHeader";
import EmptyState from "@/components/EmptyState";
import AuditFilters from "@/components/audit/AuditFilters";
import { createClient } from "@/lib/supabase/server";
import type { EngagementEventRow, EngagementRow } from "@/lib/db-types";

export const metadata = { title: "Audit — DTE GES" };

const ACTION_OPTIONS = [
  "engagement_created",
  "stage_transition",
  "approval_granted",
  "approval_revoked",
  "escalation_created",
  "escalation_resolved",
  "gate_blocked",
  "transition_blocked",
  "ai_generation",
  "document_uploaded",
  "document_flagged",
  "packet_generated",
  "taxdome_sent",
  "hubspot_updated",
  "automation_triggered",
  "automation_error",
];

const ROLE_OPTIONS = ["cpa", "staff", "admin"];

const DENIAL_ACTIONS = new Set(["gate_blocked", "transition_blocked"]);

export default async function AuditPage({
  searchParams,
}: {
  searchParams: {
    engagement?: string;
    action?: string;
    role?: string;
    from?: string;
    to?: string;
  };
}) {
  const supabase = createClient();

  let query = supabase
    .from("engagement_events")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(500);

  if (searchParams.engagement) {
    query = query.eq("engagement_id", searchParams.engagement);
  }
  if (searchParams.action) {
    query = query.eq("action_type", searchParams.action);
  }
  if (searchParams.role) {
    query = query.eq("user_role", searchParams.role);
  }
  if (searchParams.from) {
    query = query.gte("timestamp", new Date(searchParams.from).toISOString());
  }
  if (searchParams.to) {
    const end = new Date(searchParams.to);
    end.setHours(23, 59, 59, 999);
    query = query.lte("timestamp", end.toISOString());
  }

  const [{ data: evtData }, { data: engData }] = await Promise.all([
    query,
    supabase
      .from("engagements")
      .select("id, engagement_id, client_name")
      .order("engagement_id"),
  ]);
  const events = (evtData ?? []) as EngagementEventRow[];
  const engagements = (engData ?? []) as Pick<
    EngagementRow,
    "id" | "engagement_id" | "client_name"
  >[];
  const engMap = new Map(engagements.map((e) => [e.id, e.engagement_id]));

  return (
    <>
      <PageHeader
        title="Audit Trail"
        subtitle="Every transition, every approval, every override — immutable."
      />

      <div className="mb-section rounded-card border border-red/30 bg-red-light px-3 py-2">
        <p className="text-body text-red font-semibold">
          APPEND ONLY — No UPDATE or DELETE permission for any role
        </p>
      </div>

      <AuditFilters
        className="mb-section"
        engagementOptions={engagements.map((e) => ({
          id: e.id,
          label: `${e.engagement_id} — ${e.client_name}`,
        }))}
        actionOptions={ACTION_OPTIONS}
        roleOptions={ROLE_OPTIONS}
      />

      {events.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No events match these filters"
            description="Adjust or clear the filters above to see more."
          />
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-body">
              <thead>
                <tr className="bg-surface-2 text-label">
                  <th className="px-card py-2.5 text-left font-bold">Timestamp</th>
                  <th className="px-card py-2.5 text-left font-bold">Role</th>
                  <th className="px-card py-2.5 text-left font-bold">Action</th>
                  <th className="px-card py-2.5 text-left font-bold">Engagement</th>
                  <th className="px-card py-2.5 text-left font-bold">From</th>
                  <th className="px-card py-2.5 text-left font-bold">To</th>
                  <th className="px-card py-2.5 text-left font-bold">AI</th>
                  <th className="px-card py-2.5 text-left font-bold">Notes</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => {
                  const engCode = engMap.get(e.engagement_id);
                  return (
                    <tr key={e.event_id} className="border-t border-border hover:bg-blue-light/40 transition">
                      <td className="px-card py-2 align-middle text-mono whitespace-nowrap">
                        {new Date(e.timestamp).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-card py-2 align-middle">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-pill bg-surface-2 text-text-secondary text-badge uppercase tracking-wide">
                          {e.user_role}
                        </span>
                      </td>
                      <td className="px-card py-2 align-middle">
                        <span
                          className={
                            "text-mono " +
                            (DENIAL_ACTIONS.has(e.action_type)
                              ? "text-amber"
                              : "text-text-primary")
                          }
                        >
                          {e.action_type}
                        </span>
                      </td>
                      <td className="px-card py-2 align-middle">
                        {engCode ? (
                          <Link
                            href={`/engagements/${e.engagement_id}`}
                            className="text-mono text-primary hover:underline"
                          >
                            {engCode}
                          </Link>
                        ) : (
                          <span className="text-mono text-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-card py-2 align-middle text-mono text-text-secondary">
                        {e.from_state ?? "—"}
                      </td>
                      <td className="px-card py-2 align-middle text-mono text-text-secondary">
                        {e.to_state ?? "—"}
                      </td>
                      <td className="px-card py-2 align-middle">
                        {e.ai_assisted ? (
                          <span className="inline-flex items-center gap-1 text-badge text-purple bg-purple-light px-1.5 py-0.5 rounded-tag uppercase">
                            <Sparkles className="w-2.5 h-2.5" aria-hidden /> AI
                          </span>
                        ) : null}
                      </td>
                      <td className="px-card py-2 align-middle">
                        <span className="text-body text-text-secondary line-clamp-2">
                          {e.notes ?? ""}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
