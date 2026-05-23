import PageHeader from "@/components/shell/PageHeader";

export const metadata = { title: "Packets — DTE GES" };

export default function PacketsPage() {
  return (
    <>
      <PageHeader
        title="Runtime Packets"
        subtitle="Serialised engagement state for downstream systems."
      />
      <div className="card text-center">
        <p className="text-body">Coming in Phase 3 — packet inventory + replay metadata.</p>
      </div>
    </>
  );
}
