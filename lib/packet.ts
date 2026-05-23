// Server-side packet generation: shared between /api/generate-packet and the
// RELEASED branch in /api/transition. With ANTHROPIC_API_KEY set we draft the
// packet text via Claude; without it we produce a structured template. Both
// paths write `runtime_packets.output_refs` and an `ai_generation` audit
// event so the trail is consistent.
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DocumentRow,
  EngagementApprovalRow,
  EngagementRow,
  RuntimePacketRow,
} from "@/lib/db-types";
import { getServiceLineName } from "@/lib/workflow";

// Pick a current Sonnet snapshot. See README for swapping models.
const CLAUDE_MODEL = "claude-sonnet-4-6";
const PROMPT_REF = "packet_draft_v1";

export type GeneratedPacket = {
  packetId: string;
  packetText: string;
  promptRef: string;
  aiUsed: boolean;
  model: string;
};

function buildPrompt(
  engagement: EngagementRow,
  documents: DocumentRow[],
  approvals: EngagementApprovalRow[],
): { system: string; user: string } {
  const docLines = documents.length
    ? documents
        .map(
          (d) =>
            `- ${d.document_name} (${d.document_type}, status: ${d.status})`,
        )
        .join("\n")
    : "- (no documents on file)";

  const approvalLines = approvals.length
    ? approvals
        .map(
          (a) =>
            `- ${a.approval_type} on ${new Date(a.created_at).toLocaleDateString()}` +
            (a.approval_notes ? ` — ${a.approval_notes}` : ""),
        )
        .join("\n")
    : "- (no recorded approvals)";

  const system = [
    "You draft client-facing summary packets for a CPA firm's engagements.",
    "You produce concise, factual narrative — never invent facts, dates, dollar amounts,",
    "or document contents. Stay within the data provided. Output plain text with light",
    "section headings. No markdown bullets in the prose itself. Roughly 250–400 words.",
  ].join(" ");

  const user = `
You are drafting the final delivery packet for the following engagement.

Engagement ID: ${engagement.engagement_id}
Client: ${engagement.client_name}
Service Line: ${engagement.service_line} — ${getServiceLineName(engagement.service_line)}
Tax Year / Reporting Period: ${engagement.tax_year ?? engagement.reporting_period ?? "N/A"}
Current State: ${engagement.current_state}

Documents on file:
${docLines}

Approval history:
${approvalLines}

Produce a delivery packet narrative that covers:
1. Engagement Summary
2. Documents Reviewed
3. Approvals & Governance
4. Scope of Delivery
5. Next Steps for the Client

Keep it neutral, professional, and grounded only in the data above.
`.trim();

  return { system, user };
}

function buildTemplatePacket(
  engagement: EngagementRow,
  documents: DocumentRow[],
  approvals: EngagementApprovalRow[],
): string {
  const period =
    engagement.tax_year ?? engagement.reporting_period ?? "the current period";
  const received = documents.filter((d) => d.status === "received");
  const missing = documents.filter((d) => d.status === "missing");
  const approvalCount = approvals.length;

  return [
    `ENGAGEMENT SUMMARY`,
    `${engagement.client_name} — ${engagement.service_line} ${getServiceLineName(engagement.service_line)}.`,
    `Engagement ${engagement.engagement_id} covered ${period}. The engagement reached the release stage on ${new Date(engagement.updated_at).toLocaleDateString()}.`,
    ``,
    `DOCUMENTS REVIEWED`,
    received.length > 0
      ? `The following items were received and reviewed: ${received.map((d) => d.document_name).join(", ")}.`
      : `No documents were marked received for this engagement.`,
    missing.length > 0
      ? `Outstanding items at release: ${missing.map((d) => d.document_name).join(", ")}.`
      : `No outstanding items at release.`,
    ``,
    `APPROVALS & GOVERNANCE`,
    approvalCount > 0
      ? `CPA approval was recorded ${approvalCount === 1 ? "once" : `${approvalCount} times`} for this engagement, in line with firm governance policy. The complete audit trail is preserved in the engagement_events log.`
      : `No formal CPA approval was recorded; release was processed under standing policy.`,
    ``,
    `SCOPE OF DELIVERY`,
    `This packet conveys the firm's work product for ${engagement.client_name} under service line ${engagement.service_line}. All decisions and movements were governed by the firm's state machine and remain auditable.`,
    ``,
    `NEXT STEPS FOR THE CLIENT`,
    `Please review the attached materials. If you have any questions, contact your engagement CPA. The packet has been transmitted to TaxDome and the firm's CRM record has been updated to reflect delivery.`,
  ].join("\n");
}

async function callClaude(prompt: {
  system: string;
  user: string;
}): Promise<string> {
  // Lazily load the SDK so projects without the package install still build.
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const result = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system: prompt.system,
    messages: [{ role: "user", content: prompt.user }],
  });
  // Concatenate text blocks; ignore tool/non-text content (we don't request any).
  return result.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
}

