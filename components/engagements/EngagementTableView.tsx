"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import EngagementStateBadge from "@/components/EngagementStateBadge";
import EmptyState from "@/components/EmptyState";
import { useRealtimeChannel } from "@/lib/hooks/useRealtimeChannel";
import { relativeTime } from "@/lib/time";
import { PHASES, getServiceLineName } from "@/lib/workflow";
import type { EngagementRow } from "@/lib/db-types";
import type { EngagementState } from "@/lib/supabase/database.types";
import type { FilterKey } from "./EngagementFilterPills";
import type { EngagementScope } from "@/lib/data/engagements";

const FLASH_MS = 1500;

function phaseLabel(phase: number): string {
  const ph = PHASES.find((p) => p.number === phase);
  return ph ? ph.label : `Step ${phase}`;
}

export type EngagementTableViewProps = {
  scope: EngagementScope;
  filter: FilterKey;
  initialRows: EngagementRow[];
  className?: string;
};

export default function EngagementTableView({
  scope,
  filter,
  initialRows,
  className,
}: EngagementTableViewProps) {
  const [rows, setRows] = useState<EngagementRow[]>(initialRows);
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());

  // Refetch when the filter/scope changes (server already did initial fetch
  // for the URL on first mount).
  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const refetch = useCallback(async () => {
    const res = await fetch(
      `/api/engagements?scope=${scope}&filter=${filter}`,
      { cache: "no-store" },
    );
    if (!res.ok) return;
    const json = (await res.json()) as { engagements: EngagementRow[] };
    setRows(json.engagements);
  }, [scope, filter]);

  const flashRow = useCallback((id: string) => {
    setFlashIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setTimeout(() => {
      setFlashIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, FLASH_MS);
  }, []);

  useRealtimeChannel<EngagementRow>({
    table: "engagements",
    onChange: (payload) => {
      if (payload.eventType === "UPDATE") {
        const newRow = payload.new as EngagementRow;
        const oldRow = payload.old as Partial<EngagementRow>;
        if (oldRow.current_state && oldRow.current_state !== newRow.current_state) {
          flashRow(newRow.id);
        }
      }
      void refetch();
    },
  });

  if (rows.length === 0) {
    return (
      <div className={"card " + (className ?? "")}>
        <EmptyState
          title="No engagements match this filter"
          description="Try another pill or clear the filter to see everything."
        />
      </div>
    );
  }

  return (
    <div
      className={
        "card overflow-hidden p-0 animate-content-reveal " + (className ?? "")
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-body">
          <thead>
            <tr className="bg-surface-2 text-label">
              <th className="px-card py-2.5 text-left font-bold">Client</th>
              <th className="px-card py-2.5 text-left font-bold">Service line</th>
              <th className="px-card py-2.5 text-left font-bold">Stage</th>
              <th className="px-card py-2.5 text-left font-bold">Status</th>
              <th className="px-card py-2.5 text-left font-bold">Last action</th>
              <th className="px-card py-2.5 text-left font-bold">Updated</th>
              <th className="px-card py-2.5 text-right font-bold"> </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((eng, idx) => (
              <Row
                key={eng.id}
                engagement={eng}
                flashing={flashIds.has(eng.id)}
                rowIndex={idx}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({
  engagement,
  flashing,
  rowIndex,
}: {
  engagement: EngagementRow;
  flashing: boolean;
  rowIndex: number;
}) {
  const isEscalated = engagement.current_state === "ESCALATED";
  const isReviewBlocked =
    engagement.current_state === "REVIEW_REQUIRED" && !engagement.cpa_approval_id;
  const baseTone = isEscalated
    ? "bg-red-light hover:bg-blue-light"
    : isReviewBlocked
      ? "bg-amber-light hover:bg-blue-light"
      : "bg-surface hover:bg-blue-light";

  // Only stagger the first ~8 rows on initial paint; beyond that the cascade
  // would feel slow. Realtime updates skip the reveal entirely (no animation
  // class) and rely on the flash for movement.
  const revealDelay = Math.min(rowIndex, 8) * 40;
  const rowStyle: React.CSSProperties = flashing
    ? { animation: `row-flash ${1.5}s ease-out forwards`, height: "44px" }
    : {
        height: "44px",
        animation: `rowReveal 360ms cubic-bezier(0.16, 1, 0.3, 1) ${revealDelay}ms both`,
      };

  return (
    <tr
      className={"border-t border-border transition cursor-pointer " + baseTone}
      style={rowStyle}
    >
      <td className="px-card py-2 align-middle">
        <Link href={`/engagements/${engagement.id}`} className="block">
          <div className="text-card-title text-text-primary">
            {engagement.client_name}
          </div>
          <div className="text-mono text-text-muted">
            {engagement.engagement_id}
          </div>
        </Link>
      </td>
      <td className="px-card py-2 align-middle">
        <Link href={`/engagements/${engagement.id}`} className="block">
          <span className="text-body text-text-secondary">
            {getServiceLineName(engagement.service_line)}
          </span>
        </Link>
      </td>
      <td className="px-card py-2 align-middle">
        <Link href={`/engagements/${engagement.id}`} className="block">
          <span className="inline-flex items-center px-2 py-0.5 rounded-pill bg-purple-light text-purple text-badge">
            {phaseLabel(engagement.current_phase)}
          </span>
        </Link>
      </td>
      <td className="px-card py-2 align-middle">
        <Link href={`/engagements/${engagement.id}`} className="block">
          <EngagementStateBadge state={engagement.current_state} />
        </Link>
      </td>
      <td className="px-card py-2 align-middle">
        <Link href={`/engagements/${engagement.id}`} className="block">
          <span className="text-body text-text-secondary line-clamp-1">
            {engagement.last_action ?? "—"}
          </span>
        </Link>
      </td>
      <td className="px-card py-2 align-middle whitespace-nowrap">
        <Link href={`/engagements/${engagement.id}`} className="block">
          <span className="text-body text-text-secondary">
            {relativeTime(engagement.updated_at)}
          </span>
        </Link>
      </td>
      <td className="px-card py-2 align-middle text-right">
        <Link
          href={`/engagements/${engagement.id}`}
          className="inline-flex items-center gap-1 text-primary text-card-title hover:underline"
        >
          Open <ChevronRight className="w-3.5 h-3.5" aria-hidden />
        </Link>
      </td>
    </tr>
  );
}

// EngagementState is imported for type-narrowness in callers; re-export so
// downstream files can find it conveniently.
export type { EngagementState };
