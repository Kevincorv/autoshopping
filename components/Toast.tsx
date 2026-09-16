"use client";

import { useUI } from "@/lib/store";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

export function Toast() {
  const toast = useUI((s) => s.toast);
  const hide = useUI((s) => s.hideToast);
  if (!toast) return null;
  const Icon = toast.type === "success" ? CheckCircle2 : toast.type === "error" ? AlertTriangle : Info;
  const color =
    toast.type === "success"
      ? "text-emerald-400 border-emerald-500/40"
      : toast.type === "error"
      ? "text-rose-400 border-rose-500/40"
      : "text-sky-400 border-sky-500/40";
  return (
    <div className="fixed top-4 right-4 z-[100] animate-fade-in">
      <div className={`card border ${color} flex items-center gap-3 px-4 py-3 max-w-sm`}>
        <Icon className="w-5 h-5 shrink-0" />
        <p className="text-sm flex-1">{toast.message}</p>
        <button onClick={hide} className="text-neutral-400 hover:text-neutral-200">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