export async function generatePacketForEngagement(
  supabase: SupabaseClient,
  engagement: EngagementRow,
  actorUserId: string | null,
  actorRole: string,
): Promise<GeneratedPacket> {
  // Pull supporting data.
  const [{ data: docData }, { data: apprData }] = await Promise.all([
    supabase
      .from("documents")
      .select("*")
      .eq("engagement_id", engagement.id),
    supabase
      .from("engagement_approvals")
      .select("*")
      .eq("engagement_id", engagement.id)
      .is("revoked_at", null),
  ]);
  const documents = (docData ?? []) as DocumentRow[];
  const approvals = (apprData ?? []) as EngagementApprovalRow[];

  const hasKey = !!process.env.ANTHROPIC_API_KEY;
  const prompt = buildPrompt(engagement, documents, approvals);

  let packetText: string;
  let aiUsed = false;
  if (hasKey) {
    try {
      packetText = await callClaude(prompt);
      aiUsed = true;
    } catch (err) {
      console.error("Claude API call failed, falling back to template:", err);
      packetText = buildTemplatePacket(engagement, documents, approvals);
    }
  } else {
    packetText = buildTemplatePacket(engagement, documents, approvals);
  }

  // Upsert the runtime_packets row.
  const packetId = `PKT-${engagement.engagement_id.replace(/^ENG-/, "")}-${Date.now().toString(36).toUpperCase()}`;
  const { data: existing } = await supabase
    .from("runtime_packets")
    .select("*")
    .eq("engagement_id", engagement.id)
    .maybeSingle();
  const existingPacket = existing as RuntimePacketRow | null;

  const outputRefs = {
    packet_text: packetText,
    drafted_at: new Date().toISOString(),
    model: aiUsed ? CLAUDE_MODEL : "template_v1",
    ai_used: aiUsed,
    prompt_ref: PROMPT_REF,
  };

  let finalPacketId: string;
  if (existingPacket) {
    finalPacketId = existingPacket.packet_id;
    await supabase
      .from("runtime_packets")
      .update({
        output_refs: outputRefs,
        ai_assisted: aiUsed,
        workflow_state: engagement.current_state,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingPacket.id);
  } else {
    finalPacketId = packetId;
    await supabase.from("runtime_packets").insert({
      packet_id: packetId,
      engagement_id: engagement.id,
      service_line_id: engagement.service_line,
      workflow_state: engagement.current_state,
      evidence_refs: {
        documents: documents.map((d) => ({
          name: d.document_name,
          type: d.document_type,
          status: d.status,
        })),
      },
      approval_history: approvals.map((a) => ({
        approved_by: a.approved_by,
        approval_type: a.approval_type,
        approved_at: a.created_at,
        notes: a.approval_notes,
      })),
      escalation_history: [],
      output_refs: outputRefs,
      kpi_refs: { document_count: documents.length, approval_count: approvals.length },
      version_history: [{ version: 1, created_at: new Date().toISOString() }],
      compression_state: "OPERATIONAL",
      replay_metadata: { last_replay_at: null },
      ai_assisted: aiUsed,
    });
  }

  // Two audit events: the AI-drafted generation (with prompt_ref + ai_assisted),
  // and a packet_generated event so the trail tells "AI generated → packet stored".
  await supabase.from("engagement_events").insert([
    {
      engagement_id: engagement.id,
      user_id: actorUserId,
      user_role: actorRole,
      action_type: "ai_generation",
      ai_assisted: aiUsed,
      prompt_ref: PROMPT_REF,
      metadata: {
        model: aiUsed ? CLAUDE_MODEL : "template_v1",
        ai_used: aiUsed,
        packet_id: finalPacketId,
        token_estimate: Math.ceil(packetText.length / 4),
      },
      notes: aiUsed
        ? "Packet text drafted by Claude."
        : "Packet text drafted from structured template (no API key configured).",
    },
    {
      engagement_id: engagement.id,
      user_id: actorUserId,
      user_role: actorRole,
      action_type: "packet_generated",
      ai_assisted: aiUsed,
      metadata: {
        packet_id: finalPacketId,
        ai_used: aiUsed,
        model: aiUsed ? CLAUDE_MODEL : "template_v1",
      },
      notes: `Runtime packet ${finalPacketId} stored.`,
    },
  ]);

  return {
    packetId: finalPacketId,
    packetText,
    promptRef: PROMPT_REF,
    aiUsed,
    model: aiUsed ? CLAUDE_MODEL : "template_v1",
  };
}

export async function recordAutomationError(
  supabase: SupabaseClient,
  engagement: EngagementRow,
  actorUserId: string | null,
  actorRole: string,
  step: string,
  error: unknown,
): Promise<void> {
  await supabase.from("engagement_events").insert({
    engagement_id: engagement.id,
    user_id: actorUserId,
    user_role: actorRole,
    action_type: "automation_error",
    metadata: {
      step,
      error: error instanceof Error ? error.message : String(error),
    },
    notes: `Automation step "${step}" failed; the release itself is intact.`,
  });
}
