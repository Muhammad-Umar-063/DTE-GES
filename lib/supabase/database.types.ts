// Minimal hand-written Database type for Phase 1. Extend / regenerate with
// `supabase gen types typescript` once the schema stabilises.
export type AppRole = "cpa" | "staff" | "admin";

export type EngagementState =
  | "INITIATED"
  | "INTAKE_ACTIVE"
  | "EVIDENCE_UNDER_REVIEW"
  | "READY_FOR_EXECUTION"
  | "EXECUTION_ACTIVE"
  | "REVIEW_REQUIRED"
  | "APPROVED"
  | "RELEASE_READY"
  | "RELEASED"
  | "ESCALATED"
  | "ROLLED_BACK"
  | "ARCHIVED";

export type DocumentStatus = "received" | "missing" | "pending" | "flagged";

export type EventActionType =
  | "engagement_created"
  | "stage_transition"
  | "approval_granted"
  | "approval_revoked"
  | "escalation_created"
  | "escalation_resolved"
  | "gate_blocked"
  | "transition_blocked"
  | "ai_generation"
  | "document_uploaded"
  | "document_flagged"
  | "packet_generated"
  | "taxdome_sent"
  | "hubspot_updated"
  | "automation_triggered"
  | "automation_error";
