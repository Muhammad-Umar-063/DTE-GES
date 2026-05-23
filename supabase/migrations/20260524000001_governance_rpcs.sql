-- Phase 2 — Governance engine RPCs.
--
-- These are SECURITY DEFINER functions called by the /api/transition and
-- /api/grant-approval handlers. The handler does the JWT-based role check
-- and all business logic (workflow_transitions lookup, gate check, reason
-- validation); the RPC does ONLY the writes, atomically.
--
-- "Atomically" matters because the SRS demands that a state change never
-- happen without its audit event. A Postgres function body runs in a single
-- transaction by default, so if the INSERT into engagement_events fails, the
-- UPDATE on engagements rolls back along with it.

-- ─────────────────────────────────────────────────────────────
-- apply_transition: state change + audit event + packet refresh
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.apply_transition(
  p_engagement_id     uuid,
  p_to_state          text,
  p_to_phase          integer,
  p_user_id           uuid,
  p_user_role         text,
  p_action_type       text,
  p_from_state        text,
  p_last_action       text,
  p_escalation_reason text,
  p_notes             text,
  p_metadata          jsonb
)
RETURNS engagements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_row engagements;
BEGIN
  UPDATE engagements
  SET
    current_state     = p_to_state,
    current_phase     = p_to_phase,
    last_action       = p_last_action,
    escalation_reason = p_escalation_reason,
    updated_at        = now()
  WHERE id = p_engagement_id
  RETURNING * INTO updated_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'engagement not found: %', p_engagement_id
      USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO engagement_events (
    engagement_id, user_id, user_role, action_type,
    from_state,    to_state, notes,     metadata
  ) VALUES (
    p_engagement_id, p_user_id, p_user_role, p_action_type,
    p_from_state,    p_to_state, p_notes,    p_metadata
  );

  UPDATE runtime_packets
  SET    workflow_state = p_to_state,
         updated_at     = now()
  WHERE  engagement_id  = p_engagement_id;

  RETURN updated_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_transition(
  uuid, text, integer, uuid, text, text, text, text, text, text, jsonb
) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_transition(
  uuid, text, integer, uuid, text, text, text, text, text, text, jsonb
) FROM anon, public;

-- ─────────────────────────────────────────────────────────────
-- grant_approval: approval row + engagements.cpa_approval_id + audit event
-- ─────────────────────────────────────────────────────────────
-- All three writes atomic. The handler verifies role=cpa and current state
-- before calling; the RPC trusts that (SECURITY DEFINER + GRANT to
-- authenticated keeps it out of reach of anon callers).

CREATE OR REPLACE FUNCTION public.grant_approval(
  p_engagement_id uuid,
  p_approver_id   uuid,
  p_approver_role text,
  p_approval_notes text
)
RETURNS engagement_approvals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_approval engagement_approvals;
BEGIN
  INSERT INTO engagement_approvals (
    engagement_id, approved_by, approval_type, approval_notes
  ) VALUES (
    p_engagement_id, p_approver_id, 'cpa_approval', p_approval_notes
  )
  RETURNING * INTO new_approval;

  UPDATE engagements
  SET    cpa_approval_id = new_approval.id,
         updated_at      = now()
  WHERE  id              = p_engagement_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'engagement not found: %', p_engagement_id
      USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO engagement_events (
    engagement_id, user_id, user_role, action_type, notes, metadata
  ) VALUES (
    p_engagement_id, p_approver_id, p_approver_role,
    'approval_granted', p_approval_notes,
    jsonb_build_object('approval_id', new_approval.id)
  );

  RETURN new_approval;
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_approval(uuid, uuid, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_approval(uuid, uuid, text, text) FROM anon, public;
