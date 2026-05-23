import Link from "next/link";
import { ChevronRight } from "lucide-react";
import EngagementStateBadge from "@/components/EngagementStateBadge";
import EmptyState from "@/components/EmptyState";
import { createClient } from "@/lib/supabase/server";
import { relativeTime } from "@/lib/time";
import { PHASES, getServiceLineName } from "@/lib/workflow";
import type { EngagementRow } from "@/lib/db-types";
import type { EngagementState } from "@/lib/supabase/database.types";
import type { FilterKey } from "./EngagementFilterPills";

// ─────────────────────────────────────────────────────────────
// Phase 4: Realtime — re-fetch / subscribe to engagements changes here.
// ─────────────────────────────────────────────────────────────

export type EngagementTableProps = {
  /** `active` excludes RELEASED and ARCHIVED; `all` includes them. */
  scope: "active" | "all";
  filter?: FilterKey;
  className?: string;
};

function phaseLabel(state: EngagementState | string, phase: number): string {
  const ph = PHASES.find((p) => p.number === phase);
  return ph ? `Phase ${ph.number} — ${ph.label}` : `Phase ${phase}`;
}

export default async function EngagementTable({
  scope,
  filter = "all",
  className,
}: EngagementTableProps) {
  const supabase = createClient();

  let query = supabase.from("engagements").select("*").order("updated_at", {
    ascending: false,
  });

  if (scope === "active") {
    query = query.not("current_state", "in", "(RELEASED,ARCHIVED)");
  }

  switch (filter) {
    case "needs-approval":
      query = query.eq("current_state", "REVIEW_REQUIRED").is("cpa_approval_id", null);
      break;
    case "escalated":
      query = query.eq("current_state", "ESCALATED");
      break;
    case "in-execution":
      query = query.in("current_state", ["EXECUTION_ACTIVE", "READY_FOR_EXECUTION"]);
      break;
    case "ready-for-release":
      query = query.in("current_state", ["APPROVED", "RELEASE_READY"]);
      break;
    default:
      break;
  }

  const { data, error } = await query;
  if (error) {
    return (
      <div className={"card " + (className ?? "")}>
        <p className="text-body text-red">Failed to load engagements.</p>
      </div>
    );
  }
  const rows = (data ?? []) as EngagementRow[];

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
    <div className={"card overflow-hidden p-0 " + (className ?? "")}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-body">
          <thead>
            <tr className="bg-surface-2 text-label">
              <th className="px-card py-2.5 text-left font-bold">Client</th>
              <th className="px-card py-2.5 text-left font-bold">Service Line</th>
              <th className="px-card py-2.5 text-left font-bold">Phase</th>
              <th className="px-card py-2.5 text-left font-bold">Status</th>
              <th className="px-card py-2.5 text-left font-bold">Last Action</th>
              <th className="px-card py-2.5 text-left font-bold">Updated</th>
              <th className="px-card py-2.5 text-right font-bold">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((eng) => {
              const isEscalated = eng.current_state === "ESCALATED";
              const isReviewBlocked =
                eng.current_state === "REVIEW_REQUIRED" && !eng.cpa_approval_id;
              const rowTone = isEscalated
                ? "bg-red-light hover:bg-blue-light"
                : isReviewBlocked
                  ? "bg-amber-light hover:bg-blue-light"
                  : "bg-surface hover:bg-blue-light";
              return (
                <tr
                  key={eng.id}
                  className={
                    "border-t border-border transition cursor-pointer " + rowTone
                  }
                  style={{ height: "44px" }}
                >
                  <td className="px-card py-2 align-middle">
                    <Link href={`/engagements/${eng.id}`} className="block">
                      <div className="text-card-title text-text-primary">
                        {eng.client_name}
                      </div>
                      <div className="text-mono text-text-muted">
                        {eng.engagement_id}
                      </div>
                    </Link>
                  </td>
                  <td className="px-card py-2 align-middle">
                    <Link href={`/engagements/${eng.id}`} className="block">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-pill bg-blue-light text-primary text-badge">
                        <span className="font-bold">{eng.service_line}</span>
                        <span className="hidden md:inline">
                          {getServiceLineName(eng.service_line)}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-card py-2 align-middle">
                    <Link href={`/engagements/${eng.id}`} className="block">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-pill bg-purple-light text-purple text-badge">
                        {phaseLabel(eng.current_state, eng.current_phase)}
                      </span>
                    </Link>
                  </td>
                  <td className="px-card py-2 align-middle">
                    <Link href={`/engagements/${eng.id}`} className="block">
                      <EngagementStateBadge state={eng.current_state} />
                    </Link>
                  </td>
                  <td className="px-card py-2 align-middle">
                    <Link href={`/engagements/${eng.id}`} className="block">
                      <span className="text-body text-text-secondary line-clamp-1">
                        {eng.last_action ?? "—"}
                      </span>
                    </Link>
                  </td>
                  <td className="px-card py-2 align-middle whitespace-nowrap">
                    <Link href={`/engagements/${eng.id}`} className="block">
                      <span className="text-body text-text-secondary">
                        {relativeTime(eng.updated_at)}
                      </span>
                    </Link>
                  </td>
                  <td className="px-card py-2 align-middle text-right">
                    <Link
                      href={`/engagements/${eng.id}`}
                      className="inline-flex items-center gap-1 text-primary text-card-title hover:underline"
                    >
                      Open <ChevronRight className="w-3.5 h-3.5" aria-hidden />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
