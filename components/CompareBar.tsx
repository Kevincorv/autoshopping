"use client";

import Link from "next/link";
import { Scale, X } from "lucide-react";
import { useCompare } from "@/lib/store";

export function CompareBar() {
  const ids = useCompare((s) => s.ids);
  const remove = useCompare((s) => s.remove);
  const clear = useCompare((s) => s.clear);

  if (ids.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-lg">
      <div className="card px-4 py-3 flex items-center gap-3 shadow-2xl shadow-black/50">
        <Scale className="w-5 h-5 text-brand-400 shrink-0" />
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {ids.map((id) => (
            <span key={id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-neutral-800 text-[10px] text-neutral-300 max-w-[110px]">
              <span className="truncate">{id.slice(0, 8)}…</span>
              <button onClick={() => remove(id)} className="text-neutral-500 hover:text-rose-400" aria-label="Quitar">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <button onClick={clear} className="text-xs text-neutral-400 hover:text-rose-400 shrink-0">
          Vaciar
        </button>
        <Link href="/compare" className="btn-primary text-xs px-3 py-1.5 shrink-0">
          Comparar ({ids.length})
        </Link>
      </div>
    </div>
  );
}
