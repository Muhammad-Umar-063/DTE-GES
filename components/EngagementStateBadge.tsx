import { getStateDisplay } from "@/lib/workflow";
import type { EngagementState } from "@/lib/supabase/database.types";

export type EngagementStateBadgeProps = {
  state: EngagementState | string;
  className?: string;
};

export default function EngagementStateBadge({
  state,
  className,
}: EngagementStateBadgeProps) {
  const d = getStateDisplay(state);
  return (
    <span
      className={
        `inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-pill text-badge uppercase tracking-wide ${d.bgColor} ${d.textColor} ` +
        (className ?? "")
      }
    >
      <span
        aria-hidden
        className="inline-block w-[5px] h-[5px] rounded-full"
        style={{ backgroundColor: d.dotColor }}
      />
      {d.label}
    </span>
  );
}
