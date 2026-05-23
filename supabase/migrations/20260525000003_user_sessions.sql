-- User session log (sign-in / sign-out). Append-only like engagement_events.
-- Tracks who logged in, when, from what IP / user-agent. Kept separate from
-- engagement_events so engagement audit queries don't surface login noise and
-- so the engagement-events schema (which requires engagement_id) is untouched.

CREATE TABLE user_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_role   text NOT NULL,
  event_type  text NOT NULL CHECK (event_type IN ('sign_in','sign_out')),
  ip_address  text,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_sessions_select" ON user_sessions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "user_sessions_insert" ON user_sessions
  FOR INSERT TO authenticated WITH CHECK (true);

-- Intentionally NO UPDATE policy and NO DELETE policy for any role.
-- Login records are immutable, same guarantee as engagement_events.

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_created_at ON user_sessions(created_at DESC);
