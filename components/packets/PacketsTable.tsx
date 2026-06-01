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
                <th className="px-card py-2.5 text-left font-bold">Client</th>
                <th className="px-card py-2.5 text-left font-bold">Service line</th>
                <th className="px-card py-2.5 text-left font-bold">Status</th>
                <th className="px-card py-2.5 text-left font-bold">Approval</th>
                <th className="px-card py-2.5 text-left font-bold">History entries</th>
                <th className="px-card py-2.5 text-left font-bold">Record ID</th>
                <th className="px-card py-2.5 text-right font-bold">Play back</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.packetId}
                  className="border-t border-border hover:bg-blue-light/50 transition"
                  style={{ height: "44px" }}
                >
                  <td className="px-card py-2 align-middle">
                    <Link
                      href={`/engagements/${r.engagementUuid}`}
                      className="text-card-title text-text-primary hover:text-primary block"
                    >
                      {r.clientName}
                      <div className="text-mono text-text-muted font-normal mt-0.5">
                        {r.engagementCode}
                      </div>
                    </Link>
                  </td>
                  <td className="px-card py-2 align-middle">
                    <span className="text-body text-text-secondary">
                      {getServiceLineName(r.serviceLine)}
                    </span>
                  </td>
                  <td className="px-card py-2 align-middle">
                    <EngagementStateBadge state={r.currentState} />
                  </td>
                  <td className="px-card py-2 align-middle">
                    {r.hasApproval ? (
                      <span className="text-green text-card-title">Approved</span>
                    ) : (
                      <span className="text-text-muted text-card-title">—</span>
                    )}
                  </td>
                  <td className="px-card py-2 align-middle text-text-secondary">
                    {r.eventCount}
                  </td>
                  <td className="px-card py-2 align-middle text-mono text-text-muted">
                    {r.packetId}
                  </td>
                  <td className="px-card py-2 align-middle text-right">
                    <button
                      type="button"
                      onClick={() => setOpen(r)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-button border border-border bg-surface text-text-secondary text-card-title hover:bg-surface-2 transition"
                    >
                      <Play className="w-3.5 h-3.5" aria-hidden /> Play back
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
        clientName={open?.clientName ?? ""}
        onClose={() => setOpen(null)}
      />
    </>
  );
}
