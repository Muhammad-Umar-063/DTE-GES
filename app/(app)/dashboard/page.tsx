import { Suspense } from "react";
import PageHeader from "@/components/shell/PageHeader";
import EngagementFilterPills, {
  type FilterKey,
} from "@/components/engagements/EngagementFilterPills";
import EngagementTable from "@/components/engagements/EngagementTable";
import RecentActivity from "@/components/engagements/RecentActivity";
import StatRow from "@/components/engagements/StatRow";
import { SkeletonBlock, TableSkeleton } from "@/components/Skeleton";
import { getSession } from "@/lib/auth";

export const metadata = { title: "Command Center — DTE GES" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { filter?: FilterKey };
}) {
  const session = await getSession();
  const filter = searchParams.filter ?? "all";

  return (
    <>
      <PageHeader
        title="Command Center"
        subtitle={`Welcome back, ${session?.fullName ?? session?.email ?? ""}.`}
      />

      <Suspense
        fallback={
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-card mb-section">
            <div className="card"><SkeletonBlock rows={3} /></div>
            <div className="card"><SkeletonBlock rows={3} /></div>
            <div className="card"><SkeletonBlock rows={3} /></div>
            <div className="card"><SkeletonBlock rows={3} /></div>
          </div>
        }
      >
        <StatRow className="mb-section" />
      </Suspense>

      <div className="flex flex-col lg:flex-row gap-section">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
            <h2 className="text-section-title">Active engagements</h2>
            <EngagementFilterPills />
          </div>
          <Suspense fallback={<TableSkeleton rows={6} />}>
            <EngagementTable scope="active" filter={filter} />
          </Suspense>
        </div>

        <Suspense
          fallback={
            <aside className="w-full lg:w-[280px] lg:flex-shrink-0 card">
              <h3 className="text-card-title mb-3">Recent activity</h3>
              <SkeletonBlock rows={6} />
            </aside>
          }
        >
          <RecentActivity />
        </Suspense>
      </div>
    </>
  );
}
