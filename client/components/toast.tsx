"use client";

import { CheckCircle2, Info, X } from "lucide-react";
import { createContext, useContext, useMemo, useState } from "react";

type Toast = { id: number; title: string; tone?: "success" | "info" };
type ToastContextValue = { showToast: (toast: Omit<Toast, "id">) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const value = useMemo(
    () => ({
      showToast: (toast: Omit<Toast, "id">) => {
        const id = Date.now();
        const title = typeof toast.title === "string" && toast.title.trim() ? toast.title : "Permintaan selesai diproses.";
        setToasts((current) => [...current, { ...toast, id, title }]);
        window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 3600);
      }
    }),
    []
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3">
        {toasts.map((toast) => (
          <div key={toast.id} className="glass-panel flex items-center gap-3 rounded-xl px-4 py-3">
            {toast.tone === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-success" />
            ) : (
              <Info className="h-5 w-5 text-ocean" />
            )}
            <p className="flex-1 text-sm font-semibold text-ink">{toast.title}</p>
            <button
              aria-label="Tutup notifikasi"
              className="rounded-lg p-1 text-ink-soft hover:bg-mist hover:text-ink"
              onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return context;
}
