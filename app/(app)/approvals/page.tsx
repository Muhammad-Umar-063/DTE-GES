import PageHeader from "@/components/shell/PageHeader";

export const metadata = { title: "Approvals — DTE GES" };

export default function ApprovalsPage() {
  return (
    <>
      <PageHeader
        title="Approvals"
        subtitle="Engagements awaiting CPA sign-off."
      />
      <div className="card text-center">
        <p className="text-body">Coming in Phase 3 — the approval queue and gate UI.</p>
      </div>
    </>
  );
}
