"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, type ReactNode } from "react";
import { useRealtimeChannel } from "@/lib/hooks/useRealtimeChannel";
import {
  AlertTriangle,
  ChevronRight,
  Lock,
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useToast } from "@/components/toast/ToastProvider";
import {
  STATE_DISPLAY,
  findTransition,
  getAvailableTransitions,
  getPhaseForState,
} from "@/lib/workflow";
import type { EngagementState, AppRole } from "@/lib/supabase/database.types";

// ─────────────────────────────────────────────────────────────
// SRS §14 — plain-English error copy by error code returned from the engine.
// ─────────────────────────────────────────────────────────────
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

const IRREVERSIBLE_TARGETS = new Set<EngagementState>([
  "RELEASED",
  "ARCHIVED",
  "ROLLED_BACK",
]);

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
  /** Set this when currentState === "ESCALATED" so the "Resolve and Return to X" button can name X. */
  previousStateBeforeEscalation?: EngagementState | null;
  className?: string;
};

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export default function WorkflowControls({
  engagementId,
  currentState,
  hasApproval,
  viewerRole,
  previousStateBeforeEscalation,
  className,
}: WorkflowControlsProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, setPending] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{
    toState: EngagementState;
    label: string;
    requireReason: boolean;
    danger: boolean;
    description?: string;
  } | null>(null);

  // Live gate unlock: an approval granted in another session arrives here as
  // a postgres_changes INSERT; refresh the route so hasApproval reflects.
  const onApprovalChange = useCallback(() => {
    router.refresh();
  }, [router]);
  useRealtimeChannel({
    table: "engagement_approvals",
    filter: `engagement_id=eq.${engagementId}`,
    onChange: onApprovalChange,
  });

  // ── engine callers ──────────────────────────────────────────
  async function callTransition(
    toState: EngagementState,
    reason?: string,
  ): Promise<void> {
    setPending(toState);
    try {
      const res = await fetch("/api/transition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ engagementId, toState, reason }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as EngineErrorBody;
        const code = body.error ?? "server_error";
        const message = body.message ?? ERROR_COPY[code] ?? ERROR_COPY.server_error;
        showToast({
          message,
          type: code === "gate_blocked" ? "warning" : "error",
        });
        return;
      }
      const successMsg =
        toState === "APPROVED"
          ? "Approved. Audit record created."
          : toState === "RELEASED"
            ? "Released. Packet generated, sent to TaxDome, CRM updated."
            : toState === "ESCALATED"
              ? "Escalated. The engagement is paused until resolved."
              : toState === "ARCHIVED"
                ? "Archived. The engagement is closed."
                : toState === "ROLLED_BACK"
                  ? "Rolled back. Returned to execution for revision."
                  : "Transition recorded. Audit trail updated.";
      showToast({ message: successMsg, type: "success" });
      router.refresh();
    } catch {
      showToast({ message: ERROR_COPY.network, type: "error" });
    } finally {
      setPending(null);
      setConfirm(null);
    }
  }

  async function callGrantApproval(): Promise<void> {
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
          message: body.message ?? ERROR_COPY[code] ?? ERROR_COPY.server_error,
          type: "error",
        });
        return;
      }
      showToast({
        message: "Approval recorded. Gate unlocked.",
        type: "success",
      });
      router.refresh();
    } catch {
      showToast({ message: ERROR_COPY.network, type: "error" });
    } finally {
      setPending(null);
    }
  }

  function clickTransition(args: {
    toState: EngagementState;
    label: string;
    description?: string;
  }): void {
    const t = findTransition(currentState, args.toState);
    const requireReason = t?.requiresReason ?? false;
    const danger = IRREVERSIBLE_TARGETS.has(args.toState);
    if (requireReason || danger) {
      setConfirm({
        toState: args.toState,
        label: args.label,
        requireReason,
        danger,
        description: args.description,
      });
      return;
    }
    void callTransition(args.toState);
  }

  // ── shared bits ─────────────────────────────────────────────
  const transitions = getAvailableTransitions(currentState).filter((t) =>
    t.allowedRoles.includes(viewerRole as "cpa" | "staff"),
  );

  // Body content per state.
  let body: ReactNode = null;

  if (currentState === "ESCALATED") {
    body = (
      <EscalatedView
        previousState={previousStateBeforeEscalation ?? "EVIDENCE_UNDER_REVIEW"}
        pending={pending}
        viewerRole={viewerRole}
        onResolve={(toState) =>
          clickTransition({
            toState,
            label: `Resolve Escalation and Return to ${STATE_DISPLAY[toState].label}`,
          })
        }
      />
    );
  } else if (currentState === "REVIEW_REQUIRED") {
    body = (
      <ReviewRequiredView
        hasApproval={hasApproval}
        viewerRole={viewerRole}
        pending={pending}
        onGrantApproval={callGrantApproval}
        onAdvance={() =>
          clickTransition({ toState: "APPROVED", label: "Advance to Approved" })
        }
        onReturnToExecution={() =>
          clickTransition({
            toState: "ROLLED_BACK",
            label: "Return to Execution",
            description:
              "This rolls the engagement back so execution can be revised.",
          })
        }
      />
    );
  } else if (currentState === "RELEASED" || currentState === "ARCHIVED") {
    body = (
      <TerminalView
        message={
          currentState === "RELEASED"
            ? "This engagement has been completed and released."
            : "This engagement is archived."
        }
      />
    );
  } else {
    body = (
      <ForwardView
        transitions={transitions}
        currentState={currentState}
        pending={pending}
        viewerRole={viewerRole}
        onTransition={(toState, label) => clickTransition({ toState, label })}
      />
    );
  }

  return (
    <div className={"card " + (className ?? "")}>
      <h3 className="text-card-title mb-3">Workflow controls</h3>
      {body}

      <div className="mt-4 rounded-card bg-surface-2 border border-border px-3 py-2.5">
        <div className="flex items-start gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-text-muted flex-shrink-0 mt-0.5" aria-hidden />
          <p className="text-body text-text-secondary">
            All workflow movements are governed, logged, and cannot be undone.
            Every action creates a permanent audit record.
          </p>
        </div>
      </div>

      {confirm && (
        <ConfirmDialog
          open
          title={`Confirm: ${confirm.label}`}
          description={confirm.description}
          confirmLabel={confirm.label}
          danger={confirm.danger}
          requireReason={confirm.requireReason}
          reasonLabel={
            confirm.toState === "ESCALATED"
              ? "Escalation reason (required)"
              : "Reason (required)"
          }
          onConfirm={async (reason) => {
            await callTransition(confirm.toState, reason);
          }}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// State-specific views
// ─────────────────────────────────────────────────────────────

function EscalatedView({
  previousState,
  pending,
  viewerRole,
  onResolve,
}: {
  previousState: EngagementState;
  pending: string | null;
  viewerRole: AppRole;
  onResolve: (toState: EngagementState) => void;
}): JSX.Element {
  const t = findTransition("ESCALATED", previousState);
  const allowed = t?.allowedRoles.includes(viewerRole as "cpa" | "staff") ?? false;

  return (
    <>
      <div className="rounded-card border border-red/30 bg-red-light p-3 mb-3">
        <div className="flex items-start gap-2">
          <AlertTriangle
            className="w-4 h-4 text-red flex-shrink-0 mt-0.5"
            aria-hidden
          />
          <p className="text-body text-red leading-snug">
            This engagement is escalated and cannot advance until the escalation
            is resolved.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onResolve(previousState)}
        disabled={pending !== null || !allowed}
        className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-button bg-red text-white text-card-title hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed transition"
        title={
          !allowed ? `Requires role: ${t?.allowedRoles.join(" or ")}` : undefined
        }
      >
        <RotateCcw className="w-4 h-4" aria-hidden />
        {pending === previousState
          ? "Resolving…"
          : `Resolve Escalation and Return to ${STATE_DISPLAY[previousState].label}`}
      </button>

      <div className="mt-3 rounded-card bg-surface-2 border border-border px-3 py-2.5">
        <p className="text-body text-text-secondary">
          An escalation means the engagement cannot move forward as-is — typically
          due to missing documents, unresolved variances, or a policy block.
          Resolving returns the engagement to its prior workflow state so work can
          continue.
        </p>
      </div>
    </>
  );
}

function ReviewRequiredView({
  hasApproval,
  viewerRole,
  pending,
  onGrantApproval,
  onAdvance,
  onReturnToExecution,
}: {
  hasApproval: boolean;
  viewerRole: AppRole;
  pending: string | null;
  onGrantApproval: () => void;
  onAdvance: () => void;
  onReturnToExecution: () => void;
}): JSX.Element {
  const isCpa = viewerRole === "cpa";

  if (!hasApproval) {
    return (
      <>
        <div className="rounded-card border border-amber-mid bg-amber-light p-3 mb-3">
          <div className="flex items-start gap-2">
            <Lock
              className="w-4 h-4 text-amber flex-shrink-0 mt-0.5"
              aria-hidden
            />
            <p className="text-body text-amber leading-snug">
              Approval required before this engagement can advance. Grant your
              formal CPA approval below to unlock the next stage.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onGrantApproval}
          disabled={pending !== null || !isCpa}
          title={!isCpa ? "Requires role: cpa" : undefined}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-button bg-primary text-white text-card-title hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          <CheckCircle2 className="w-4 h-4" aria-hidden />
          {pending === "APPROVE_GATE" ? "Granting…" : "Grant CPA Approval"}
        </button>

        <button
          type="button"
          onClick={onReturnToExecution}
          disabled={pending !== null || !isCpa}
          title={!isCpa ? "Requires role: cpa" : undefined}
          className="mt-2 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-button border border-border bg-surface text-text-primary text-card-title hover:bg-surface-2 disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden />
          Return to Execution (requires reason)
        </button>

        <p className="text-label mt-3 text-center">
          Your approval creates a permanent record in the system.
        </p>
      </>
    );
  }

  return (
    <>
      <div className="rounded-card border border-green/30 bg-green-light p-3 mb-3">
        <div className="flex items-start gap-2">
          <CheckCircle2
            className="w-4 h-4 text-green flex-shrink-0 mt-0.5"
            aria-hidden
          />
          <p className="text-body text-green leading-snug">
            CPA approval on record. Gate unlocked.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onAdvance}
        disabled={pending !== null || !isCpa}
        title={!isCpa ? "Requires role: cpa" : undefined}
        className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-button bg-primary text-white text-card-title hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed transition"
      >
        <ChevronRight className="w-4 h-4" aria-hidden />
        {pending === "APPROVED" ? "Advancing…" : "Advance to Approved"}
      </button>

      <button
        type="button"
        onClick={onReturnToExecution}
        disabled={pending !== null || !isCpa}
        title={!isCpa ? "Requires role: cpa" : undefined}
        className="mt-2 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-button border border-border bg-surface text-text-primary text-card-title hover:bg-surface-2 disabled:opacity-60 disabled:cursor-not-allowed transition"
      >
        <RotateCcw className="w-3.5 h-3.5" aria-hidden />
        Return to Execution
      </button>
    </>
  );
}

