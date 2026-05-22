-- B.5 — engagement_events: APPEND-ONLY audit log. This is the system's central
-- governance guarantee — every state transition, approval, escalation, AI generation,
-- and document event is recorded here and never modified.
--
-- IMPORTANT: Only INSERT and SELECT policies exist. There is intentionally
-- NO UPDATE policy and NO DELETE policy for ANY role. Do not add one.
-- The append-only guarantee is enforced at the RLS layer because that is the
-- last line of defense any client (server route, edge function, RPC) hits.

CREATE TABLE engagement_events (
  event_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id   uuid NOT NULL REFERENCES engagements(id),
  timestamp       timestamptz NOT NULL DEFAULT now(),
  user_id         uuid REFERENCES public.users(id),
  user_role       text NOT NULL,
  action_type     text NOT NULL,
  from_state      text,
  to_state        text,
  ai_assisted     boolean NOT NULL DEFAULT false,
  prompt_ref      text,
  metadata        jsonb,
  notes           text,
  CONSTRAINT valid_action CHECK (action_type IN (
    'engagement_created','stage_transition','approval_granted','approval_revoked',
    'escalation_created','escalation_resolved','gate_blocked','transition_blocked',
    'ai_generation','document_uploaded','document_flagged','packet_generated',
    'taxdome_sent','hubspot_updated','automation_triggered','automation_error'
  ))
);

ALTER TABLE engagement_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_insert" ON engagement_events
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "events_select" ON engagement_events
  FOR SELECT TO authenticated USING (true);

-- Intentionally NO UPDATE policy and NO DELETE policy for any role. Do not add one.
