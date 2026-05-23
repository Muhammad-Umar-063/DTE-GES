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
    label: "Initiated",
    dotColor: "#5C35A0",
    textColor: "text-purple",
    bgColor: "bg-purple-light",
  },
  INTAKE_ACTIVE: {
    label: "Intake Active",
    dotColor: "#1A5FB4",
    textColor: "text-primary",
    bgColor: "bg-blue-light",
  },
  EVIDENCE_UNDER_REVIEW: {
    label: "Evidence Review",
    dotColor: "#1A5FB4",
    textColor: "text-primary",
    bgColor: "bg-blue-light",
  },
  READY_FOR_EXECUTION: {
    label: "Ready for Execution",
    dotColor: "#174E96",
    textColor: "text-primary",
    bgColor: "bg-blue-light",
  },
  EXECUTION_ACTIVE: {
    label: "In Execution",
    dotColor: "#103E78",
    textColor: "text-primary",
    bgColor: "bg-blue-light",
  },
  REVIEW_REQUIRED: {
    label: "CPA Review Required",
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
    label: "Release Ready",
    dotColor: "#1B7D3A",
    textColor: "text-green",
    bgColor: "bg-green-light",
  },
  RELEASED: {
    label: "Released",
    dotColor: "#125827",
    textColor: "text-green",
    bgColor: "bg-green-light",
  },
  ESCALATED: {
    label: "Escalated",
    dotColor: "#B8002C",
    textColor: "text-red",
    bgColor: "bg-red-light",
  },
  ROLLED_BACK: {
    label: "Rolled Back",
    dotColor: "#8B5000",
    textColor: "text-amber",
    bgColor: "bg-amber-light",
  },
  ARCHIVED: {
    label: "Archived",
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
  { number: 1, label: "Evidence", states: ["EVIDENCE_UNDER_REVIEW"] },
  { number: 2, label: "Execution", states: ["READY_FOR_EXECUTION", "EXECUTION_ACTIVE"] },
  { number: 3, label: "Review", states: ["REVIEW_REQUIRED"] },
  { number: 4, label: "Approval", states: ["APPROVED"] },
  { number: 5, label: "Release", states: ["RELEASE_READY"] },
  { number: 6, label: "Packet", states: [] },
  { number: 7, label: "Delivery", states: ["RELEASED"] },
  { number: 8, label: "Archive", states: ["ARCHIVED"] },
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

// Plain-English label for a transition button.
export function getTransitionLabel(toState: EngagementState | string): string {
  const labels: Record<string, string> = {
    INTAKE_ACTIVE: "Start Intake",
    EVIDENCE_UNDER_REVIEW: "Send to Evidence Review",
    READY_FOR_EXECUTION: "Mark Evidence Complete",
    EXECUTION_ACTIVE: "Begin Execution",
    REVIEW_REQUIRED: "Send to CPA Review",
    APPROVED: "Approve & Move Forward",
    RELEASE_READY: "Prepare for Release",
    RELEASED: "Release to Client",
    ESCALATED: "Escalate",
    ROLLED_BACK: "Roll Back",
    ARCHIVED: "Archive",
  };
  return labels[toState] ?? toState;
}
