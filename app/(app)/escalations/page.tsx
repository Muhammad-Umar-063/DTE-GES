import { CheckCircle2 } from "lucide-react";
import PageHeader from "@/components/shell/PageHeader";
import EmptyState from "@/components/EmptyState";
import RealtimeRefresher from "@/components/RealtimeRefresher";
import EscalationCard from "@/components/escalations/EscalationCard";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getAvailableTransitions } from "@/lib/workflow";
import type { DocumentRow, EngagementEventRow, EngagementRow } from "@/lib/db-types";
import type { EngagementState } from "@/lib/supabase/database.types";

export const metadata = { title: "Escalations — DTE GES" };

const RETURN_OPTIONS: EngagementState[] = getAvailableTransitions("ESCALATED").map(
  (t) => t.toState as EngagementState,
);

export default async function EscalationsPage() {
  const session = await getSession();
  const supabase = createClient();

  const { data: engs } = await supabase
    .from("engagements")
    .select("*")
    .eq("current_state", "ESCALATED")
    .order("updated_at", { ascending: false });
  const items = (engs ?? []) as EngagementRow[];

  if (items.length === 0) {
    return (
      <>
        <RealtimeRefresher table="engagements" />
        <PageHeader
          title="Escalations"
          subtitle="Engagements that are flagged and need someone to look at them."
        />
        <div className="card">
          <EmptyState
            icon={CheckCircle2}
            title="No active escalations — everything's moving normally."
          />
        </div>
      </>
    );
  }

  // Side fetch: missing documents + last escalation_created (for default return) per engagement.
  const ids = items.map((e) => e.id);
  const [docsRes, escRes] = await Promise.all([
    supabase
      .from("documents")
      .select("engagement_id, document_name, status")
      .in("engagement_id", ids)
      .eq("status", "missing"),
    supabase
      .from("engagement_events")
      .select("engagement_id, from_state, timestamp")
      .in("engagement_id", ids)
      .eq("action_type", "escalation_created"),
  ]);
  const missingByEng = new Map<string, string[]>();
  for (const d of (docsRes.data ?? []) as Array<
    Pick<DocumentRow, "engagement_id" | "document_name" | "status">
  >) {
    const arr = missingByEng.get(d.engagement_id) ?? [];
    arr.push(d.document_name);
    missingByEng.set(d.engagement_id, arr);
  }

  // Pick the LATEST escalation_created per engagement.
  const lastEscByEng = new Map<string, EngagementState>();
  for (const e of (escRes.data ?? []) as Array<
    Pick<EngagementEventRow, "engagement_id" | "from_state" | "timestamp">
  >) {
    const prev = lastEscByEng.get(e.engagement_id);
    if (!prev && e.from_state) {
      lastEscByEng.set(e.engagement_id, e.from_state as EngagementState);
    }
  }

  return (
    <>
      <RealtimeRefresher table="engagements" />
      <PageHeader
        title="Escalations"
        subtitle={
          items.length === 1
            ? "1 engagement is flagged and needs you to take a look."
            : `${items.length} engagements are flagged and need you to take a look.`
        }
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-section">
        {items.map((eng, idx) => (
          <EscalationCard
            key={eng.id}
            engagement={eng}
            returnOptions={RETURN_OPTIONS}
            defaultReturnState={
              lastEscByEng.get(eng.id) ?? RETURN_OPTIONS[1] ?? "EVIDENCE_UNDER_REVIEW"
            }
            missingDocs={missingByEng.get(eng.id) ?? []}
            viewerRole={session?.role ?? "staff"}
            className={`stagger-${Math.min(idx + 1, 6)}`}
          />
        ))}
      </div>
    </>
  );
}
