import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { describeStateChange, getFriendlyActionLabel } from "@/lib/workflow";
import type { EngagementEventRow } from "@/lib/db-types";

const DENIAL_ACTIONS = new Set(["gate_blocked", "transition_blocked"]);

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type AuditLogProps = {
  engagementId: string;
  limit?: number;
  className?: string;
};

export default async function AuditLog({
  engagementId,
  limit = 25,
  className,
}: AuditLogProps) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("engagement_events")
    .select("*")
    .eq("engagement_id", engagementId)
    .order("timestamp", { ascending: false })
    .limit(limit);

  if (error) {
    return (
      <div className={"card " + (className ?? "")}>
        <p className="text-body text-red">Failed to load audit trail.</p>
      </div>
    );
  }

  const events = (data ?? []) as EngagementEventRow[];

  return (
    <div className={"card " + (className ?? "")}>
      <h3 className="text-card-title mb-3">Audit Trail</h3>
      {events.length === 0 ? (
        <p className="text-body text-text-muted text-center py-4">
          Nothing has happened yet on this engagement.
        </p>
      ) : (
        <ol className="flex flex-col gap-0">
          {events.map((e, idx) => {
            const stateChange = describeStateChange(e.from_state, e.to_state);
            return (
              <li
                key={e.event_id}
                className={
                  "py-2.5 " +
                  (idx > 0 ? "border-t border-border " : "") +
                  "animate-[fadeIn_.2s_ease-out]"
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={
                          "text-card-title " +
                          (DENIAL_ACTIONS.has(e.action_type) ? "text-amber" : "text-text-primary")
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
                    <div className="text-label mt-0.5 text-text-muted">{fmtTime(e.timestamp)}</div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
