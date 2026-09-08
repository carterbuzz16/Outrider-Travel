"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "./cn";
import type { AlertTone } from "./Alert";

/**
 * Toasts — transient confirmations, pinned bottom-right.
 *
 * Same paper vocabulary as everything else: a hairline card on the raised
 * surface with a tone rule down its left edge and a tracked mono title. It
 * fades and lifts in over 260ms and holds for five seconds.
 *
 * Wrap the app (or a subtree) in <ToastProvider> once, then call `useToast()`
 * wherever something needs confirming.
 */

export type Toast = {
  id: number;
  title: string;
  description?: string;
  tone: AlertTone;
  /** Milliseconds on screen. `0` pins it until dismissed. */
  duration: number;
};

type ToastInput = {
  title: string;
  description?: string;
  tone?: AlertTone;
  duration?: number;
};

type ToastContextValue = {
  toast: (input: ToastInput) => number;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

const EDGE: Record<AlertTone, string> = {
  info: "border-l-[--color-teal]",
  success: "border-l-[--color-teal]",
  warning: "border-l-[--flag]",
  error: "border-l-[--flag]",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, description, tone = "info", duration = 5000 }: ToastInput) => {
      const id = nextId.current;
      nextId.current += 1;

      // Three at a time is the ceiling — past that they stop being read and
      // start being a wall.
      setToasts((current) => [...current.slice(-2), { id, title, description, tone, duration }]);

      if (duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), duration),
        );
      }
      return id;
    },
    [dismiss],
  );

  // Clear any pending timers if the provider goes away mid-flight.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div
      // The region is always mounted so assistive tech has something to watch;
      // it's inert and invisible while empty.
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-gutter bottom-6 z-50 flex flex-col items-end gap-2.5 sm:left-auto sm:right-6"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto w-full max-w-sm animate-rise border border-l-2 border-[--rule]",
            "bg-[--surface-raised] px-4 py-3.5 shadow-[0_1px_0_0_var(--rule)]",
            EDGE[t.tone],
          )}
        >
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <p className="t-micro text-[--text]">{t.title}</p>
              {t.description && (
                <p className="mt-1.5 font-body text-body-s leading-[1.6] text-[--text-secondary]">
                  {t.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              className="-m-1 shrink-0 p-1 text-[--text-muted] transition-colors duration-fast hover:text-[--text]"
              aria-label="Dismiss"
            >
              <svg viewBox="0 0 12 12" className="w-3" fill="none" stroke="currentColor" strokeWidth="1.25">
                <path d="M1 1l10 10M11 1L1 11" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
