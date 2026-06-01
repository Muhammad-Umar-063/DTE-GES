import { ShieldCheck } from "lucide-react";
import PageHeader from "@/components/shell/PageHeader";
import ScrollReveal from "@/components/ScrollReveal";
import { getSession } from "@/lib/auth";

export const metadata = { title: "Settings — DTE GES" };

const ROLE_MATRIX: Array<{
  role: string;
  capabilities: string[];
}> = [
  {
    role: "cpa",
    capabilities: [
      "Approve engagements before they go to the client",
      "Start the work after the team finishes document review",
      "Send engagements to the client and close them out",
      "Flag or send back any engagement",
      "See every engagement and the full firm history",
    ],
  },
  {
    role: "staff",
    capabilities: [
      "Start intake and collect documents from clients",
      "Flag engagements that need a CPA's attention",
      "See every engagement and the full firm history",
      "Cannot approve engagements or do CPA-only steps",
    ],
  },
  {
    role: "admin",
    capabilities: [
      "Administrative oversight (cannot skip the history log)",
      "Read access to firm-wide records and history",
      "Does not take action on engagements directly",
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
            <h3 className="text-card-title">Compliance</h3>
          </div>
          <p className="text-body">
            Every action across your firm is logged permanently. Nothing can be
            edited or deleted after the fact — this is your firm&apos;s compliance
            trail. Approvals are saved as permanent records that anyone can look
            back at later.
          </p>
        </div>
      </div>

      <ScrollReveal className="block mt-section">
      <div className="card">
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
      </ScrollReveal>

      <ScrollReveal className="block mt-section">
      <div className="card">
        <h3 className="text-card-title mb-2">Out of MVP scope</h3>
        <p className="text-body">
          Interactive settings — notification routing, integration credentials,
          retention policies — are planned for a follow-up release. This page is
          read-only by design.
        </p>
      </div>
      </ScrollReveal>
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
