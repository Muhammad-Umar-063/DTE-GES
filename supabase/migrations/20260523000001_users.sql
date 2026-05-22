-- B.1 — public.users: application profile, mirrors auth.users
-- Holds the firm's roles (cpa / staff / admin) used by RLS and route protection.

CREATE TABLE public.users (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text UNIQUE NOT NULL,
  full_name   text NOT NULL,
  role        text NOT NULL DEFAULT 'staff',
  created_at  timestamptz DEFAULT now(),
  CONSTRAINT valid_role CHECK (role IN ('cpa','staff','admin'))
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select" ON public.users
  FOR SELECT TO authenticated USING (true);
