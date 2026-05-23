// POST /api/generate-packet — SRS §9.3.
//
// Drafts a delivery packet (Claude if ANTHROPIC_API_KEY is set, otherwise a
// realistic template), upserts into runtime_packets.output_refs, writes
// `ai_generation` + `packet_generated` events, and then mock-delivers via
// TaxDome (writes `taxdome_sent`). Auth and role verified via lib/auth.ts.
import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { generatePacketForEngagement, recordAutomationError } from "@/lib/packet";
import { sendToTaxDome } from "@/lib/integrations";
import type { EngagementRow } from "@/lib/db-types";

type RequestBody = {
  engagementId?: string;
  packetType?: string;
};

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "insufficient_role", message: "Sign in to perform this action." },
      { status: 401 },
    );
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { error: "server_error", message: "Invalid request body." },
      { status: 400 },
    );
  }

  if (!body.engagementId) {
    return NextResponse.json(
      { error: "server_error", message: "engagementId is required." },
      { status: 400 },
    );
  }

  const supabase = createClient();
  const { data: engRow } = await supabase
    .from("engagements")
    .select("*")
    .eq("id", body.engagementId)
    .maybeSingle();
  const engagement = engRow as EngagementRow | null;
  if (!engagement) {
    return NextResponse.json(
      { error: "engagement_not_found", message: "We could not find that engagement." },
      { status: 404 },
    );
  }

  try {
    const packet = await generatePacketForEngagement(
      supabase,
      engagement,
      session.userId,
      session.role,
    );

    // Mock-deliver to TaxDome so the audit trail tells the whole story
    // even when generate-packet is invoked directly (outside the RELEASED branch).
    try {
      await sendToTaxDome(
        supabase,
        engagement,
        { packetId: packet.packetId },
        session.userId,
        session.role,
      );
    } catch (err) {
      await recordAutomationError(
        supabase,
        engagement,
        session.userId,
        session.role,
        "taxdome_send",
        err,
      );
    }

    return NextResponse.json({
      packetId: packet.packetId,
      aiUsed: packet.aiUsed,
      model: packet.model,
      promptRef: packet.promptRef,
    });
  } catch (err) {
    await recordAutomationError(
      supabase,
      engagement,
      session.userId,
      session.role,
      "generate_packet",
      err,
    );
    return NextResponse.json(
      {
        error: "server_error",
        message:
          "Something went wrong generating the packet. Please try again.",
      },
      { status: 500 },
    );
  }
}