function TerminalView({ message }: { message: string }): JSX.Element {
  return (
    <div className="rounded-card border border-green/30 bg-green-light p-3">
      <div className="flex items-start gap-2">
        <CheckCircle2
          className="w-4 h-4 text-green flex-shrink-0 mt-0.5"
          aria-hidden
        />
        <p className="text-body text-green leading-snug">{message}</p>
      </div>
    </div>
  );
}

function ForwardView({
  transitions,
  currentState,
  pending,
  viewerRole,
  onTransition,
}: {
  transitions: ReturnType<typeof getAvailableTransitions>;
  currentState: EngagementState | string;
  pending: string | null;
  viewerRole: AppRole;
  onTransition: (toState: EngagementState, label: string) => void;
}): JSX.Element {
  // Split into: forward (highest target phase), backtracks, and escalate.
  const escalateT = transitions.find((t) => t.toState === "ESCALATED");
  const nonEscalate = transitions.filter((t) => t.toState !== "ESCALATED");
  const currentPhase = getPhaseForState(currentState);
  const forwards = nonEscalate.filter(
    (t) => getPhaseForState(t.toState) > currentPhase,
  );
  const backwards = nonEscalate.filter(
    (t) => getPhaseForState(t.toState) <= currentPhase,
  );

  // Primary forward = highest target phase among forwards.
  const primary = forwards.sort(
    (a, b) => getPhaseForState(b.toState) - getPhaseForState(a.toState),
  )[0];
  const otherForwards = primary ? forwards.filter((t) => t !== primary) : [];

  if (transitions.length === 0) {
    return (
      <div className="rounded-card bg-surface-2 border border-border p-3">
        <p className="text-body text-text-secondary">
          No actions available from this state for your role.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="text-label mb-2">Next step</div>

      {primary && (
        <button
          type="button"
          onClick={() =>
            onTransition(
              primary.toState,
              `Advance to ${STATE_DISPLAY[primary.toState].label}`,
            )
          }
          disabled={pending !== null}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-button bg-primary text-white text-card-title hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          <ChevronRight className="w-4 h-4" aria-hidden />
          {pending === primary.toState
            ? "Working…"
            : `Advance to ${STATE_DISPLAY[primary.toState].label}`}
        </button>
      )}

      {otherForwards.length > 0 && (
        <ul className="mt-2 flex flex-col gap-2">
          {otherForwards.map((t) => (
            <li key={t.toState}>
              <SecondaryButton
                label={STATE_DISPLAY[t.toState].label}
                onClick={() =>
                  onTransition(
                    t.toState,
                    `Advance to ${STATE_DISPLAY[t.toState].label}`,
                  )
                }
                pending={pending === t.toState}
                disabled={pending !== null}
              />
            </li>
          ))}
        </ul>
      )}

      {backwards.length > 0 && (
        <ul className="mt-2 flex flex-col gap-2">
          {backwards.map((t) => (
            <li key={t.toState}>
              <SecondaryButton
                label={`Return to ${STATE_DISPLAY[t.toState].label}${t.requiresReason ? " (requires reason)" : ""}`}
                onClick={() =>
                  onTransition(
                    t.toState,
                    `Return to ${STATE_DISPLAY[t.toState].label}`,
                  )
                }
                pending={pending === t.toState}
                disabled={pending !== null}
              />
            </li>
          ))}
        </ul>
      )}

      {escalateT && (
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={() => onTransition("ESCALATED", "Escalate this engagement")}
            disabled={pending !== null}
            className="text-card-title text-red hover:underline disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Escalate this engagement
          </button>
        </div>
      )}

      {!escalateT && viewerRole && null}
    </>
  );
}

function SecondaryButton({
  label,
  onClick,
  pending,
  disabled,
}: {
  label: string;
  onClick: () => void;
  pending: boolean;
  disabled: boolean;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-button border border-border bg-surface text-text-primary text-card-title hover:bg-surface-2 disabled:opacity-60 disabled:cursor-not-allowed transition"
    >
      {pending ? "Working…" : label}
    </button>
  );
}
