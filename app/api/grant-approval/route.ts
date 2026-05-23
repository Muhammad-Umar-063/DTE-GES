// POST /api/grant-approval — SRS §9.2.
//
// Only role=cpa may call this. Engagement must be in REVIEW_REQUIRED and
// must not already carry an active (non-revoked) approval.
//
// The grant_approval RPC writes the approval row, patches
// engagements.cpa_approval_id, and inserts the approval_granted audit event
// in a single transaction.
import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { errorBody, type EngineErrorBody } from "@/lib/engine";
import type { EngagementRow } from "@/lib/db-types";

type RequestBody = {
  engagementId?: string;
  notes?: string;
};

function bad(status: number, body: EngineErrorBody) {
  return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return bad(401, {
      error: "insufficient_role",
      message: "Sign in to perform this action.",
    });
  }
  if (session.role !== "cpa") {
    return bad(403, errorBody("insufficient_role"));
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return bad(400, errorBody("server_error"));
  }

  const { engagementId, notes } = body;
  if (!engagementId) {
    return bad(400, {
      error: "server_error",
      message: "engagementId is required.",
    });
  }

  const supabase = createClient();

  const { data: engRow } = await supabase
    .from("engagements")
    .select("*")
    .eq("id", engagementId)
    .maybeSingle();
  const engagement = engRow as EngagementRow | null;
  if (!engagement) {
    return bad(404, {
      error: "server_error",
      message: "We could not find that engagement.",
    });
  }
  if (engagement.current_state !== "REVIEW_REQUIRED") {
    return bad(409, {
      error: "server_error",
      message:
        "This engagement is not awaiting CPA review, so no approval can be recorded.",
    });
  }

  // Reject if an active approval already exists.
  const { count: activeCount } = await supabase
    .from("engagement_approvals")
    .select("*", { count: "exact", head: true })
    .eq("engagement_id", engagement.id)
    .eq("approval_type", "cpa_approval")
    .is("revoked_at", null);
  if ((activeCount ?? 0) > 0) {
    return bad(409, {
      error: "server_error",
      message: "An active CPA approval already exists for this engagement.",
    });
  }

  const { data: rpcData, error: rpcErr } = await supabase.rpc("grant_approval", {
    p_engagement_id: engagement.id,
    p_approver_id: session.userId,
    p_approver_role: session.role,
    p_approval_notes: notes ?? null,
  });

  if (rpcErr) {
    return bad(500, errorBody("server_error"));
  }

  return NextResponse.json({ approval: rpcData });
}
