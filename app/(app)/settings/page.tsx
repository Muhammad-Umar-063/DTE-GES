import { ShieldCheck } from "lucide-react";
import PageHeader from "@/components/shell/PageHeader";
import { getSession } from "@/lib/auth";

export const metadata = { title: "Settings — DTE GES" };

const ROLE_MATRIX: Array<{
  role: string;
  capabilities: string[];
}> = [
  {
    role: "cpa",
    capabilities: [
      "Grant CPA approval (REVIEW_REQUIRED → APPROVED)",
      "Execute role-gated transitions (READY_FOR_EXECUTION → EXECUTION_ACTIVE, etc.)",
      "Move engagements through release and archive",
      "Escalate or roll back any engagement",
      "View every engagement and the firm-wide audit trail",
    ],
  },
  {
    role: "staff",
    capabilities: [
      "Start intake and move evidence collection forward",
      "Escalate engagements with a reason",
      "View every engagement and audit trail (read-only on governed actions)",
      "Cannot grant CPA approval or perform CPA-only transitions",
    ],
  },
  {
    role: "admin",
    capabilities: [
      "Administrative oversight (cannot bypass the audit log)",
      "Read access to firm-wide records and audit trail",
      "Not in the workflow role list — does not perform engagement transitions",
    ],
  },
];

export default async function SettingsPage() {
  const session = await getSession();

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Firm preferences, integrations, and access."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-section">
        <div className="card">
          <h3 className="text-card-title mb-3">Your account</h3>
          <div className="divide-y divide-border text-body">
            <Row label="Signed in as" value={session?.fullName ?? "—"} />
            <Row label="Email" value={session?.email ?? "—"} />
            <Row
              label="Role"
              value={
                <span className="inline-flex items-center px-2 py-0.5 rounded-pill bg-blue-light text-primary text-badge uppercase tracking-wide">
                  {session?.role ?? "—"}
                </span>
              }
            />
            <Row label="Firm" value="Peach State CPA Group" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-start gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-green flex-shrink-0 mt-0.5" aria-hidden />
            <h3 className="text-card-title">Governance</h3>
          </div>
          <p className="text-body">
            Every state change passes through the governance engine. Every action
            — successful or denied — writes an immutable row to{" "}
            <span className="text-mono">engagement_events</span>. There is no
            UPDATE or DELETE permission on that table for any application role,
            and approvals are recorded as permanent records on{" "}
            <span className="text-mono">engagement_approvals</span>.
          </p>
        </div>
      </div>

      <div className="mt-section card">
        <h3 className="text-card-title mb-3">Role permission matrix</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-card">
          {ROLE_MATRIX.map((r) => (
            <div
              key={r.role}
              className="rounded-card border border-border bg-surface p-card"
            >
              <div className="text-label mb-2">{r.role}</div>
              <ul className="flex flex-col gap-1.5">
                {r.capabilities.map((c) => (
                  <li
                    key={c}
                    className="text-body text-text-secondary flex items-start gap-2"
                  >
                    <span
                      aria-hidden
                      className="mt-1.5 w-1.5 h-1.5 rounded-full bg-border-strong flex-shrink-0"
                    />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-section card">
        <h3 className="text-card-title mb-2">Out of MVP scope</h3>
        <p className="text-body">
          Interactive settings — notification routing, integration credentials,
          retention policies — are planned for a follow-up release. This page is
          read-only by design.
        </p>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
      <div className="text-label">{label}</div>
      <div className="text-body text-text-primary text-right">{value}</div>
    </div>
  );
}
