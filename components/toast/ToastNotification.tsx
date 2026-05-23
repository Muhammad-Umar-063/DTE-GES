"use client";

import { CheckCircle2, XCircle, AlertTriangle, X, Info } from "lucide-react";

export type ToastType = "default" | "success" | "error" | "warning";

const TYPE_STYLES: Record<
  ToastType,
  { bg: string; border: string; text: string; iconColor: string; Icon: typeof Info }
> = {
  default: {
    bg: "bg-text-primary",
    border: "border-text-primary",
    text: "text-white",
    iconColor: "text-white",
    Icon: Info,
  },
  success: {
    bg: "bg-green",
    border: "border-green",
    text: "text-white",
    iconColor: "text-white",
    Icon: CheckCircle2,
  },
  error: {
    bg: "bg-red",
    border: "border-red",
    text: "text-white",
    iconColor: "text-white",
    Icon: XCircle,
  },
  warning: {
    bg: "bg-amber",
    border: "border-amber",
    text: "text-white",
    iconColor: "text-white",
    Icon: AlertTriangle,
  },
};

export type ToastNotificationProps = {
  message: string;
  type?: ToastType;
  onClose?: () => void;
  className?: string;
};

export default function ToastNotification({
  message,
  type = "default",
  onClose,
  className,
}: ToastNotificationProps) {
  const style = TYPE_STYLES[type];
  const Icon = style.Icon;

  return (
    <div
      role="status"
      className={
        `flex items-start gap-2 px-3 py-2.5 min-w-[280px] max-w-sm rounded-card shadow-card ${style.bg} ${style.text} ${style.border} border ` +
        (className ?? "")
      }
    >
      <Icon className={"w-4 h-4 flex-shrink-0 mt-px " + style.iconColor} aria-hidden />
      <span className="text-body flex-1 leading-snug">{message}</span>
      {onClose && (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onClose}
          className="opacity-80 hover:opacity-100 transition flex-shrink-0"
        >
          <X className="w-4 h-4" aria-hidden />
        </button>
      )}
    </div>
  );
}
