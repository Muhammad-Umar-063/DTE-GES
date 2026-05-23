"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, ChevronRight, Lock } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import EngagementStateBadge from "@/components/EngagementStateBadge";
import { useToast } from "@/components/toast/ToastProvider";
import { PHASES, getServiceLineName } from "@/lib/workflow";
import type { EngagementRow } from "@/lib/db-types";

const ERROR_COPY: Record<string, string> = {
  insufficient_role: "You do not have permission to perform this action.",
  network: "Connection issue. Please try again.",
  server_error:
    "Something went wrong. The action was not completed. Please try again.",
};

export default function ApprovalCard({
  engagement,
  canApprove,
  className,
}: {
  engagement: EngagementRow;
  canApprove: boolean;
  className?: string;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  async function grant() {
    setPending(true);
    try {
      const res = await fetch("/api/grant-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ engagementId: engagement.id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        showToast({
          message:
            body.message ?? ERROR_COPY[body.error as string] ?? ERROR_COPY.server_error,
          type: "error",
        });
        return;
      }
      showToast({
        message: `Approval recorded for ${engagement.client_name}.`,
        type: "success",
      });
      setDismissed(true);
      setTimeout(() => router.refresh(), 250);
    } catch {
      showToast({ message: ERROR_COPY.network, type: "error" });
    } finally {
      setPending(false);
      setConfirmOpen(false);
    }
  }

  if (dismissed) return null;

  const phase = PHASES.find((p) => p.number === engagement.current_phase);
  const phaseLabel = phase
    ? `Phase ${phase.number} — ${phase.label}`
    : `Phase ${engagement.current_phase}`;

  return (
    <div
      className={
        "card transition-all duration-200 " +
        (dismissed ? "opacity-0 -translate-x-2 " : "") +
        (className ?? "")
      }
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="text-section-title text-text-primary">
            {engagement.client_name}
          </h3>
          <div className="text-mono text-text-muted mt-0.5">
            {engagement.engagement_id}
          </div>
        </div>
        <EngagementStateBadge state={engagement.current_state} />
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-pill bg-blue-light text-primary text-badge">
          <span className="font-bold">{engagement.service_line}</span>{" "}
          <span>{getServiceLineName(engagement.service_line)}</span>
        </span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-pill bg-purple-light text-purple text-badge">
          {phaseLabel}
        </span>
      </div>

      <div className="rounded-card border border-amber-mid bg-amber-light p-3 mb-3">
        <div className="flex items-start gap-2">
          <Lock className="w-4 h-4 text-amber flex-shrink-0 mt-0.5" aria-hidden />
          <p className="text-body text-amber leading-snug">
            Approval required before this engagement can advance. Grant your formal
            CPA approval to unlock the next stage.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={!canApprove || pending}
          title={!canApprove ? "Requires role: cpa" : undefined}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-button bg-green text-white text-card-title hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          <CheckCircle2 className="w-4 h-4" aria-hidden /> Grant Approval
        </button>
        <Link
          href={`/engagements/${engagement.id}`}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-button bg-primary text-white text-card-title hover:opacity-95 transition"
        >
          Review Engagement <ChevronRight className="w-4 h-4" aria-hidden />
        </Link>
        <Link
          href={`/engagements/${engagement.id}`}
          className="inline-flex items-center px-3 py-2 rounded-button text-text-secondary hover:text-text-primary hover:bg-surface-2 transition text-card-title"
        >
          Return to Review
        </Link>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={`Grant CPA approval — ${engagement.client_name}`}
        description={`Granting CPA approval for ${engagement.client_name}. This will create a permanent approval record and unlock the engagement to advance to Approved status. This action cannot be undone.`}
        confirmLabel="Confirm Approval"
        cancelLabel="Cancel"
        onConfirm={async () => {
          await grant();
        }}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
}
