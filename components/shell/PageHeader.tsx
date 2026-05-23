import type { ReactNode } from "react";

export type PageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
};

export default function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={
        "flex items-start justify-between gap-4 mb-section " + (className ?? "")
      }
    >
      <div className="min-w-0">
        <h1 className="text-page-title">{title}</h1>
        {subtitle && <p className="text-body mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
