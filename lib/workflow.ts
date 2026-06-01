// Single source of truth for workflow display + lookups.
// Imported by components AND by the /api/transition handler.
//
// The WORKFLOW_TRANSITIONS array mirrors the rows in
// supabase/migrations/20260523000003_workflow_transitions.sql verbatim.
// If you change one, change the other.

import type { EngagementState } from "@/lib/supabase/database.types";

// ─────────────────────────────────────────────────────────────
// State display (SRS §8.1)
// ─────────────────────────────────────────────────────────────

export type StateDisplay = {
  label: string;
  /** Hex used for the leading dot in <EngagementStateBadge>. */
  dotColor: string;
  /** Tailwind text color class for the badge label. */
  textColor: string;
  /** Tailwind background color class for the badge pill. */
  bgColor: string;
};

export const STATE_DISPLAY: Record<EngagementState, StateDisplay> = {
  INITIATED: {
    label: "Not started",
    dotColor: "#5C35A0",
    textColor: "text-purple",
    bgColor: "bg-purple-light",
  },
  INTAKE_ACTIVE: {
    label: "Collecting documents",
    dotColor: "#1A5FB4",
    textColor: "text-primary",
    bgColor: "bg-blue-light",
  },
  EVIDENCE_UNDER_REVIEW: {
    label: "Reviewing documents",
    dotColor: "#1A5FB4",
    textColor: "text-primary",
    bgColor: "bg-blue-light",
  },
  READY_FOR_EXECUTION: {
    label: "Ready to start work",
    dotColor: "#174E96",
    textColor: "text-primary",
    bgColor: "bg-blue-light",
  },
  EXECUTION_ACTIVE: {
    label: "Work in progress",
    dotColor: "#103E78",
    textColor: "text-primary",
    bgColor: "bg-blue-light",
  },
  REVIEW_REQUIRED: {
    label: "Waiting for your approval",
    dotColor: "#8B5000",
    textColor: "text-amber",
    bgColor: "bg-amber-light",
  },
  APPROVED: {
    label: "Approved",
    dotColor: "#1B7D3A",
    textColor: "text-green",
    bgColor: "bg-green-light",
  },
  RELEASE_READY: {
    label: "Ready to send",
    dotColor: "#1B7D3A",
    textColor: "text-green",
    bgColor: "bg-green-light",
  },
  RELEASED: {
    label: "Sent to client",
    dotColor: "#125827",
    textColor: "text-green",
    bgColor: "bg-green-light",
  },
  ESCALATED: {
    label: "Needs attention",
    dotColor: "#B8002C",
    textColor: "text-red",
    bgColor: "bg-red-light",
  },
  ROLLED_BACK: {
    label: "Sent back for changes",
    dotColor: "#8B5000",
    textColor: "text-amber",
    bgColor: "bg-amber-light",
  },
  ARCHIVED: {
    label: "Closed",
    dotColor: "#8A94A6",
    textColor: "text-text-muted",
    bgColor: "bg-surface-3",
  },
};

export function getStateDisplay(state: EngagementState | string): StateDisplay {
  return (
    STATE_DISPLAY[state as EngagementState] ?? {
      label: state,
      dotColor: "#8A94A6",
      textColor: "text-text-muted",
      bgColor: "bg-surface-3",
    }
  );
}

// ─────────────────────────────────────────────────────────────
// Phase map (SRS §8.2)
// ─────────────────────────────────────────────────────────────

export type PhaseInfo = {
  number: number;
  label: string;
  states: EngagementState[];
};

export const PHASES: PhaseInfo[] = [
  { number: 0, label: "Intake", states: ["INITIATED", "INTAKE_ACTIVE"] },
  { number: 1, label: "Document review", states: ["EVIDENCE_UNDER_REVIEW"] },
  { number: 2, label: "Work", states: ["READY_FOR_EXECUTION", "EXECUTION_ACTIVE"] },
  { number: 3, label: "Review", states: ["REVIEW_REQUIRED"] },
  { number: 4, label: "Approval", states: ["APPROVED"] },
  { number: 5, label: "Release", states: ["RELEASE_READY"] },
  { number: 6, label: "Package", states: [] },
  { number: 7, label: "Delivery", states: ["RELEASED"] },
  { number: 8, label: "Closed", states: ["ARCHIVED"] },
];

