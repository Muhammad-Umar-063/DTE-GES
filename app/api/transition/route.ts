// POST /api/transition — SRS §9.1.
//
// Mirrors the Edge Function contract: same request shape, same response,
// same §14 error codes/copy. Role is read from the JWT via lib/auth.ts; the
// client body is never trusted to provide it.
//
// State change + audit event are atomic — the public.apply_transition RPC
// performs both writes in one Postgres function body (single transaction).
import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  errorBody,
  preflightTransition,
  type EngineErrorBody,
} from "@/lib/engine";
import { sendToTaxDome, updateHubSpot } from "@/lib/integrations";
import { generatePacketForEngagement, recordAutomationError } from "@/lib/packet";
import type { EngagementRow } from "@/lib/db-types";
import type { EngagementState } from "@/lib/supabase/database.types";

type RequestBody = {
  engagementId?: string;
  toState?: EngagementState;
  reason?: string;
  notes?: string;
};

function bad(status: number, body: EngineErrorBody) {
  return NextResponse.json(body, { status });
}

// Audit-only inserts for blocked attempts (no state change).
async function writeDenialEvent(
  supabase: ReturnType<typeof createClient>,
  args: {
    engagementId: string;
    userId: string;
    userRole: string;
    actionType: "transition_blocked" | "gate_blocked";
    fromState: EngagementState | null;
    toState: EngagementState | null;
    reason: string | undefined;
    errorCode: string;
  },
) {
  await supabase.from("engagement_events").insert({
    engagement_id: args.engagementId,
    user_id: args.userId,
    user_role: args.userRole,
    action_type: args.actionType,
    from_state: args.fromState,
    to_state: args.toState,
    notes: args.reason ?? null,
    metadata: { error: args.errorCode },
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return bad(401, {
      error: "insufficient_role",
      message: "Sign in to perform this action.",
    });
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return bad(400, errorBody("server_error"));
  }

  const { engagementId, toState, reason, notes } = body;
  if (!engagementId || !toState) {
    return bad(400, {
      error: "server_error",
      message: "engagementId and toState are required.",
    });
  }

  const supabase = createClient();

  const { data: engRow } = await supabase
    .from("engagements")
    .select("*")
    .eq("id", engagementId)
    .maybeSingle();
  const engagement = engRow as EngagementRow | null;

  // Pre-flight: invalid_transition / insufficient_role / gate_blocked / reason_required.
  const pre = await preflightTransition({
    engagement,
    toState,
    viewerRole: session.role,
    reason,
    hasActiveApproval: async () => {
      if (!engagement) return false;
      const { count } = await supabase
        .from("engagement_approvals")
        .select("*", { count: "exact", head: true })
        .eq("engagement_id", engagement.id)
        .eq("approval_type", "cpa_approval")
        .is("revoked_at", null);
      return (count ?? 0) > 0;
    },
  });

  if (!pre.ok) {
    // Write a denial audit row (engagement exists + we know who tried).
    if (engagement) {
      const denialType =
        pre.body.error === "gate_blocked" ? "gate_blocked" : "transition_blocked";
      // reason_required is also a transition_blocked (no state changed).
      await writeDenialEvent(supabase, {
        engagementId: engagement.id,
        userId: session.userId,
        userRole: session.role,
        actionType: denialType,
        fromState: engagement.current_state,
        toState,
        reason,
        errorCode: pre.body.error,
      });
    }
    return bad(pre.status, pre.body);
  }

  // Atomic state change + audit event via SECURITY DEFINER RPC.
  const { data: rpcData, error: rpcErr } = await supabase.rpc("apply_transition", {
    p_engagement_id: engagement!.id,
    p_to_state: toState,
    p_to_phase: pre.toPhase,
    p_user_id: session.userId,
    p_user_role: session.role,
    p_action_type: pre.actionType,
    p_from_state: engagement!.current_state,
    p_last_action: pre.lastAction,
    p_escalation_reason: pre.escalationReason,
    p_notes: notes ?? null,
    p_metadata: reason ? { reason } : null,
  });

  if (rpcErr) {
    return bad(500, errorBody("server_error"));
  }

  // RELEASED side-effects: packet generation → TaxDome delivery → HubSpot sync.
  // These are appended AFTER the atomic state-change transaction has committed.
  // A failure in any step writes an `automation_error` event and does NOT roll
  // back the release (the audit trail keeps the full story).
  if (toState === "RELEASED") {
    const updatedEngagement = (rpcData as EngagementRow | null) ?? engagement!;
    let packetId: string | null = null;
    try {
      const packet = await generatePacketForEngagement(
        supabase,
        updatedEngagement,
        session.userId,
        session.role,
      );
      packetId = packet.packetId;
    } catch (err) {
      await recordAutomationError(
        supabase,
        updatedEngagement,
        session.userId,
        session.role,
        "generate_packet",
        err,
      );
    }

    if (packetId) {
      try {
        await sendToTaxDome(
          supabase,
          updatedEngagement,
          { packetId },
          session.userId,
          session.role,
        );
      } catch (err) {
        await recordAutomationError(
          supabase,
          updatedEngagement,
          session.userId,
          session.role,
          "taxdome_send",
          err,
        );
      }
    }

    try {
      await updateHubSpot(
        supabase,
        updatedEngagement,
        session.userId,
        session.role,
      );
    } catch (err) {
      await recordAutomationError(
        supabase,
        updatedEngagement,
        session.userId,
        session.role,
        "hubspot_update",
        err,
      );
    }
  }

  return NextResponse.json({ engagement: rpcData });
}
