"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  requireReason?: boolean;
  reasonLabel?: string;
  onConfirm: (reason?: string) => void | Promise<void>;
  onClose: () => void;
  children?: ReactNode;
  className?: string;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  requireReason = false,
  reasonLabel = "Reason (required)",
  onConfirm,
  onClose,
  children,
  className,
}: ConfirmDialogProps) {
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [reasonError, setReasonError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setReason("");
      setReasonError(null);
      setPending(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pending, onClose]);

  if (!open) return null;

  async function handleConfirm() {
    if (requireReason && !reason.trim()) {
      setReasonError("Please add a reason.");
      return;
    }
    setReasonError(null);
    setPending(true);
    try {
      await onConfirm(requireReason ? reason.trim() : undefined);
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className={"fixed inset-0 z-50 flex items-center justify-center " + (className ?? "")}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={() => !pending && onClose()}
        className="absolute inset-0 bg-black/40"
      />
      <div className="relative card max-w-md w-[92vw] shadow-card-hover p-5">
        <h2 id="confirm-title" className="text-section-title">
          {title}
        </h2>
        {description && <p className="text-body mt-2">{description}</p>}
        {children && <div className="mt-3">{children}</div>}

        {requireReason && (
          <div className="mt-4">
            <label className="text-label block mb-1.5" htmlFor="confirm-reason">
              {reasonLabel}
            </label>
            <textarea
              ref={inputRef}
              id="confirm-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-body text-text-primary bg-surface border border-border rounded-input focus:outline-none focus:border-primary resize-y"
              disabled={pending}
            />
            {reasonError && (
              <p className="text-body text-red mt-1">{reasonError}</p>
            )}
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="px-3 py-2 text-card-title text-text-secondary hover:text-text-primary rounded-button transition disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={pending}
            className={
              "px-3 py-2 text-card-title text-white rounded-button transition disabled:opacity-60 disabled:cursor-not-allowed " +
              (danger ? "bg-red hover:bg-red/90" : "bg-primary hover:bg-primary/90")
            }
          >
            {pending ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
