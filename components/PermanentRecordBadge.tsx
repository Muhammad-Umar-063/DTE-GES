"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";

const TOOLTIP =
  "Every action in this system is logged permanently and cannot be edited. This is your firm's compliance trail.";

export type PermanentRecordBadgeProps = {
  className?: string;
};

// Small unobtrusive badge replacing the loud "APPEND ONLY — No UPDATE or
// DELETE permission for any role" banner from earlier phases.
export default function PermanentRecordBadge({
  className,
}: PermanentRecordBadgeProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span
      ref={ref}
      className={"relative inline-flex " + (className ?? "")}
    >
      <button
        type="button"
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        onClick={() => setOpen((p) => !p)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill bg-surface-2 text-text-muted text-badge uppercase tracking-wide hover:bg-surface-3 hover:text-text-secondary transition cursor-help"
      >
        <ShieldCheck className="w-2.5 h-2.5" aria-hidden />
        Permanent record
      </button>
      {open && (
        <span
          role="tooltip"
          id={tooltipId}
          className="absolute right-0 top-full mt-1.5 w-64 z-30 rounded-card bg-text-primary text-white text-body px-3 py-2 shadow-card-hover leading-snug"
        >
          {TOOLTIP}
        </span>
      )}
    </span>
  );
}
