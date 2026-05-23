// Server wrapper for fast initial paint, then realtime updates take over.
import StatRowView from "./StatRowView";
import { fetchDashboardCounts } from "@/lib/data/engagements";

export default async function StatRow({ className }: { className?: string }) {
  const initialCounts = await fetchDashboardCounts();
  return <StatRowView initialCounts={initialCounts} className={className} />;
}
