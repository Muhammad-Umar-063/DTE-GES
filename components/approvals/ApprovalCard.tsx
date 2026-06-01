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
  insufficient_role: "You don't have permission to do that. Only a CPA can approve.",
  network: "Connection hiccup. Try again in a moment.",
  server_error:
    "We couldn't save that. Try again in a moment — your work is safe.",
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
        message: `Approved ${engagement.client_name}. The team can continue. ✓`,
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
  const phaseLabel = phase ? phase.label : `Step ${engagement.current_phase}`;

  return (
    <div
      className={
        "card transition-all duration-200 animate-content-reveal " +
        (dismissed ? "opacity-0 -translate-x-2 " : "") +
        (className ?? "")
      }
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="text-section-title text-text-primary">
            {engagement.client_name}
          </h3>
          <div className="text-body text-text-secondary mt-0.5">
            {getServiceLineName(engagement.service_line)}
            <span className="mx-1.5 text-text-muted">·</span>
            <span className="text-mono text-text-muted">
              {engagement.engagement_id}
            </span>
          </div>
        </div>
        <EngagementStateBadge state={engagement.current_state} />
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="inline-flex items-center px-2 py-0.5 rounded-pill bg-purple-light text-purple text-badge">
          {phaseLabel}
        </span>
      </div>

      <div className="rounded-card border border-amber-mid bg-amber-light p-3 mb-3">
        <div className="flex items-start gap-2">
          <Lock className="w-4 h-4 text-amber flex-shrink-0 mt-0.5" aria-hidden />
          <p className="text-body text-amber leading-snug">
            The team finished the work and is waiting for your approval to
            send it to the client.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={!canApprove || pending}
          title={!canApprove ? "Only a CPA can approve." : undefined}
          className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-button bg-primary text-white text-card-title hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          <CheckCircle2 className="w-4 h-4" aria-hidden /> Approve this engagement
        </button>
        <Link
          href={`/engagements/${engagement.id}`}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-button border border-border bg-surface text-text-secondary text-card-title hover:bg-surface-2 transition"
        >
          Review now <ChevronRight className="w-4 h-4" aria-hidden />
        </Link>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={`Approve ${engagement.client_name}`}
        description={`Approving this engagement will allow the team to send the work to the client. This approval will be recorded in the history.`}
        confirmLabel="Approve this engagement"
        cancelLabel="Cancel"
        onConfirm={async () => {
          await grant();
        }}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
}
