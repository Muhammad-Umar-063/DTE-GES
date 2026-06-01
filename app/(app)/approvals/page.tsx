import { CheckCircle2 } from "lucide-react";
import PageHeader from "@/components/shell/PageHeader";
import EmptyState from "@/components/EmptyState";
import RealtimeRefresher from "@/components/RealtimeRefresher";
import ApprovalCard from "@/components/approvals/ApprovalCard";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { EngagementRow } from "@/lib/db-types";

export const metadata = { title: "Approvals — DTE GES" };

export default async function ApprovalsPage() {
  const session = await getSession();
  const supabase = createClient();

  const { data } = await supabase
    .from("engagements")
    .select("*")
    .eq("current_state", "REVIEW_REQUIRED")
    .is("cpa_approval_id", null)
    .order("updated_at", { ascending: false });
  const items = (data ?? []) as EngagementRow[];

  return (
    <>
      <RealtimeRefresher table="engagements" />
      <RealtimeRefresher table="engagement_approvals" />
      <PageHeader
        title="Approvals"
        subtitle={
          items.length === 1
            ? "1 engagement is waiting for your approval."
            : `${items.length} engagements are waiting for your approval.`
        }
      />

      {items.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={CheckCircle2}
            title="All caught up — nothing waiting on you."
            description="When the team finishes work and is ready for your approval, it will show up here."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-section">
          {items.map((eng, idx) => (
            <ApprovalCard
              key={eng.id}
              engagement={eng}
              canApprove={session?.role === "cpa"}
              className={`stagger-${Math.min(idx + 1, 6)}`}
            />
          ))}
        </div>
      )}
    </>
  );
}
