import PageHeader from "@/components/shell/PageHeader";

export const metadata = { title: "Settings — DTE GES" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Firm preferences, integrations, and access."
      />
      <div className="card text-center">
        <p className="text-body">Coming in Phase 3 — workspace settings.</p>
      </div>
    </>
  );
}
