"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export type AuditFiltersProps = {
  engagementOptions: Array<{ id: string; label: string }>;
  actionOptions: string[];
  roleOptions: string[];
  className?: string;
};

export default function AuditFilters({
  engagementOptions,
  actionOptions,
  roleOptions,
  className,
}: AuditFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const update = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      router.push(pathname + (next.toString() ? "?" + next.toString() : ""));
    },
    [params, pathname, router],
  );

  const cur = (k: string) => params.get(k) ?? "";

  return (
    <div
      className={
        "card grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 " + (className ?? "")
      }
    >
      <Field label="Engagement">
        <select
          value={cur("engagement")}
          onChange={(e) => update("engagement", e.target.value)}
          className="w-full px-3 py-2 text-body text-text-primary bg-surface border border-border rounded-input focus:outline-none focus:border-primary"
        >
          <option value="">All engagements</option>
          {engagementOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Action type">
        <select
          value={cur("action")}
          onChange={(e) => update("action", e.target.value)}
          className="w-full px-3 py-2 text-body text-text-primary bg-surface border border-border rounded-input focus:outline-none focus:border-primary"
        >
          <option value="">All actions</option>
          {actionOptions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Role">
        <select
          value={cur("role")}
          onChange={(e) => update("role", e.target.value)}
          className="w-full px-3 py-2 text-body text-text-primary bg-surface border border-border rounded-input focus:outline-none focus:border-primary"
        >
          <option value="">All roles</option>
          {roleOptions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </Field>

      <Field label="From / To dates">
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={cur("from")}
            onChange={(e) => update("from", e.target.value)}
            className="w-full px-2 py-2 text-body text-text-primary bg-surface border border-border rounded-input focus:outline-none focus:border-primary"
            aria-label="From date"
          />
          <input
            type="date"
            value={cur("to")}
            onChange={(e) => update("to", e.target.value)}
            className="w-full px-2 py-2 text-body text-text-primary bg-surface border border-border rounded-input focus:outline-none focus:border-primary"
            aria-label="To date"
          />
        </div>
      </Field>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-label mb-1.5">{label}</div>
      {children}
    </div>
  );
}
