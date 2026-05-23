// Server-side governance helpers. Shared between /api/transition and any
// future server code that needs the same rules (e.g. an admin override).
import { findTransition, getPhaseForState } from "@/lib/workflow";
import type { EngagementState } from "@/lib/supabase/database.types";
import type { EngagementRow } from "@/lib/db-types";

export type EngineErrorCode =
  | "engagement_not_found"
  | "invalid_transition"
  | "insufficient_role"
  | "gate_blocked"
  | "reason_required"
  | "server_error";

export type EngineErrorBody = {
  error: EngineErrorCode;
  message: string;
  resolution?: string;
};

// SRS §14 — exact copy.
export const ERROR_COPY: Record<EngineErrorCode, string> = {
  engagement_not_found: "We could not find that engagement.",
  invalid_transition: "This transition is not permitted from the current state.",
  insufficient_role: "You do not have permission to perform this action.",
  gate_blocked:
    "This transition is blocked by a missing approval. Grant CPA approval to continue.",
  reason_required: "A reason is required for this action.",
  server_error: "Something went wrong. The action was not completed. Please try again.",
};

export function errorBody(
  code: EngineErrorCode,
  resolution?: string,
): EngineErrorBody {
  return { error: code, message: ERROR_COPY[code], resolution };
}

// Decide which action_type to record for an engagements UPDATE.
export function actionTypeFor(
  fromState: EngagementState,
  toState: EngagementState,
): "stage_transition" | "escalation_created" | "escalation_resolved" {
  if (toState === "ESCALATED") return "escalation_created";
  if (fromState === "ESCALATED") return "escalation_resolved";
  return "stage_transition";
}

// Decide the escalation_reason value to write on the engagement row.
//   - new escalation: store the supplied reason
//   - resolving from escalated: clear (NULL)
//   - any other transition: preserve the existing value
export function nextEscalationReason(
  fromState: EngagementState,
  toState: EngagementState,
  supplied: string | undefined,
  current: string | null,
): string | null {
  if (toState === "ESCALATED") return supplied?.trim() || current;
  if (fromState === "ESCALATED") return null;
  return current;
}

// Plain-English last_action label.
export function lastActionLabel(
  actionType: "stage_transition" | "escalation_created" | "escalation_resolved",
  toState: EngagementState,
): string {
  if (actionType === "escalation_created") return "Engagement escalated";
  if (actionType === "escalation_resolved") return `Escalation resolved → ${toState}`;
  return `Moved to ${toState}`;
}

// Pre-flight checks shared between the engine and any caller that wants to
// know "could this transition succeed?" without writing.
export type PreflightOk = {
  ok: true;
  toPhase: number;
  actionType: ReturnType<typeof actionTypeFor>;
  lastAction: string;
  escalationReason: string | null;
};
export type PreflightFail = {
  ok: false;
  status: 400 | 403 | 404;
  body: EngineErrorBody;
};

export type RequiresApprovalChecker = () => Promise<boolean>;

export async function preflightTransition(opts: {
  engagement: EngagementRow | null;
  toState: EngagementState;
  viewerRole: "cpa" | "staff" | "admin";
  reason: string | undefined;
  hasActiveApproval: RequiresApprovalChecker;
}): Promise<PreflightOk | PreflightFail> {
  const { engagement, toState, viewerRole, reason, hasActiveApproval } = opts;
  if (!engagement) {
    return { ok: false, status: 404, body: errorBody("engagement_not_found") };
  }

  const transition = findTransition(engagement.current_state, toState);
  if (!transition) {
    return {
      ok: false,
      status: 403,
      body: errorBody("invalid_transition"),
    };
  }

  // 'admin' has no workflow_transitions entries; allow only roles in the row.
  // The role check below catches admin too unless admin is explicitly listed.
  const allowedRoles: ("cpa" | "staff")[] = transition.allowedRoles;
  if (!allowedRoles.includes(viewerRole as "cpa" | "staff")) {
    return {
      ok: false,
      status: 403,
      body: errorBody("insufficient_role"),
    };
  }

  if (transition.requiresApproval) {
    const approved = await hasActiveApproval();
    if (!approved) {
      return {
        ok: false,
        status: 403,
        body: errorBody(
          "gate_blocked",
          "Record a CPA approval for this engagement and retry.",
        ),
      };
    }
  }

  if (transition.requiresReason && !reason?.trim()) {
    return {
      ok: false,
      status: 400,
      body: errorBody("reason_required"),
    };
  }

  const actionType = actionTypeFor(engagement.current_state, toState);
  return {
    ok: true,
    toPhase: getPhaseForState(toState),
    actionType,
    lastAction: lastActionLabel(actionType, toState),
    escalationReason: nextEscalationReason(
      engagement.current_state,
      toState,
      reason,
      engagement.escalation_reason,
    ),
  };
}

// Phase 4 — the RELEASED side-effects (packet generation, TaxDome, HubSpot)
// are now wired in app/api/transition/route.ts itself. See lib/packet.ts and
// lib/integrations.ts.
