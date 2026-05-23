"use client";

import Link from "next/link";
import { useState } from "react";
import { Play } from "lucide-react";
import EngagementStateBadge from "@/components/EngagementStateBadge";
import ReplayModal from "@/components/packets/ReplayModal";
import { getServiceLineName } from "@/lib/workflow";

export type PacketRowVM = {
  packetId: string;
  engagementUuid: string;
  engagementCode: string;
  clientName: string;
  serviceLine: string;
  currentState: string;
  hasApproval: boolean;
  eventCount: number;
};

export default function PacketsTable({ rows }: { rows: PacketRowVM[] }) {
  const [open, setOpen] = useState<PacketRowVM | null>(null);

  return (
    <>
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-body">
            <thead>
              <tr className="bg-surface-2 text-label">
                <th className="px-card py-2.5 text-left font-bold">Packet ID</th>
                <th className="px-card py-2.5 text-left font-bold">Client</th>
                <th className="px-card py-2.5 text-left font-bold">Engagement ID</th>
                <th className="px-card py-2.5 text-left font-bold">Service Line</th>
                <th className="px-card py-2.5 text-left font-bold">Current State</th>
                <th className="px-card py-2.5 text-left font-bold">CPA Approval</th>
                <th className="px-card py-2.5 text-left font-bold">Events Logged</th>
                <th className="px-card py-2.5 text-right font-bold">Replay</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.packetId}
                  className="border-t border-border hover:bg-blue-light/50 transition"
                  style={{ height: "44px" }}
                >
                  <td className="px-card py-2 align-middle text-mono text-text-primary">
                    {r.packetId}
                  </td>
                  <td className="px-card py-2 align-middle">
                    <Link
                      href={`/engagements/${r.engagementUuid}`}
                      className="text-card-title text-text-primary hover:text-primary"
                    >
                      {r.clientName}
                    </Link>
                  </td>
                  <td className="px-card py-2 align-middle text-mono text-text-muted">
                    {r.engagementCode}
                  </td>
                  <td className="px-card py-2 align-middle">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-pill bg-blue-light text-primary text-badge">
                      <span className="font-bold">{r.serviceLine}</span>
                      <span className="hidden md:inline">
                        {getServiceLineName(r.serviceLine)}
                      </span>
                    </span>
                  </td>
                  <td className="px-card py-2 align-middle">
                    <EngagementStateBadge state={r.currentState} />
                  </td>
                  <td className="px-card py-2 align-middle">
                    {r.hasApproval ? (
                      <span className="text-green text-card-title">Granted</span>
                    ) : (
                      <span className="text-text-muted text-card-title">—</span>
                    )}
                  </td>
                  <td className="px-card py-2 align-middle text-text-secondary">
                    {r.eventCount}
                  </td>
                  <td className="px-card py-2 align-middle text-right">
                    <button
                      type="button"
                      onClick={() => setOpen(r)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-button bg-primary text-white text-card-title hover:opacity-95 transition"
                    >
                      <Play className="w-3.5 h-3.5" aria-hidden /> Replay
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ReplayModal
        open={open !== null}
        engagementId={open?.engagementUuid ?? ""}
        engagementCode={open?.engagementCode ?? ""}
        onClose={() => setOpen(null)}
      />
    </>
  );
}