export function getPhaseForState(state: EngagementState | string): number {
  const found = PHASES.find((p) => p.states.includes(state as EngagementState));
  return found?.number ?? 0;
}

// ─────────────────────────────────────────────────────────────
// Service-line names
// ─────────────────────────────────────────────────────────────

export const SERVICE_LINES: Record<string, string> = {
  "4A": "Tax Preparation",
  "4B": "Financial Reconstruction",
  "4C": "CFO Reporting",
  "4D": "Advisory Execution",
  "4E": "Compliance Workflows",
  "4F": "Readiness Determination",
  "4G": "Institutional Financial Operations",
  "4H": "Planning Execution",
  "4K": "Operational Diagnostics",
};

export function getServiceLineName(code: string): string {
  return SERVICE_LINES[code] ?? code;
}

// ─────────────────────────────────────────────────────────────
// Friendly action labels (Phase 5 vocabulary map)
// What the user reads in History — never the internal action_type.
// ─────────────────────────────────────────────────────────────

export const ACTION_LABEL_FRIENDLY: Record<string, string> = {
  engagement_created: "Engagement created",
  stage_transition: "Status changed",
  approval_granted: "Approval given",
  approval_revoked: "Approval revoked",
  escalation_created: "Marked as needing attention",
  escalation_resolved: "Back on track",
  gate_blocked: "Action blocked — approval needed first",
  transition_blocked: "Action blocked",
  ai_generation: "Draft created with AI",
  document_uploaded: "Document received",
  document_flagged: "Document flagged",
  packet_generated: "Engagement package created",
  taxdome_sent: "Sent to TaxDome",
  hubspot_updated: "CRM updated",
  automation_triggered: "System note",
  automation_error: "System note",
};

export function getFriendlyActionLabel(actionType: string): string {
  return ACTION_LABEL_FRIENDLY[actionType] ?? actionType;
}

// "from X to Y" rendered with friendly state labels, used in History rows.
export function describeStateChange(
  fromState: string | null,
  toState: string | null,
): string | null {
  const from = fromState ? getStateDisplay(fromState).label : null;
  const to = toState ? getStateDisplay(toState).label : null;
  if (from && to) return `from ${from} to ${to}`;
  if (to) return `to ${to}`;
  if (from) return `from ${from}`;
  return null;
}

// ─────────────────────────────────────────────────────────────
// Workflow transitions (mirrors migration 20260523000003)
// ─────────────────────────────────────────────────────────────

export type WorkflowRole = "cpa" | "staff";

export type WorkflowTransition = {
  fromState: EngagementState;
  toState: EngagementState;
  requiresApproval: boolean;
  allowedRoles: WorkflowRole[];
  requiresReason: boolean;
};

