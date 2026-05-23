// POST /api/auth/log-session
//
// Records a sign_in or sign_out event into public.user_sessions. Called from
// the login form right after a successful signInWithPassword (the auth cookie
// is set so getSession() resolves the user), and from the sign-out handler
// before the session is destroyed.
import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Body = { event?: "sign_in" | "sign_out" };

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  if (body.event !== "sign_in" && body.event !== "sign_out") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;
  const userAgent = req.headers.get("user-agent") ?? null;

  const supabase = createClient();
  const { error } = await supabase.from("user_sessions").insert({
    user_id: session.userId,
    user_role: session.role,
    event_type: body.event,
    ip_address: ip,
    user_agent: userAgent,
  });

  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
