-- B.7 — runtime_packets: serialised engagement state assembled for downstream
-- systems (TaxDome, HubSpot) and replay. JSONB columns hold evidence refs,
-- approval history, escalation history, outputs, KPIs, and version history.

CREATE TABLE runtime_packets (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  packet_id           text UNIQUE NOT NULL,
  engagement_id       uuid NOT NULL REFERENCES engagements(id),
  service_line_id     text NOT NULL,
  workflow_state      text NOT NULL,
  evidence_refs       jsonb,
  approval_history    jsonb,
  escalation_history  jsonb,
  output_refs         jsonb,
  kpi_refs            jsonb,
  version_history     jsonb,
  compression_state   text DEFAULT 'OPERATIONAL',
  replay_metadata     jsonb,
  ai_assisted         boolean DEFAULT false,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

ALTER TABLE runtime_packets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "packets_select" ON runtime_packets
  FOR SELECT TO authenticated USING (true);
