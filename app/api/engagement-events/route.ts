// Lightweight read-only endpoint for client-side fetches (replay modal,
// future audit panels). Honors the user's session via @supabase/ssr; RLS
// keeps it safe — engagement_events has a SELECT policy for authenticated.
import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const engagementId = req.nextUrl.searchParams.get("engagementId");
  if (!engagementId) {
    return NextResponse.json({ error: "missing_param" }, { status: 400 });
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("engagement_events")
    .select("*")
    .eq("engagement_id", engagementId)
    .order("timestamp", { ascending: true });
  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  return NextResponse.json({ events: data });
}
