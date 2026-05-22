// Server-side auth helper. Resolves the current Supabase user + their app role.
//
// Role resolution prefers the `user_role` claim injected by the access-token
// hook (lib/supabase/access_token_hook migration). If the hook isn't enabled
// in the Supabase dashboard yet, we fall back to a one-row SELECT from
// public.users so later phases keep working. The fallback is intentional —
// the system should never silently default someone to a higher role.
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/supabase/database.types";

export type SessionContext = {
  userId: string;
  email: string;
  role: AppRole;
  fullName: string | null;
};

function parseJwtClaims(accessToken: string): Record<string, unknown> | null {
  try {
    const payload = accessToken.split(".")[1];
    if (!payload) return null;
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const decoded = Buffer.from(
      padded.replace(/-/g, "+").replace(/_/g, "/"),
      "base64",
    ).toString("utf8");
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function isAppRole(value: unknown): value is AppRole {
  return value === "cpa" || value === "staff" || value === "admin";
}

export async function getSession(): Promise<SessionContext | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Prefer the JWT custom claim if the access-token hook is enabled.
  let role: AppRole | null = null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    const claims = parseJwtClaims(session.access_token);
    const claimRole = claims?.["user_role"];
    if (isAppRole(claimRole)) role = claimRole;
  }

  // Fallback: read role from public.users.
  let fullName: string | null = null;
  if (!role || !user.email) {
    const { data: profile } = await supabase
      .from("users")
      .select("role, full_name, email")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      fullName = profile.full_name ?? null;
      if (!role && isAppRole(profile.role)) role = profile.role;
    }
  } else {
    const { data: profile } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();
    fullName = profile?.full_name ?? null;
  }

  if (!role) return null;

  return {
    userId: user.id,
    email: user.email ?? "",
    role,
    fullName,
  };
}
