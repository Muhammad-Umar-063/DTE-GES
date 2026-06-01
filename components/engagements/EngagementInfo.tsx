import EngagementStateBadge from "@/components/EngagementStateBadge";
import { PHASES, getServiceLineName } from "@/lib/workflow";
import type { EngagementRow } from "@/lib/db-types";

type Row = { label: string; value: React.ReactNode };

function FieldRow({ label, value }: Row) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-t border-border first:border-t-0">
      <div className="text-label">{label}</div>
      <div className="text-body text-text-primary text-right">{value}</div>
    </div>
  );
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function EngagementInfo({
  engagement,
  cpaName,
  className,
}: {
  engagement: EngagementRow;
  cpaName: string | null;
  className?: string;
}) {
  const phase = PHASES.find((p) => p.number === engagement.current_phase);
  const phaseLabel = phase ? phase.label : `Step ${engagement.current_phase}`;

  const approvalStatus = engagement.cpa_approval_id ? (
    <span className="text-green">Approved</span>
  ) : (
    <span className="text-amber">Not yet approved</span>
  );

  return (
    <div className={"card " + (className ?? "")}>
      <h3 className="text-card-title mb-3">Details</h3>
      <div>
        <FieldRow label="Client name" value={engagement.client_name} />
        <FieldRow
          label="Service line"
          value={
            <span>{getServiceLineName(engagement.service_line)}</span>
          }
        />
        <FieldRow label="Current stage" value={phaseLabel} />
        <FieldRow
          label="Status"
          value={<EngagementStateBadge state={engagement.current_state} />}
        />
        <FieldRow label="Assigned CPA" value={cpaName ?? "—"} />
        <FieldRow label="Approval" value={approvalStatus} />
        <FieldRow
          label={engagement.tax_year ? "Tax year" : "Reporting period"}
          value={engagement.tax_year ?? engagement.reporting_period ?? "—"}
        />
        <FieldRow label="Created" value={fmtDate(engagement.created_at)} />
        <FieldRow label="Last updated" value={fmtDate(engagement.updated_at)} />
        <FieldRow
          label="Engagement ID"
          value={
            <span className="text-mono text-text-muted">
              {engagement.engagement_id}
            </span>
          }
        />
      </div>
    </div>
  );
}
