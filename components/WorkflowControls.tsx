"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { AlertTriangle, CheckSquare, ChevronRight, Lock } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useToast } from "@/components/toast/ToastProvider";
import {
  getAvailableTransitions,
  getTransitionLabel,
  type WorkflowTransition,
} from "@/lib/workflow";
import type { EngagementState, AppRole } from "@/lib/supabase/database.types";

const IRREVERSIBLE_TARGETS = new Set<EngagementState>([
  "RELEASED",
  "ARCHIVED",
  "ROLLED_BACK",
]);

// SRS §14 — plain-English error copy by error code returned from the handler.
const ERROR_COPY: Record<string, string> = {
  invalid_transition: "This transition is not permitted from the current state.",
  insufficient_role: "You do not have permission to perform this action.",
  gate_blocked:
    "This transition is blocked by a missing approval. Grant CPA approval to continue.",
  reason_required: "A reason is required for this action.",
  network: "Connection issue. Please try again.",
  server_error:
    "Something went wrong. The action was not completed. Please try again.",
};

type EngineErrorBody = {
  error?: string;
  message?: string;
  resolution?: string;
};

export type WorkflowControlsProps = {
  engagementId: string;
  currentState: EngagementState | string;
  hasApproval: boolean;
  viewerRole: AppRole;
  className?: string;
};

export default function WorkflowControls({
  engagementId,
  currentState,
  hasApproval,
  viewerRole,
  className,
}: WorkflowControlsProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, setPending] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{
    transition: WorkflowTransition;
  } | null>(null);

  const transitions = getAvailableTransitions(currentState);
  const reviewToApprove = transitions.find(
    (t) => t.toState === "APPROVED" && t.fromState === "REVIEW_REQUIRED",
  );

  async function callTransition(
    transition: WorkflowTransition,
    reason?: string,
  ) {
    setPending(transition.toState);
    try {
      const res = await fetch("/api/transition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          engagementId,
          toState: transition.toState,
          reason,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as EngineErrorBody;
        const code = body.error ?? "server_error";
        const message =
          body.message ?? ERROR_COPY[code] ?? ERROR_COPY.server_error;
        showToast({
          message,
          type: code === "gate_blocked" ? "warning" : "error",
        });
        return;
      }
      showToast({
        message: "Transition recorded.",
        type: "success",
      });
      router.refresh();
    } catch {
      showToast({ message: ERROR_COPY.network, type: "error" });
    } finally {
      setPending(null);
      setConfirm(null);
    }
  }

  async function grantApproval() {
    setPending("APPROVE_GATE");
    try {
      const res = await fetch("/api/grant-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ engagementId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as EngineErrorBody;
        const code = body.error ?? "server_error";
        showToast({
          message:
            body.message ?? ERROR_COPY[code] ?? ERROR_COPY.server_error,
          type: "error",
        });
        return;
      }
      showToast({ message: "Approval granted.", type: "success" });
      router.refresh();
    } catch {
      showToast({ message: ERROR_COPY.network, type: "error" });
    } finally {
      setPending(null);
    }
  }

  function onClickTransition(t: WorkflowTransition) {
    const needsConfirm =
      t.requiresReason || IRREVERSIBLE_TARGETS.has(t.toState as EngagementState);
    if (needsConfirm) {
      setConfirm({ transition: t });
      return;
    }
    void callTransition(t);
  }

  const roleAllowed = (t: WorkflowTransition) =>
    t.allowedRoles.includes(viewerRole as "cpa" | "staff");

  // Special case: when in REVIEW_REQUIRED and the approval gate is unmet,
  // render the amber gate card instead of the bare approve button.
  const gateUnmet =
    currentState === "REVIEW_REQUIRED" && reviewToApprove && !hasApproval;

  return (
    <div className={"card " + (className ?? "")}>
      <h3 className="text-card-title mb-3">Workflow</h3>

      {gateUnmet && (
        <div className="rounded-card border border-amber-mid bg-amber-light p-3 mb-3">
          <div className="flex items-start gap-2">
            <Lock className="w-4 h-4 text-amber flex-shrink-0 mt-0.5" aria-hidden />
            <div>
              <div className="text-card-title text-amber">
                Approval Required
              </div>
              <p className="text-body text-amber mt-0.5">
                This engagement cannot move past CPA review until a CPA approval
                is recorded.
              </p>
              {viewerRole === "cpa" ? (
                <button
                  type="button"
                  onClick={grantApproval}
                  disabled={pending !== null}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-button bg-amber text-white text-card-title hover:opacity-95 disabled:opacity-60 transition"
                >
                  <CheckSquare className="w-3.5 h-3.5" aria-hidden />
                  {pending === "APPROVE_GATE" ? "Granting…" : "Grant CPA Approval"}
                </button>
              ) : (
                <p className="text-label mt-2">
                  A CPA must record the approval (your role: {viewerRole}).
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {transitions.length === 0 ? (
        <p className="text-body text-text-muted text-center py-2">
          No actions available from {currentState}.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {transitions.map((t) => {
            const isApproveGate =
              t.toState === "APPROVED" && t.fromState === "REVIEW_REQUIRED";
            const allowed = roleAllowed(t);
            const blocked =
              (isApproveGate && !hasApproval) || !allowed;
            const isEscalate = t.toState === "ESCALATED";

            return (
              <li key={t.toState}>
                <TransitionButton
                  label={getTransitionLabel(t.toState)}
                  onClick={() => onClickTransition(t)}
                  loading={pending === t.toState}
                  disabled={pending !== null || blocked}
                  tooltip={
                    !allowed
                      ? `Requires role: ${t.allowedRoles.join(" or ")}`
                      : isApproveGate && !hasApproval
                        ? "Grant CPA approval first."
                        : undefined
                  }
                  variant={isEscalate ? "danger-ghost" : "primary"}
                  icon={isEscalate ? <AlertTriangle className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                />
              </li>
            );
          })}
        </ul>
      )}

      {confirm && (
        <ConfirmDialog
          open
          title={`Confirm: ${getTransitionLabel(confirm.transition.toState)}`}
          description={
            IRREVERSIBLE_TARGETS.has(confirm.transition.toState as EngagementState)
              ? "This action is irreversible."
              : undefined
          }
          confirmLabel={getTransitionLabel(confirm.transition.toState)}
          danger={IRREVERSIBLE_TARGETS.has(
            confirm.transition.toState as EngagementState,
          )}
          requireReason={confirm.transition.requiresReason}
          reasonLabel={
            confirm.transition.toState === "ESCALATED"
              ? "Escalation reason (required)"
              : "Reason (required)"
          }
          onConfirm={async (reason) => {
            await callTransition(confirm.transition, reason);
          }}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

function TransitionButton({
  label,
  onClick,
  loading,
  disabled,
  tooltip,
  variant,
  icon,
}: {
  label: string;
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
  tooltip?: string;
  variant: "primary" | "danger-ghost";
  icon: ReactNode;
}) {
  const base =
    "w-full inline-flex items-center justify-between gap-2 px-3 py-2 rounded-button text-card-title transition disabled:opacity-60 disabled:cursor-not-allowed";
  const styles =
    variant === "primary"
      ? "bg-primary text-white hover:opacity-95"
      : "border border-red text-red bg-surface hover:bg-red-light";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={`${base} ${styles}`}
    >
      <span className="inline-flex items-center gap-2">
        {icon}
        {loading ? "Working…" : label}
      </span>
    </button>
  );
}
