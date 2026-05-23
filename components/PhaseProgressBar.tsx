import { Check } from "lucide-react";
import { PHASES, getPhaseForState } from "@/lib/workflow";
import type { EngagementState } from "@/lib/supabase/database.types";

export type PhaseProgressBarProps = {
  /** May be omitted — derived from `state` if so. */
  phase?: number;
  state: EngagementState | string;
  className?: string;
};

export default function PhaseProgressBar({
  phase,
  state,
  className,
}: PhaseProgressBarProps) {
  const current = phase ?? getPhaseForState(state);
  const isEscalated = state === "ESCALATED";

  return (
    <div className={"w-full " + (className ?? "")}>
      <ol className="flex items-center gap-0">
        {PHASES.map((p, idx) => {
          const isCompleted = !isEscalated && p.number < current;
          const isCurrent = p.number === current;
          const isFuture = !isCompleted && !isCurrent;

          // Per spec: escalated current renders red.
          let dotClass =
            "w-7 h-7 rounded-pill flex items-center justify-center text-badge font-bold transition";
          if (isCompleted) {
            dotClass += " bg-green text-white";
          } else if (isCurrent && isEscalated) {
            dotClass += " bg-red text-white ring-4 ring-red/15";
          } else if (isCurrent) {
            dotClass += " bg-primary text-white ring-4 ring-primary/15 animate-pulse";
          } else if (isFuture) {
            dotClass += " bg-surface-3 text-text-muted";
          }

          let labelClass = "mt-1.5 text-label text-center";
          if (isCurrent) labelClass = "mt-1.5 text-label text-center text-text-primary";
          else if (isCompleted) labelClass = "mt-1.5 text-label text-center text-text-secondary";

          let connectorClass = "h-px flex-1 mx-1";
          connectorClass +=
            isCompleted || (p.number < current - 1)
              ? " bg-green"
              : " bg-border";
          // The line BETWEEN p[idx] and p[idx+1] is "completed" if p[idx] is completed.

          return (
            <li
              key={p.number}
              className="flex items-center flex-1 last:flex-none"
            >
              <div className="flex flex-col items-center min-w-[40px]">
                <div className={dotClass} aria-current={isCurrent ? "step" : undefined}>
                  {isCompleted ? <Check className="w-3.5 h-3.5" aria-hidden /> : p.number}
                </div>
                <span className={labelClass}>{p.label}</span>
              </div>
              {idx < PHASES.length - 1 && (
                <div className={connectorClass} aria-hidden />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
