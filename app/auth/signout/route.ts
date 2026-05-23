import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  // Log the sign-out BEFORE clearing the session — otherwise getSession()
  // would return null and we'd lose the user_id / role for the audit row.
  const session = await getSession();
  const supabase = createClient();

  if (session) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      null;
    const userAgent = request.headers.get("user-agent") ?? null;

    await supabase.from("user_sessions").insert({
      user_id: session.userId,
      user_role: session.role,
      event_type: "sign_out",
      ip_address: ip,
      user_agent: userAgent,
    });
  }

  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), {
    status: 303,
  });
}
