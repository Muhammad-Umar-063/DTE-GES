"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertTriangle, ChevronRight } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import EngagementStateBadge from "@/components/EngagementStateBadge";
import { useToast } from "@/components/toast/ToastProvider";
import { STATE_DISPLAY, getServiceLineName } from "@/lib/workflow";
import type { EngagementRow } from "@/lib/db-types";
import type { EngagementState } from "@/lib/supabase/database.types";

const ERROR_COPY: Record<string, string> = {
  invalid_transition: "This transition is not permitted from the current state.",
  insufficient_role: "You do not have permission to perform this action.",
  network: "Connection issue. Please try again.",
  server_error:
    "Something went wrong. The action was not completed. Please try again.",
};

export type EscalationCardProps = {
  engagement: EngagementRow;
  /** Valid return states (workflow_transitions.from_state = ESCALATED). */
  returnOptions: EngagementState[];
  /** Preselected option — typically the engagement's pre-escalation state. */
  defaultReturnState: EngagementState;
  missingDocs: string[];
  viewerRole: "cpa" | "staff" | "admin";
  className?: string;
};

export default function EscalationCard({
  engagement,
  returnOptions,
  defaultReturnState,
  missingDocs,
  viewerRole,
  className,
}: EscalationCardProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [toState, setToState] = useState<EngagementState>(defaultReturnState);
  const [notes, setNotes] = useState("");
  const [dismissed, setDismissed] = useState(false);

  async function resolve() {
    setPending(true);
    try {
      const res = await fetch("/api/transition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          engagementId: engagement.id,
          toState,
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        showToast({
          message:
            body.message ?? ERROR_COPY[body.error as string] ?? ERROR_COPY.server_error,
          type: "error",
        });
        return;
      }
      showToast({
        message: `Escalation resolved — ${engagement.client_name} returned to ${STATE_DISPLAY[toState].label}.`,
        type: "success",
      });
      setDismissed(true);
      setTimeout(() => router.refresh(), 250);
    } catch {
      showToast({ message: ERROR_COPY.network, type: "error" });
    } finally {
      setPending(false);
      setOpen(false);
    }
  }

  if (dismissed) return null;

  const isAllowed = viewerRole === "cpa" || viewerRole === "staff";

  return (
    <div
      className={
        "card border-l-4 border-l-red transition-all duration-200 " +
        (className ?? "")
      }
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="text-section-title text-text-primary">
            {engagement.client_name}
          </h3>
          <div className="text-mono text-text-muted mt-0.5">
            {engagement.engagement_id}
            <span className="mx-2">·</span>
            <span className="font-bold">{engagement.service_line}</span>{" "}
            {getServiceLineName(engagement.service_line)}
          </div>
        </div>
        <EngagementStateBadge state={engagement.current_state} />
      </div>

      {engagement.escalation_reason && (
        <div className="rounded-card border border-red/30 bg-red-light p-3 mb-3">
          <div className="flex items-start gap-2">
            <AlertTriangle
              className="w-4 h-4 text-red flex-shrink-0 mt-0.5"
              aria-hidden
            />
            <p className="text-body text-red leading-snug">
              {engagement.escalation_reason}
            </p>
          </div>
        </div>
      )}

      {missingDocs.length > 0 && (
        <div className="mb-3">
          <div className="text-label mb-1.5">Documents missing</div>
          <ul className="flex flex-col gap-1">
            {missingDocs.map((d) => (
              <li key={d} className="flex items-center gap-2">
                <span aria-hidden className="w-2 h-2 rounded-full bg-red" />
                <span className="text-body text-text-secondary">{d}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={!isAllowed || pending}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-button bg-red text-white text-card-title hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          <AlertTriangle className="w-4 h-4" aria-hidden /> Resolve Escalation
        </button>
        <Link
          href={`/engagements/${engagement.id}`}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-button border border-border bg-surface text-text-primary text-card-title hover:bg-surface-2 transition"
        >
          View Engagement <ChevronRight className="w-4 h-4" aria-hidden />
        </Link>
      </div>

      <ConfirmDialog
        open={open}
        title={`Resolve escalation — ${engagement.client_name}`}
        confirmLabel={`Resolve and Return to ${STATE_DISPLAY[toState].label}`}
        cancelLabel="Cancel"
        onConfirm={async () => {
          await resolve();
        }}
        onClose={() => setOpen(false)}
      >
        <div className="flex flex-col gap-3">
          <div>
            <label htmlFor="return-state" className="text-label block mb-1.5">
              Return to state
            </label>
            <select
              id="return-state"
              value={toState}
              onChange={(e) => setToState(e.target.value as EngagementState)}
              className="w-full px-3 py-2 text-body text-text-primary bg-surface border border-border rounded-input focus:outline-none focus:border-primary"
            >
              {returnOptions.map((s) => (
                <option key={s} value={s}>
                  {STATE_DISPLAY[s].label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="resolution-notes" className="text-label block mb-1.5">
              Resolution notes (optional)
            </label>
            <textarea
              id="resolution-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-body text-text-primary bg-surface border border-border rounded-input focus:outline-none focus:border-primary resize-y"
            />
          </div>
        </div>
      </ConfirmDialog>
    </div>
  );
}
