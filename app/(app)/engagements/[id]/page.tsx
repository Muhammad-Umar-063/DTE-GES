import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ChevronLeft, Sparkles } from "lucide-react";
import DocumentInventory from "@/components/DocumentInventory";
import RealtimeRefresher from "@/components/RealtimeRefresher";
import EngagementStateBadge from "@/components/EngagementStateBadge";
import PhaseProgressBar from "@/components/PhaseProgressBar";
import RuntimePacket from "@/components/RuntimePacket";
import WorkflowControls from "@/components/WorkflowControls";
import PermanentRecordBadge from "@/components/PermanentRecordBadge";
import EngagementInfo from "@/components/engagements/EngagementInfo";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  describeStateChange,
  getFriendlyActionLabel,
  getServiceLineName,
} from "@/lib/workflow";
import type {
  DocumentRow,
  EngagementEventRow,
  EngagementRow,
} from "@/lib/db-types";
import type { EngagementState } from "@/lib/supabase/database.types";

export const metadata = { title: "Engagement — DTE GES" };

export default async function EngagementDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSession();
  if (!session) notFound();

  const supabase = createClient();
  const { data: engRow } = await supabase
    .from("engagements")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!engRow) notFound();
  const engagement = engRow as EngagementRow;

  // CPA name lookup.
  let cpaName: string | null = null;
  if (engagement.cpa_id) {
    const { data: cpa } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", engagement.cpa_id)
      .maybeSingle();
    cpaName = (cpa?.full_name as string | undefined) ?? null;
  }

  // Documents — quick count for the "missing required documents" warning.
  const { data: docs } = await supabase
    .from("documents")
    .select("status")
    .eq("engagement_id", engagement.id);
  const docRows = (docs ?? []) as Pick<DocumentRow, "status">[];
  const missingCount = docRows.filter((d) => d.status === "missing").length;

  // Previous-state lookup for ESCALATED engagements.
  let previousState: EngagementState | null = null;
  if (engagement.current_state === "ESCALATED") {
    const { data: lastEsc } = await supabase
      .from("engagement_events")
      .select("from_state, timestamp")
      .eq("engagement_id", engagement.id)
      .eq("action_type", "escalation_created")
      .order("timestamp", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastEsc?.from_state) {
      previousState = lastEsc.from_state as EngagementState;
    }
  }

  const hasApproval = !!engagement.cpa_approval_id;
  const isEscalated = engagement.current_state === "ESCALATED";
  // Show the "missing required documents" warning only when there is an outstanding doc
  // AND the engagement is in a state that's trying to advance past evidence.
  const advancingStates = new Set<EngagementState>([
    "READY_FOR_EXECUTION",
    "EXECUTION_ACTIVE",
    "REVIEW_REQUIRED",
    "APPROVED",
    "RELEASE_READY",
  ]);
  const showMissingDocsWarning =
    missingCount > 0 &&
    advancingStates.has(engagement.current_state as EngagementState);

  return (
    <>
      <RealtimeRefresher
        table="engagements"
        filter={`id=eq.${engagement.id}`}
      />
      <RealtimeRefresher
        table="engagement_events"
        filter={`engagement_id=eq.${engagement.id}`}
      />
      <RealtimeRefresher
        table="engagement_approvals"
        filter={`engagement_id=eq.${engagement.id}`}
      />
      <Link
        href="/engagements"
        className="inline-flex items-center gap-1 text-body text-text-secondary hover:text-primary mb-3"
      >
        <ChevronLeft className="w-3.5 h-3.5" aria-hidden /> Back to engagements
      </Link>

      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0">
          <h1 className="text-page-title">{engagement.client_name}</h1>
          <p className="text-body text-text-secondary mt-1">
            {getServiceLineName(engagement.service_line)}
            <span className="mx-2 text-text-muted">·</span>
            CPA: {cpaName ?? "—"}
            <span className="mx-2 text-text-muted">·</span>
            <span className="text-mono text-text-muted">
              {engagement.engagement_id}
            </span>
          </p>
        </div>
        <EngagementStateBadge state={engagement.current_state} className="text-sm" />
      </div>

      {isEscalated && (
        <div className="rounded-card border border-red/30 bg-red-light p-3 mb-section">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red flex-shrink-0 mt-0.5" aria-hidden />
            <p className="text-body text-red leading-snug">
              This engagement needs attention. Resolve the issue before continuing.
            </p>
          </div>
        </div>
      )}

      <div className="card mb-section animate-content-reveal stagger-1">
        <PhaseProgressBar
          state={engagement.current_state}
          phase={engagement.current_phase}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-section">
        <div className="lg:col-span-3 flex flex-col gap-section">
          <div className="animate-content-reveal stagger-3">
            <EngagementInfo engagement={engagement} cpaName={cpaName} />
          </div>

          <div className="animate-content-reveal stagger-4">
            <DocumentInventory engagementId={engagement.id} />
            {showMissingDocsWarning && (
              <div className="mt-2 rounded-card border border-red/30 bg-red-light px-3 py-2">
                <p className="text-body text-red">
                  Some documents are still missing. Resolve before continuing.
                </p>
              </div>
            )}
          </div>

          <div className="animate-content-reveal stagger-5">
            <RuntimePacket engagementId={engagement.id} />
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-section">
          <div className="animate-content-reveal stagger-2">
            <WorkflowControls
              engagementId={engagement.id}
              currentState={engagement.current_state}
              hasApproval={hasApproval}
              viewerRole={session.role}
              previousStateBeforeEscalation={previousState}
            />
          </div>
          <div className="animate-content-reveal stagger-4">
            <AuditLogCard engagementId={engagement.id} />
          </div>
        </div>
      </div>
    </>
  );
}

