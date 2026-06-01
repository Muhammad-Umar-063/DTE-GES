import { Package } from "lucide-react";
import PageHeader from "@/components/shell/PageHeader";
import EmptyState from "@/components/EmptyState";
import PacketsTable, { type PacketRowVM } from "@/components/packets/PacketsTable";
import { createClient } from "@/lib/supabase/server";
import type { RuntimePacketRow, EngagementRow } from "@/lib/db-types";

export const metadata = { title: "Packets — DTE GES" };

export default async function PacketsPage() {
  const supabase = createClient();

  const { data: packets } = await supabase
    .from("runtime_packets")
    .select("*")
    .order("created_at", { ascending: false });
  const packetRows = (packets ?? []) as RuntimePacketRow[];

  if (packetRows.length === 0) {
    return (
      <>
        <PageHeader
          title="Packets"
          subtitle="The permanent record of every engagement you've sent."
        />
        <div className="card">
          <EmptyState
            icon={Package}
            title="No engagements have been packaged yet."
            description="Packages are created automatically when you send an engagement to the client."
          />
        </div>
      </>
    );
  }

  const engagementIds = packetRows.map((p) => p.engagement_id);
  const [{ data: engs }, eventCounts] = await Promise.all([
    supabase
      .from("engagements")
      .select("id, engagement_id, client_name, service_line, current_state, cpa_approval_id")
      .in("id", engagementIds),
    Promise.all(
      packetRows.map((p) =>
        supabase
          .from("engagement_events")
          .select("*", { count: "exact", head: true })
          .eq("engagement_id", p.engagement_id)
          .then((r) => ({ engagementId: p.engagement_id, count: r.count ?? 0 })),
      ),
    ),
  ]);
  const engMap = new Map(
    ((engs ?? []) as Array<
      Pick<
        EngagementRow,
        "id" | "engagement_id" | "client_name" | "service_line" | "current_state" | "cpa_approval_id"
      >
    >).map((e) => [e.id, e]),
  );
  const eventCountMap = new Map(eventCounts.map((c) => [c.engagementId, c.count]));

  const rows: PacketRowVM[] = packetRows.map((p) => {
    const e = engMap.get(p.engagement_id);
    return {
      packetId: p.packet_id,
      engagementUuid: p.engagement_id,
      engagementCode: e?.engagement_id ?? "—",
      clientName: e?.client_name ?? "—",
      serviceLine: e?.service_line ?? p.service_line_id,
      currentState: e?.current_state ?? p.workflow_state,
      hasApproval: !!e?.cpa_approval_id,
      eventCount: eventCountMap.get(p.engagement_id) ?? 0,
    };
  });

  return (
    <>
      <PageHeader
        title="Packets"
        subtitle="The permanent record of every engagement you've sent."
      />
      <PacketsTable rows={rows} />
    </>
  );
}
