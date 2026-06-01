import { createClient } from "@/lib/supabase/server";
import { getServiceLineName, getStateDisplay } from "@/lib/workflow";
import type { RuntimePacketRow } from "@/lib/db-types";

export type RuntimePacketProps = {
  engagementId: string;
  className?: string;
};

function fieldCount(v: unknown): number {
  if (!v) return 0;
  if (Array.isArray(v)) return v.length;
  if (typeof v === "object") return Object.keys(v as object).length;
  return 0;
}

export default async function RuntimePacket({
  engagementId,
  className,
}: RuntimePacketProps) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("runtime_packets")
    .select("*")
    .eq("engagement_id", engagementId)
    .maybeSingle();

  if (error) {
    return (
      <div className={"card " + (className ?? "")}>
        <p className="text-body text-red">Failed to load packet.</p>
      </div>
    );
  }

  const packet = data as RuntimePacketRow | null;
  if (!packet) {
    return (
      <div className={"card text-center " + (className ?? "")}>
        <h3 className="text-card-title">Engagement record</h3>
        <p className="text-body text-text-muted mt-2">
          No record yet — one is created automatically when the engagement is
          sent to the client.
        </p>
      </div>
    );
  }

  const fields: Array<{ label: string; value: string }> = [
    { label: "Record ID", value: packet.packet_id },
    {
      label: "Service line",
      value: getServiceLineName(packet.service_line_id),
    },
    {
      label: "Status",
      value: getStateDisplay(packet.workflow_state).label,
    },
    {
      label: "Storage",
      value: packet.compression_state ?? "—",
    },
    {
      label: "Documents on file",
      value: String(
        fieldCount(packet.evidence_refs?.documents) ||
          fieldCount(packet.evidence_refs),
      ),
    },
    {
      label: "Approvals on record",
      value: String(fieldCount(packet.approval_history)),
    },
    {
      label: "Escalations on record",
      value: String(fieldCount(packet.escalation_history)),
    },
    {
      label: "AI assisted",
      value: packet.ai_assisted ? "Yes" : "No",
    },
  ];

  return (
    <div className={"card " + (className ?? "")}>
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h3 className="text-card-title">Engagement record</h3>
        <span className="text-mono text-text-muted">{packet.packet_id}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {fields.map((f) => (
          <div
            key={f.label}
            className="border border-border rounded-tag px-3 py-2"
          >
            <div className="text-label">{f.label}</div>
            <div className="text-body text-text-primary mt-0.5">{f.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
