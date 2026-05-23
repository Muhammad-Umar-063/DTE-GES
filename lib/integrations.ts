// Mock external integrations.
//
// Peach State's TaxDome and HubSpot tenants are not wired up for this demo, so
// these functions DO NOT make real outbound API calls. They write realistic
// `taxdome_sent` and `hubspot_updated` audit events so the audit trail tells
// the full story end to end. The latency is simulated with a small `await`.
//
// When the firm's tenants are connected, swap the body of each function for
// a real client call. Keep the audit-event write — it's the source of truth.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EngagementRow } from "@/lib/db-types";

const TAXDOME_LATENCY_MS = 400;
const HUBSPOT_LATENCY_MS = 250;

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export async function sendToTaxDome(
  supabase: SupabaseClient,
  engagement: EngagementRow,
  packet: { packetId: string },
  actorUserId: string | null,
  actorRole: string,
): Promise<{ deliveryId: string }> {
  await delay(TAXDOME_LATENCY_MS);

  const deliveryId = `td_${engagement.engagement_id.toLowerCase()}_${Date.now()}`;
  const recipient = `${engagement.client_name.replace(/[^A-Za-z0-9]/g, "").toLowerCase()}@client.example`;

  await supabase.from("engagement_events").insert({
    engagement_id: engagement.id,
    user_id: actorUserId,
    user_role: actorRole,
    action_type: "taxdome_sent",
    metadata: {
      delivery_id: deliveryId,
      recipient,
      packet_id: packet.packetId,
      status: "delivered",
      service_line: engagement.service_line,
      mock: true,
    },
    notes: `Delivered packet ${packet.packetId} to TaxDome.`,
  });

  return { deliveryId };
}

export async function updateHubSpot(
  supabase: SupabaseClient,
  engagement: EngagementRow,
  actorUserId: string | null,
  actorRole: string,
): Promise<{ dealStage: string }> {
  await delay(HUBSPOT_LATENCY_MS);

  const dealStage = "Closed — Delivered";

  await supabase.from("engagement_events").insert({
    engagement_id: engagement.id,
    user_id: actorUserId,
    user_role: actorRole,
    action_type: "hubspot_updated",
    metadata: {
      deal_stage_to: dealStage,
      contact_synced: true,
      service_line: engagement.service_line,
      mock: true,
    },
    notes: `Moved HubSpot deal to "${dealStage}" and synced contact.`,
  });

  return { dealStage };
}
