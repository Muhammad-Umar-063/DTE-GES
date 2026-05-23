import PageHeader from "@/components/shell/PageHeader";

export const metadata = { title: "Audit — DTE GES" };

export default function AuditPage() {
  return (
    <>
      <PageHeader
        title="Audit Trail"
        subtitle="Every transition, every approval, every override — immutable."
      />
      <div className="card text-center">
        <p className="text-body">Coming in Phase 3 — firm-wide audit search and filters.</p>
      </div>
    </>
  );
}
