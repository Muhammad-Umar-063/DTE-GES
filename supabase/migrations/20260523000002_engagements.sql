-- B.2 — engagements: the firm's core unit of work (a tax return, a CFO report, etc).
-- The fk_cpa_approval FK is added in 20260523000004 once engagement_approvals exists.

CREATE TABLE engagements (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id     text UNIQUE NOT NULL,
  client_name       text NOT NULL,
  service_line      text NOT NULL,
  current_state     text NOT NULL DEFAULT 'INITIATED',
  current_phase     integer NOT NULL DEFAULT 0,
  tax_year          text,
  reporting_period  text,
  cpa_id            uuid REFERENCES public.users(id),
  cpa_approval_id   uuid,
  escalation_reason text,
  last_action       text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  CONSTRAINT valid_state CHECK (current_state IN (
    'INITIATED','INTAKE_ACTIVE','EVIDENCE_UNDER_REVIEW','READY_FOR_EXECUTION',
    'EXECUTION_ACTIVE','REVIEW_REQUIRED','APPROVED','RELEASE_READY',
    'RELEASED','ESCALATED','ROLLED_BACK','ARCHIVED'
  )),
  CONSTRAINT valid_phase CHECK (current_phase BETWEEN 0 AND 8)
);

ALTER TABLE engagements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "engagements_select" ON engagements
  FOR SELECT TO authenticated USING (true);
