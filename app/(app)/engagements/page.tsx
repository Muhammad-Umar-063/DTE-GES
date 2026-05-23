import PageHeader from "@/components/shell/PageHeader";
import EngagementFilterPills, {
  type FilterKey,
} from "@/components/engagements/EngagementFilterPills";
import EngagementTable from "@/components/engagements/EngagementTable";

export const metadata = { title: "Engagements — DTE GES" };

export default function EngagementsPage({
  searchParams,
}: {
  searchParams: { filter?: FilterKey };
}) {
  const filter = searchParams.filter ?? "all";

  return (
    <>
      <PageHeader
        title="Engagements"
        subtitle="Every engagement, every state. Filter, sort, drill in."
      />

      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <h2 className="text-section-title">All engagements</h2>
        <EngagementFilterPills />
      </div>

      <EngagementTable scope="all" filter={filter} />
    </>
  );
}
