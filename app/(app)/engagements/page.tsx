import PageHeader from "@/components/shell/PageHeader";

export const metadata = { title: "Engagements — DTE GES" };

export default function EngagementsPage() {
  return (
    <>
      <PageHeader
        title="Engagements"
        subtitle="Every engagement, every state. Filter, sort, drill in."
      />
      <div className="card text-center">
        <p className="text-body">Coming in Phase 3 — full engagement table + detail screens.</p>
      </div>
    </>
  );
}
