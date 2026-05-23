import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isToday, isYesterday, relativeTime } from "@/lib/time";
import type { EngagementEventRow } from "@/lib/db-types";

// ─────────────────────────────────────────────────────────────
// Phase 4: Realtime — subscribe to engagement_events INSERTs and prepend.
// ─────────────────────────────────────────────────────────────

const DOT_COLOR: Record<string, string> = {
  engagement_created: "bg-primary",
  stage_transition: "bg-primary",
  approval_granted: "bg-green",
  approval_revoked: "bg-amber",
  escalation_created: "bg-red",
  escalation_resolved: "bg-green",
  gate_blocked: "bg-amber",
  transition_blocked: "bg-amber",
  ai_generation: "bg-purple",
  document_uploaded: "bg-primary",
  document_flagged: "bg-amber",
  packet_generated: "bg-purple",
  taxdome_sent: "bg-green",
  hubspot_updated: "bg-green",
  automation_triggered: "bg-primary",
  automation_error: "bg-red",
};

// Plain-English description with the actor + client name.
function describe(
  e: EngagementEventRow,
  actorName: string | null,
  clientName: string,
): string {
  const actor = actorName ?? (e.user_role ? e.user_role : "Someone");
  switch (e.action_type) {
    case "engagement_created":
      return `${actor} created the ${clientName} engagement`;
    case "stage_transition":
      return `${actor} moved ${clientName} to ${e.to_state}`;
    case "approval_granted":
      return `${actor} approved ${clientName}`;
    case "approval_revoked":
      return `${actor} revoked approval on ${clientName}`;
    case "escalation_created":
      return `${actor} escalated ${clientName}`;
    case "escalation_resolved":
      return `${actor} resolved the ${clientName} escalation`;
    case "gate_blocked":
      return `Gate blocked: ${clientName} approval missing`;
    case "transition_blocked":
      return `Blocked transition on ${clientName}`;
    case "ai_generation":
      return `AI generated content for ${clientName}`;
    case "document_uploaded":
      return `Document uploaded for ${clientName}`;
    case "document_flagged":
      return `Document flagged on ${clientName}`;
    case "packet_generated":
      return `Runtime packet generated for ${clientName}`;
    case "taxdome_sent":
      return `${clientName} packet sent to TaxDome`;
    case "hubspot_updated":
      return `${clientName} CRM record updated`;
    case "automation_triggered":
      return `Automation triggered on ${clientName}`;
    case "automation_error":
      return `Automation error on ${clientName}`;
    default:
      return `${actor} acted on ${clientName}`;
  }
}

export default async function RecentActivity({
  className,
}: {
  className?: string;
}) {
  const supabase = createClient();
  const { data: evts } = await supabase
    .from("engagement_events")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(8);
  const events = (evts ?? []) as EngagementEventRow[];

  // Side fetch: map engagement_id -> client_name + engagement_id code.
  const engagementIds = Array.from(new Set(events.map((e) => e.engagement_id)));
  const { data: engs } = await supabase
    .from("engagements")
    .select("id, client_name, engagement_id")
    .in("id", engagementIds.length > 0 ? engagementIds : ["00000000-0000-0000-0000-000000000000"]);
  const engMap = new Map(
    (engs ?? []).map((e) => [
      e.id as string,
      { name: e.client_name as string, code: e.engagement_id as string },
    ]),
  );

  // Side fetch: map user_id -> full_name.
  const userIds = Array.from(
    new Set(events.map((e) => e.user_id).filter((x): x is string => !!x)),
  );
  const { data: users } = await supabase
    .from("users")
    .select("id, full_name")
    .in("id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]);
  const userMap = new Map(
    (users ?? []).map((u) => [u.id as string, (u.full_name as string) ?? null]),
  );

  // Group: Today / Yesterday / Earlier.
  const groups: Array<{ label: string; items: EngagementEventRow[] }> = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Earlier", items: [] },
  ];
  for (const e of events) {
    if (isToday(e.timestamp)) groups[0]!.items.push(e);
    else if (isYesterday(e.timestamp)) groups[1]!.items.push(e);
    else groups[2]!.items.push(e);
  }

  return (
    <aside
      className={
        "w-full lg:w-[280px] lg:flex-shrink-0 card " + (className ?? "")
      }
    >
      <h3 className="text-card-title mb-3">Recent activity</h3>
      {events.length === 0 ? (
        <p className="text-body text-text-muted text-center py-2">
          No activity yet.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((g) =>
            g.items.length === 0 ? null : (
              <div key={g.label}>
                <div className="text-label mb-1.5">{g.label}</div>
                <ul className="flex flex-col gap-2.5">
                  {g.items.map((e) => {
                    const meta = engMap.get(e.engagement_id);
                    const desc = describe(
                      e,
                      e.user_id ? userMap.get(e.user_id) ?? null : null,
                      meta?.name ?? "an engagement",
                    );
                    return (
                      <li key={e.event_id} className="flex items-start gap-2">
                        <span
                          aria-hidden
                          className={
                            "mt-1.5 w-2 h-2 rounded-full flex-shrink-0 " +
                            (DOT_COLOR[e.action_type] ?? "bg-text-muted")
                          }
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-body text-text-primary leading-snug">
                            {desc}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {meta && (
                              <Link
                                href={`/engagements/${e.engagement_id}`}
                                className="text-mono text-text-muted hover:text-primary"
                              >
                                {meta.code}
                              </Link>
                            )}
                            <span className="text-label">
                              {relativeTime(e.timestamp)}
                            </span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ),
          )}
        </div>
      )}
    </aside>
  );
}
