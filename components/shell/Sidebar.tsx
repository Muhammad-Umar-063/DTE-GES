"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  AlertTriangle,
  Package,
  ClipboardList,
  Settings,
  type LucideIcon,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Sidebar count badge value (Approvals/Escalations). */
  count?: number;
  /** Render the count badge in red (used for ESCALATED). */
  countDanger?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

export default function Sidebar({
  approvalsCount,
  escalationsCount,
  className,
}: {
  approvalsCount: number;
  escalationsCount: number;
  className?: string;
}) {
  const pathname = usePathname();

  const groups: NavGroup[] = [
    {
      label: "Operations",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/engagements", label: "Engagements", icon: FileText },
      ],
    },
    {
      label: "Governance",
      items: [
        {
          href: "/approvals",
          label: "Approvals",
          icon: CheckSquare,
          count: approvalsCount,
        },
        {
          href: "/escalations",
          label: "Escalations",
          icon: AlertTriangle,
          count: escalationsCount,
          countDanger: true,
        },
        { href: "/packets", label: "Packets", icon: Package },
        { href: "/audit", label: "Audit", icon: ClipboardList },
      ],
    },
    {
      label: "Settings",
      items: [{ href: "/settings", label: "Settings", icon: Settings }],
    },
  ];

  return (
    <aside
      className={
        "w-sidebar flex-shrink-0 bg-surface border-r border-border overflow-y-auto " +
        (className ?? "")
      }
    >
      <nav className="py-4 px-3 flex flex-col gap-6">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="text-label px-3 mb-2">{group.label}</div>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={
                        "relative flex items-center gap-2.5 px-3 py-2 rounded-button text-body transition " +
                        (active
                          ? "bg-blue-light text-primary font-semibold"
                          : "text-text-secondary hover:bg-surface-2 hover:text-text-primary")
                      }
                    >
                      {active && (
                        <span
                          aria-hidden
                          className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-pill bg-primary"
                        />
                      )}
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {typeof item.count === "number" && item.count > 0 && (
                        <span
                          className={
                            "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-pill text-badge " +
                            (item.countDanger
                              ? "bg-red text-white"
                              : "bg-amber-mid text-amber")
                          }
                        >
                          {item.count}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