function AuditLogCard({ engagementId }: { engagementId: string }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h3 className="text-card-title">Audit log</h3>
        <PermanentRecordBadge />
      </div>
      <AuditLogInner engagementId={engagementId} />
    </div>
  );
}

// We wrap <AuditLog> here so its outer "card" wrapper doesn't double up with the page card.
function AuditLogInner({ engagementId }: { engagementId: string }) {
  return (
    <div className="-mx-card -mb-card">
      <div className="p-card pt-0">
        <RawEventList engagementId={engagementId} />
      </div>
    </div>
  );
}

// Server-side fetch + render of history rows without the card wrapper.
async function RawEventList({ engagementId }: { engagementId: string }) {
  const supabase = createClient();
  const { data } = await supabase
    .from("engagement_events")
    .select("*")
    .eq("engagement_id", engagementId)
    .order("timestamp", { ascending: false })
    .limit(50);
  const events = (data ?? []) as EngagementEventRow[];

  if (events.length === 0) {
    return (
      <p className="text-body text-text-muted text-center py-4">
        Nothing has happened yet on this engagement.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-0">
      {events.map((e, idx) => {
        const denial =
          e.action_type === "gate_blocked" ||
          e.action_type === "transition_blocked";
        const stateChange = describeStateChange(e.from_state, e.to_state);
        return (
          <li
            key={e.event_id}
            className={
              "py-2.5 " +
              (idx > 0 ? "border-t border-border " : "bg-blue-light/40 -mx-card px-card rounded-tag ") +
              "animate-[fadeIn_.2s_ease-out]"
            }
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={
                      "text-card-title " +
                      (denial ? "text-amber" : "text-text-primary")
                    }
                  >
                    {getFriendlyActionLabel(e.action_type)}
                  </span>
                  {e.ai_assisted && (
                    <span className="inline-flex items-center gap-1 text-badge text-purple bg-purple-light px-1.5 py-0.5 rounded-tag uppercase">
                      <Sparkles className="w-2.5 h-2.5" aria-hidden /> AI
                    </span>
                  )}
                </div>
                {stateChange && (
                  <div className="text-body text-text-secondary mt-0.5">
                    {stateChange}
                  </div>
                )}
                {e.notes && (
                  <p className="text-body mt-1 line-clamp-2">{e.notes}</p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-label">{e.user_role}</div>
                <div className="text-label mt-0.5 text-text-muted">
                  {new Date(e.timestamp).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
