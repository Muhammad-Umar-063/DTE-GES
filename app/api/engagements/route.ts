// GET /api/engagements?scope=active&filter=needs-approval
// Client-side refetch endpoint used by the realtime <EngagementTable>.
// Honors the user's session via @supabase/ssr; RLS keeps it safe (engagements
// has a SELECT-for-authenticated policy).
import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { fetchEngagements, type EngagementScope } from "@/lib/data/engagements";
import type { FilterKey } from "@/components/engagements/EngagementFilterPills";

const VALID_SCOPES: EngagementScope[] = ["active", "all"];
const VALID_FILTERS: FilterKey[] = [
  "all",
  "needs-approval",
  "escalated",
  "in-execution",
  "ready-for-release",
];

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const scopeRaw = req.nextUrl.searchParams.get("scope") ?? "active";
  const filterRaw = req.nextUrl.searchParams.get("filter") ?? "all";

  const scope: EngagementScope = (VALID_SCOPES as string[]).includes(scopeRaw)
    ? (scopeRaw as EngagementScope)
    : "active";
  const filter: FilterKey = (VALID_FILTERS as string[]).includes(filterRaw)
    ? (filterRaw as FilterKey)
    : "all";

  const rows = await fetchEngagements({ scope, filter });
  return NextResponse.json({ engagements: rows });
}
