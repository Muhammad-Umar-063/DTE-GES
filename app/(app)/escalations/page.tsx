import PageHeader from "@/components/shell/PageHeader";

export const metadata = { title: "Escalations — DTE GES" };

export default function EscalationsPage() {
  return (
    <>
      <PageHeader
        title="Escalations"
        subtitle="Engagements that need attention before they can move."
      />
      <div className="card text-center">
        <p className="text-body">Coming in Phase 3 — escalation queue with reason + resolve action.</p>
      </div>
    </>
  );
}
