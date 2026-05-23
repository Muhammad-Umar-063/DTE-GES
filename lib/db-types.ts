// Narrow row types for the Phase 1 schema. Kept hand-written; will be replaced
// with `supabase gen types typescript` output later if the schema grows.
import type {
  AppRole,
  DocumentStatus,
  EngagementState,
  EventActionType,
} from "@/lib/supabase/database.types";

export type EngagementRow = {
  id: string;
  engagement_id: string;
  client_name: string;
  service_line: string;
  current_state: EngagementState;
  current_phase: number;
  tax_year: string | null;
  reporting_period: string | null;
  cpa_id: string | null;
  cpa_approval_id: string | null;
  escalation_reason: string | null;
  last_action: string | null;
  created_at: string;
  updated_at: string;
};

export type EngagementEventRow = {
  event_id: string;
  engagement_id: string;
  timestamp: string;
  user_id: string | null;
  user_role: AppRole | string;
  action_type: EventActionType | string;
  from_state: string | null;
  to_state: string | null;
  ai_assisted: boolean;
  prompt_ref: string | null;
  metadata: Record<string, unknown> | null;
  notes: string | null;
};

export type EngagementApprovalRow = {
  id: string;
  engagement_id: string;
  approved_by: string;
  approval_type: string;
  approval_notes: string | null;
  revoked_at: string | null;
  revoked_reason: string | null;
  created_at: string;
};

export type DocumentRow = {
  id: string;
  engagement_id: string;
  document_name: string;
  document_type: string;
  status: DocumentStatus;
  received_at: string | null;
  notes: string | null;
  created_at: string;
};

export type RuntimePacketRow = {
  id: string;
  packet_id: string;
  engagement_id: string;
  service_line_id: string;
  workflow_state: string;
  evidence_refs: Record<string, unknown> | null;
  approval_history: unknown[] | null;
  escalation_history: unknown[] | null;
  output_refs: Record<string, unknown> | null;
  kpi_refs: Record<string, unknown> | null;
  version_history: unknown[] | null;
  compression_state: string | null;
  replay_metadata: Record<string, unknown> | null;
  ai_assisted: boolean | null;
  created_at: string;
  updated_at: string;
};
