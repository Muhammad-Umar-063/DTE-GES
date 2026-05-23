"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { EngagementEventRow } from "@/lib/db-types";

const ACTION_LABEL: Record<string, string> = {
  engagement_created: "Engagement created",
  stage_transition: "Stage transition",
  approval_granted: "Approval granted",
  approval_revoked: "Approval revoked",
  escalation_created: "Engagement escalated",
  escalation_resolved: "Escalation resolved",
  gate_blocked: "Gate blocked",
  transition_blocked: "Transition blocked",
  ai_generation: "AI generation",
  document_uploaded: "Document uploaded",
  document_flagged: "Document flagged",
  packet_generated: "Packet generated",
  taxdome_sent: "Sent to TaxDome",
  hubspot_updated: "HubSpot updated",
  automation_triggered: "Automation triggered",
  automation_error: "Automation error",
};

export type ReplayModalProps = {
  open: boolean;
  engagementId: string;
  engagementCode: string;
  onClose: () => void;
};

export default function ReplayModal({
  open,
  engagementId,
  engagementCode,
  onClose,
}: ReplayModalProps) {
  const [events, setEvents] = useState<EngagementEventRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setEvents(null);
    setError(null);
    (async () => {
      try {
        const res = await fetch(
          `/api/engagement-events?engagementId=${encodeURIComponent(engagementId)}`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error("fetch failed");
        const json = (await res.json()) as { events: EngagementEventRow[] };
        if (!cancelled) setEvents(json.events);
      } catch {
        if (!cancelled) setError("Could not load events.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [engagementId, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="replay-title"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div className="relative card max-w-2xl w-[92vw] max-h-[80vh] flex flex-col shadow-card-hover p-0 overflow-hidden">
        <div className="flex items-center justify-between px-card py-3 border-b border-border">
          <h2 id="replay-title" className="text-section-title">
            Replay — <span className="text-mono">{engagementCode}</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-text-secondary hover:text-text-primary transition"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-card py-3">
          {error && <p className="text-body text-red">{error}</p>}
          {!events && !error && (
            <p className="text-body text-text-muted">Loading…</p>
          )}
          {events && events.length === 0 && (
            <p className="text-body text-text-muted">No events to replay.</p>
          )}
          {events && events.length > 0 && (
            <ol className="relative pl-5">
              <span
                aria-hidden
                className="absolute left-1.5 top-2 bottom-2 w-px bg-border"
              />
              {events.map((e) => (
                <li key={e.event_id} className="relative py-2.5">
                  <span
                    aria-hidden
                    className={
                      "absolute -left-[14px] top-3.5 w-2 h-2 rounded-full " +
                      (e.action_type === "gate_blocked" ||
                      e.action_type === "transition_blocked"
                        ? "bg-amber"
                        : e.action_type === "escalation_created"
                          ? "bg-red"
                          : e.action_type === "approval_granted"
                            ? "bg-green"
                            : "bg-primary")
                    }
                  />
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-card-title text-text-primary">
                        {ACTION_LABEL[e.action_type] ?? e.action_type}
                      </div>
                      {(e.from_state || e.to_state) && (
                        <div className="text-mono mt-0.5 text-text-secondary">
                          {(e.from_state ?? "—") + " → " + (e.to_state ?? "—")}
                        </div>
                      )}
                      {e.notes && (
                        <p className="text-body mt-1">{e.notes}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-label">{e.user_role}</div>
                      <div className="text-label mt-0.5 text-mono">
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
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
