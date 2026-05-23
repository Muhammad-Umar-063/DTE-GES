import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

export type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  className?: string;
};

export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={
        "flex flex-col items-center justify-center text-center py-10 px-card " +
        (className ?? "")
      }
    >
      <div
        aria-hidden
        className="w-12 h-12 rounded-pill bg-surface-3 inline-flex items-center justify-center text-text-muted mb-3"
      >
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-card-title text-text-primary">{title}</p>
      {description && (
        <p className="text-body mt-1 max-w-sm">{description}</p>
      )}
    </div>
  );
}
