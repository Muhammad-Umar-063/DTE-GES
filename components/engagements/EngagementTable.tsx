// Server wrapper: does the initial fetch for fast SSR, then hands off to the
// client view which subscribes to realtime + handles the blue row-flash.
import EngagementTableView from "./EngagementTableView";
import { fetchEngagements, type EngagementScope } from "@/lib/data/engagements";
import type { FilterKey } from "./EngagementFilterPills";

export type EngagementTableProps = {
  scope: EngagementScope;
  filter?: FilterKey;
  className?: string;
};

export default async function EngagementTable({
  scope,
  filter = "all",
  className,
}: EngagementTableProps) {
  const initialRows = await fetchEngagements({ scope, filter });
  return (
    <EngagementTableView
      scope={scope}
      filter={filter}
      initialRows={initialRows}
      className={className}
    />
  );
}
