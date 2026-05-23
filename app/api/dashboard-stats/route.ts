// GET /api/dashboard-stats — the 4 dashboard counts. Used by <StatRow>'s
// realtime refresh after an engagements change.
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchDashboardCounts } from "@/lib/data/engagements";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const counts = await fetchDashboardCounts();
  return NextResponse.json({ counts });
}
