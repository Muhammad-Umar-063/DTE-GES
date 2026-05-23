"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import ToastNotification, { type ToastType } from "./ToastNotification";

type ToastInput = {
  message: string;
  type?: ToastType;
  durationMs?: number;
};

type Toast = ToastInput & { id: string; type: ToastType; durationMs: number };

type ToastContextValue = {
  showToast: (t: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);
  const idBase = useId();

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback<ToastContextValue["showToast"]>(
    ({ message, type = "default", durationMs = 4000 }) => {
      counter.current += 1;
      const id = `${idBase}-${counter.current}`;
      setToasts((prev) => [...prev, { id, message, type, durationMs }]);
    },
    [idBase],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((t) => (
          <ToastShell key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastShell({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), toast.durationMs);
    return () => clearTimeout(t);
  }, [toast.id, toast.durationMs, onDismiss]);

  return (
    <div className="pointer-events-auto">
      <ToastNotification
        message={toast.message}
        type={toast.type}
        onClose={() => onDismiss(toast.id)}
      />
    </div>
  );
}
