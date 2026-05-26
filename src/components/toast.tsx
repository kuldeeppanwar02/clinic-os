"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  toast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const typeStyles: Record<ToastType, string> = {
    success: "bg-[rgba(15,107,99,0.95)] text-white",
    error: "bg-[rgba(192,57,43,0.95)] text-white",
    info: "bg-[rgba(19,49,58,0.92)] text-white",
  };

  const TypeIcon = ({ type }: { type: ToastType }) => {
    const cls = "h-4 w-4";
    switch (type) {
      case "success": return <CheckCircle2 className={cls} />;
      case "error": return <XCircle className={cls} />;
      default: return <Info className={cls} />;
    }
  };

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}

      {toasts.length > 0 && (
        <div className="fixed bottom-4 left-1/2 z-[9999] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`flex items-center gap-2.5 rounded-xl px-4 py-3 shadow-lg backdrop-blur-md animate-slide-up cursor-pointer ${typeStyles[t.type]}`}
              onClick={() => removeToast(t.id)}
              role="alert"
            >
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
                <TypeIcon type={t.type} />
              </div>
              <p className="flex-1 text-sm font-medium leading-snug">{t.message}</p>
              <X className="h-3.5 w-3.5 flex-shrink-0 opacity-50 transition-opacity hover:opacity-100" />
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
