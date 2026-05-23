import { CheckCircle2 } from "lucide-react";
import PageHeader from "@/components/shell/PageHeader";
import EmptyState from "@/components/EmptyState";
import ApprovalCard from "@/components/approvals/ApprovalCard";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { EngagementRow } from "@/lib/db-types";

// ─────────────────────────────────────────────────────────────
// Phase 4: Realtime — subscribe to engagements UPDATEs and refilter.
// ─────────────────────────────────────────────────────────────

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
      <PageHeader
        title="Approvals"
        subtitle="Engagements awaiting CPA sign-off."
      />

      {items.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={CheckCircle2}
            title="All caught up. No engagements are waiting for your approval."
            description="When a CPA review is requested, it will appear here."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-section">
          {items.map((eng) => (
            <ApprovalCard
              key={eng.id}
              engagement={eng}
              canApprove={session?.role === "cpa"}
            />
          ))}
        </div>
      )}
    </>
  );
}