export const WORKFLOW_TRANSITIONS: WorkflowTransition[] = [
  { fromState: "INITIATED", toState: "INTAKE_ACTIVE", requiresApproval: false, allowedRoles: ["cpa", "staff"], requiresReason: false },
  { fromState: "INTAKE_ACTIVE", toState: "EVIDENCE_UNDER_REVIEW", requiresApproval: false, allowedRoles: ["cpa", "staff"], requiresReason: false },
  { fromState: "INTAKE_ACTIVE", toState: "ESCALATED", requiresApproval: false, allowedRoles: ["cpa", "staff"], requiresReason: true },
  { fromState: "EVIDENCE_UNDER_REVIEW", toState: "READY_FOR_EXECUTION", requiresApproval: false, allowedRoles: ["cpa", "staff"], requiresReason: false },
  { fromState: "EVIDENCE_UNDER_REVIEW", toState: "INTAKE_ACTIVE", requiresApproval: false, allowedRoles: ["cpa", "staff"], requiresReason: true },
  { fromState: "EVIDENCE_UNDER_REVIEW", toState: "ESCALATED", requiresApproval: false, allowedRoles: ["cpa", "staff"], requiresReason: true },
  { fromState: "READY_FOR_EXECUTION", toState: "EXECUTION_ACTIVE", requiresApproval: false, allowedRoles: ["cpa"], requiresReason: false },
  { fromState: "READY_FOR_EXECUTION", toState: "ESCALATED", requiresApproval: false, allowedRoles: ["cpa", "staff"], requiresReason: true },
  { fromState: "EXECUTION_ACTIVE", toState: "REVIEW_REQUIRED", requiresApproval: false, allowedRoles: ["cpa"], requiresReason: false },
  { fromState: "EXECUTION_ACTIVE", toState: "ESCALATED", requiresApproval: false, allowedRoles: ["cpa", "staff"], requiresReason: true },
  { fromState: "REVIEW_REQUIRED", toState: "APPROVED", requiresApproval: true, allowedRoles: ["cpa"], requiresReason: false },
  { fromState: "REVIEW_REQUIRED", toState: "ROLLED_BACK", requiresApproval: false, allowedRoles: ["cpa"], requiresReason: true },
  { fromState: "REVIEW_REQUIRED", toState: "ESCALATED", requiresApproval: false, allowedRoles: ["cpa", "staff"], requiresReason: true },
  { fromState: "APPROVED", toState: "RELEASE_READY", requiresApproval: false, allowedRoles: ["cpa"], requiresReason: false },
  { fromState: "RELEASE_READY", toState: "RELEASED", requiresApproval: false, allowedRoles: ["cpa"], requiresReason: false },
  { fromState: "RELEASED", toState: "ARCHIVED", requiresApproval: false, allowedRoles: ["cpa", "staff"], requiresReason: false },
  { fromState: "ESCALATED", toState: "INTAKE_ACTIVE", requiresApproval: false, allowedRoles: ["cpa", "staff"], requiresReason: false },
  { fromState: "ESCALATED", toState: "EVIDENCE_UNDER_REVIEW", requiresApproval: false, allowedRoles: ["cpa", "staff"], requiresReason: false },
  { fromState: "ESCALATED", toState: "READY_FOR_EXECUTION", requiresApproval: false, allowedRoles: ["cpa", "staff"], requiresReason: false },
  { fromState: "ROLLED_BACK", toState: "REVIEW_REQUIRED", requiresApproval: false, allowedRoles: ["cpa"], requiresReason: false },
];

export function getAvailableTransitions(
  fromState: EngagementState | string,
): WorkflowTransition[] {
  return WORKFLOW_TRANSITIONS.filter((t) => t.fromState === fromState);
}

export function findTransition(
  fromState: EngagementState | string,
  toState: EngagementState | string,
): WorkflowTransition | undefined {
  return WORKFLOW_TRANSITIONS.find(
    (t) => t.fromState === fromState && t.toState === toState,
  );
}

// Plain-English label for a transition button (user-verb, not system-verb).
// These are the "what I do" labels shown directly on buttons.
export function getTransitionLabel(toState: EngagementState | string): string {
  const labels: Record<string, string> = {
    INTAKE_ACTIVE: "Start intake",
    EVIDENCE_UNDER_REVIEW: "Begin document review",
    READY_FOR_EXECUTION: "Mark ready to start work",
    EXECUTION_ACTIVE: "Start the work",
    REVIEW_REQUIRED: "Send to me for review",
    APPROVED: "Approve and continue",
    RELEASE_READY: "Get ready to send",
    RELEASED: "Send to client",
    ESCALATED: "Flag this engagement",
    ROLLED_BACK: "Send back to the team",
    ARCHIVED: "Close engagement",
  };
  return labels[toState] ?? toState;
}
