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
  getTransitionLabel,
} from "@/lib/workflow";
import type { EngagementState, AppRole } from "@/lib/supabase/database.types";

// ─────────────────────────────────────────────────────────────
// SRS §14 — plain-English error copy by error code returned from the engine.
// Phase 5 tone: lead with what to do, not "Error 500."
// ─────────────────────────────────────────────────────────────
const ERROR_COPY: Record<string, string> = {
  invalid_transition: "That isn't a valid next step from where this engagement is now.",
  insufficient_role: "You don't have permission to do that. Ask a CPA to take this action.",
  gate_blocked:
    "Approval is needed first. Approve this engagement before continuing.",
  reason_required: "Add a quick note explaining the change before continuing.",
  network: "Connection hiccup. Try again in a moment.",
  server_error:
    "We couldn't save that. Try again in a moment — your work is safe.",
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
          ? "Approved. The team can continue. ✓"
          : toState === "RELEASED"
            ? "Sent to client. Package delivered, CRM updated. ✓"
            : toState === "ESCALATED"
              ? "Flagged. This engagement now shows in your attention list. ✓"
              : toState === "ARCHIVED"
                ? "Engagement closed. It's saved in your history. ✓"
                : toState === "ROLLED_BACK"
                  ? "Sent back to the team. They can make the changes you asked for. ✓"
                  : "Done. The change is saved to the history. ✓";
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
        message: "Approved. The team can continue. ✓",
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
            label: `Resolve and continue from ${STATE_DISPLAY[toState].label}`,
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
          clickTransition({ toState: "APPROVED", label: "Approve and continue" })
        }
        onReturnToExecution={() =>
          clickTransition({
            toState: "ROLLED_BACK",
            label: "Send back to the team",
            description:
              "Sending this back lets the team make changes. They'll see it in their list and can pick up where they left off.",
          })
        }
      />
    );
  } else if (currentState === "RELEASED" || currentState === "ARCHIVED") {
    body = (
      <TerminalView
        message={
          currentState === "RELEASED"
            ? "This engagement has been sent to the client. Everything's recorded in the history."
            : "This engagement is closed. Everything's saved in the history."
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
    <div className={"card border-2 border-primary/15 shadow-card-hover " + (className ?? "")}>
      <h3 className="text-card-title mb-3">What you can do next</h3>
      {body}

      <div className="mt-4 rounded-card bg-surface-2 border border-border px-3 py-2.5">
        <div className="flex items-start gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-text-muted flex-shrink-0 mt-0.5" aria-hidden />
          <p className="text-body text-text-secondary">
            Every action you take here is saved to the history.
          </p>
        </div>
      </div>

      {confirm && (
        <ConfirmDialog
          open
          title={confirm.label}
          description={confirm.description ?? confirmDescriptionFor(confirm.toState)}
          confirmLabel={confirm.label}
          danger={confirm.danger}
          requireReason={confirm.requireReason}
          reasonLabel={reasonLabelFor(confirm.toState)}
          reasonPlaceholder={reasonPlaceholderFor(confirm.toState)}
          reasonPrompt={reasonPromptFor(confirm.toState)}
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
// Confirm dialog copy (Phase 5 — friendly framing, no "cannot be undone")
// ─────────────────────────────────────────────────────────────

function confirmDescriptionFor(toState: EngagementState): string | undefined {
  switch (toState) {
    case "APPROVED":
      return "Approving this engagement will allow the team to send the work to the client. This approval will be recorded in the history.";
    case "RELEASED":
      return "This will send the engagement package to the client and update your CRM. You can always look back at the full history afterward.";
    case "ARCHIVED":
      return "Closing this engagement keeps everything in the history. Anyone in your firm can look back at it later.";
    case "ESCALATED":
      return "Flag this engagement so it shows up in your attention list. Add a quick note so the team knows what to do.";
    case "ROLLED_BACK":
      return "Sending this back lets the team make changes. They'll see it in their list and can pick up where they left off.";
    default:
      return undefined;
  }
}

function reasonLabelFor(toState: EngagementState): string {
  if (toState === "ESCALATED") return "Reason for flagging (required)";
  return "A quick note (required)";
}

function reasonPromptFor(toState: EngagementState): string | undefined {
  if (toState === "ESCALATED") {
    return "What needs attention? A short note helps the team know what to do.";
  }
  return "What changed? A quick note helps the team.";
}

function reasonPlaceholderFor(toState: EngagementState): string {
  switch (toState) {
    case "ESCALATED":
      return "e.g. Client hasn't sent the missing W-2 yet — paused until we hear back.";
    case "ROLLED_BACK":
      return "e.g. The numbers on page 3 need a recheck before I can approve.";
    default:
      return "e.g. Sending this back to be redone before the next step.";
  }
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
            This engagement needs attention before it can keep moving.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onResolve(previousState)}
        disabled={pending !== null || !allowed}
        className="w-full inline-flex items-center justify-center gap-2 px-3 py-3 rounded-button bg-red text-white text-card-title hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed transition"
        title={!allowed ? "Only a CPA or staff member can resolve this." : undefined}
      >
        <RotateCcw className="w-4 h-4" aria-hidden />
        {pending === previousState
          ? "Working…"
          : `Resolve and continue from ${STATE_DISPLAY[previousState].label}`}
      </button>

      <div className="mt-3 rounded-card bg-surface-2 border border-border px-3 py-2.5">
        <p className="text-body text-text-secondary">
          Flagged engagements pause until someone resolves them — usually a
          missing document or something that needs a closer look. Once you
          resolve it, the engagement picks up from where it was.
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
              The team finished the work and is waiting for your approval to
              send it to the client.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onGrantApproval}
          disabled={pending !== null || !isCpa}
          title={!isCpa ? "Only a CPA can approve." : undefined}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-3 rounded-button bg-primary text-white text-card-title hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          <CheckCircle2 className="w-4 h-4" aria-hidden />
          {pending === "APPROVE_GATE" ? "Working…" : "Approve this engagement"}
        </button>

        <button
          type="button"
          onClick={onReturnToExecution}
          disabled={pending !== null || !isCpa}
          title={!isCpa ? "Only a CPA can send this back." : undefined}
          className="mt-2 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-button border border-border bg-surface text-text-secondary text-body hover:bg-surface-2 disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden />
          Send back to the team
        </button>
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
            You&apos;ve approved this engagement. Ready to continue.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onAdvance}
        disabled={pending !== null || !isCpa}
        title={!isCpa ? "Only a CPA can continue." : undefined}
        className="w-full inline-flex items-center justify-center gap-2 px-3 py-3 rounded-button bg-primary text-white text-card-title hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed transition"
      >
        <ChevronRight className="w-4 h-4" aria-hidden />
        {pending === "APPROVED" ? "Working…" : "Approve and continue"}
      </button>

      <button
        type="button"
        onClick={onReturnToExecution}
        disabled={pending !== null || !isCpa}
        title={!isCpa ? "Only a CPA can send this back." : undefined}
        className="mt-2 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-button border border-border bg-surface text-text-secondary text-body hover:bg-surface-2 disabled:opacity-60 disabled:cursor-not-allowed transition"
      >
        <RotateCcw className="w-3.5 h-3.5" aria-hidden />
        Send back to the team
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
          Nothing for you to do here right now.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="text-label mb-2">Your next step</div>

      {primary && (
        <button
          type="button"
          onClick={() =>
            onTransition(primary.toState, getTransitionLabel(primary.toState))
          }
          disabled={pending !== null}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-3 rounded-button bg-primary text-white text-card-title hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          <ChevronRight className="w-4 h-4" aria-hidden />
          {pending === primary.toState
            ? "Working…"
            : getTransitionLabel(primary.toState)}
        </button>
      )}

      {otherForwards.length > 0 && (
        <ul className="mt-2 flex flex-col gap-2">
          {otherForwards.map((t) => (
            <li key={t.toState}>
              <SecondaryButton
                label={getTransitionLabel(t.toState)}
                onClick={() =>
                  onTransition(t.toState, getTransitionLabel(t.toState))
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
          {backwards.map((t) => {
            const label = `Go back to ${STATE_DISPLAY[t.toState].label}`;
            return (
              <li key={t.toState}>
                <SecondaryButton
                  label={label}
                  onClick={() => onTransition(t.toState, label)}
                  pending={pending === t.toState}
                  disabled={pending !== null}
                />
              </li>
            );
          })}
        </ul>
      )}

      {escalateT && (
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={() => onTransition("ESCALATED", "Flag this engagement")}
            disabled={pending !== null}
            className="text-body text-red hover:underline disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Flag this engagement
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
