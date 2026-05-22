-- supabase/seed.sql
--
-- Static seed data. This file ONLY contains the workflow_transitions rows —
-- they're identical to the INSERTs in migration 20260523000003. The INSERT
-- is wrapped in ON CONFLICT DO NOTHING because the migration may already
-- have created them, and `supabase db reset` runs migrations and then this
-- seed file. Keep them in sync if you ever edit the state machine.
--
-- Auth-dependent demo data (users, engagements, events, documents, approvals,
-- packets) is created by scripts/seed.ts because Supabase auth users must be
-- created via the Admin API.

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
('ROLLED_BACK','REVIEW_REQUIRED',false,'{cpa}',false)
ON CONFLICT (from_state, to_state) DO NOTHING;
