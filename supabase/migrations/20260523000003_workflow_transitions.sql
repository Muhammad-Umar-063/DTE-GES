-- B.3 — workflow_transitions: declarative state machine. 20 rows below define every
-- legal stage→stage move, who may make it, and whether approval/reason is required.
-- Do not alter, drop, or re-order these rows; the Phase 2 transition engine reads them directly.

CREATE TABLE workflow_transitions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_state        text NOT NULL,
  to_state          text NOT NULL,
  requires_approval boolean NOT NULL DEFAULT false,
  allowed_roles     text[] NOT NULL DEFAULT '{cpa,staff}',
  requires_reason   boolean NOT NULL DEFAULT false,
  created_at        timestamptz DEFAULT now(),
  UNIQUE(from_state, to_state)
);

ALTER TABLE workflow_transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transitions_select" ON workflow_transitions
  FOR SELECT TO authenticated USING (true);

INSERT INTO workflow_transitions (from_state, to_state, requires_approval, allowed_roles, requires_reason) VALUES
('INITIATED','INTAKE_ACTIVE',false,'{cpa,staff}',false),
('INTAKE_ACTIVE','EVIDENCE_UNDER_REVIEW',false,'{cpa,staff}',false),
('INTAKE_ACTIVE','ESCALATED',false,'{cpa,staff}',true),
('EVIDENCE_UNDER_REVIEW','READY_FOR_EXECUTION',false,'{cpa,staff}',false),
('EVIDENCE_UNDER_REVIEW','INTAKE_ACTIVE',false,'{cpa,staff}',true),
('EVIDENCE_UNDER_REVIEW','ESCALATED',false,'{cpa,staff}',true),
('READY_FOR_EXECUTION','EXECUTION_ACTIVE',false,'{cpa}',false),
('READY_FOR_EXECUTION','ESCALATED',false,'{cpa,staff}',true),
('EXECUTION_ACTIVE','REVIEW_REQUIRED',false,'{cpa}',false),
('EXECUTION_ACTIVE','ESCALATED',false,'{cpa,staff}',true),
('REVIEW_REQUIRED','APPROVED',true,'{cpa}',false),
('REVIEW_REQUIRED','ROLLED_BACK',false,'{cpa}',true),
('REVIEW_REQUIRED','ESCALATED',false,'{cpa,staff}',true),
('APPROVED','RELEASE_READY',false,'{cpa}',false),
('RELEASE_READY','RELEASED',false,'{cpa}',false),
('RELEASED','ARCHIVED',false,'{cpa,staff}',false),
('ESCALATED','INTAKE_ACTIVE',false,'{cpa,staff}',false),
('ESCALATED','EVIDENCE_UNDER_REVIEW',false,'{cpa,staff}',false),
('ESCALATED','READY_FOR_EXECUTION',false,'{cpa,staff}',false),
('ROLLED_BACK','REVIEW_REQUIRED',false,'{cpa}',false);
