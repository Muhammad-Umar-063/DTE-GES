-- B.4 — engagement_approvals: immutable record of CPA approvals.
-- INSERT + SELECT only via RLS. Revocation (writing revoked_at) is done by the
-- service role in Phase 2, never by an authenticated user.
-- After the table exists we add the deferred fk_cpa_approval FK back onto engagements.

CREATE TABLE engagement_approvals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id   uuid NOT NULL REFERENCES engagements(id),
  approved_by     uuid NOT NULL REFERENCES public.users(id),
  approval_type   text NOT NULL DEFAULT 'cpa_approval',
  approval_notes  text,
  revoked_at      timestamptz,
  revoked_reason  text,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE engagement_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approvals_select" ON engagement_approvals
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "approvals_insert" ON engagement_approvals
  FOR INSERT TO authenticated WITH CHECK (true);
-- No UPDATE / DELETE policies. Revocation (a column write) is done by the service role.

-- Deferred FK from B.2.
ALTER TABLE engagements
  ADD CONSTRAINT fk_cpa_approval
  FOREIGN KEY (cpa_approval_id) REFERENCES engagement_approvals(id);
