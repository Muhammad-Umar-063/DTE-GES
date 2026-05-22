-- B.6 — documents: evidence inventory per engagement.

CREATE TABLE documents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id   uuid NOT NULL REFERENCES engagements(id),
  document_name   text NOT NULL,
  document_type   text NOT NULL,
  status          text NOT NULL DEFAULT 'pending',
  received_at     timestamptz,
  notes           text,
  created_at      timestamptz DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('received','missing','pending','flagged'))
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_select" ON documents
  FOR SELECT TO authenticated USING (true);
