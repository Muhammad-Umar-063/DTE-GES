-- Phase 4 — Permit INSERT/UPDATE on runtime_packets for authenticated callers.
--
-- The Phase-1 schema enabled RLS on runtime_packets with only a SELECT policy
-- (since Phase 1 only ever read packets — the Kessler seed packet was inserted
-- via the service role at seed time). Phase 4 generates packets from the
-- governance engine using the user's session-authenticated server client, so
-- we need INSERT and UPDATE policies.
--
-- The transition handler still enforces authorization (must be a CPA who
-- successfully transitioned to RELEASED, or a valid /api/generate-packet
-- caller) before we ever reach this insert; the policies below intentionally
-- permit any authenticated caller because the application layer holds the
-- governance — same pattern as `engagement_approvals_insert` from Phase 1.
--
-- DELETE remains denied for everyone (no policy).

CREATE POLICY "packets_insert" ON runtime_packets
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "packets_update" ON runtime_packets
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
