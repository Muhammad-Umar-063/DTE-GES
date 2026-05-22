-- C.2 — Custom Access Token Hook: injects `user_role` from public.users into
-- every JWT Supabase Auth issues. Once enabled in the dashboard (Authentication
-- → Hooks → Custom Access Token), Phases 2–4 can read role from the JWT claim
-- without an extra DB round-trip. lib/auth.ts still falls back to a table read
-- if the claim is missing, so this hook can be enabled at any time.
--
-- Signature follows the Supabase spec:
--   input  = jsonb { user_id, claims, authentication_method }
--   output = jsonb same shape with mutated `claims`
-- See https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims    jsonb;
  user_role text;
BEGIN
  claims := event->'claims';

  SELECT role
    INTO user_role
    FROM public.users
    WHERE id = (event->>'user_id')::uuid;

  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  ELSE
    claims := jsonb_set(claims, '{user_role}', 'null'::jsonb);
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Grant supabase_auth_admin the right to call the hook and read the table.
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM authenticated, anon, public;

GRANT SELECT ON TABLE public.users TO supabase_auth_admin;

-- Let the auth admin bypass RLS on public.users (only for this hook's table read).
CREATE POLICY "auth_admin_read_users" ON public.users
  FOR SELECT TO supabase_auth_admin USING (true);
