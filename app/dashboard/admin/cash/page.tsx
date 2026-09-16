"use client";

import { useEffect, useState } from "react";
import { Wallet, Lock, Unlock, Plus, Minus, ArrowDownCircle, ArrowUpCircle, TrendingUp } from "lucide-react";
import { useUI } from "@/lib/store";
import { formatPYG } from "@/lib/utils";

interface Movement { id: string; type: string; category?: string | null; amount: number; description?: string | null; createdAt: string; }
interface Session { id: string; status: string; openedAt: string; closedAt?: string | null; openingAmount: number; closingAmount?: number | null; expectedAmount?: number | null; notes?: string | null; movements: Movement[]; _count?: { movements: number }; }

export default function CashPage() {
  const ui = useUI();
  const [open, setOpen] = useState<Session | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [recent, setRecent] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingAmount, setOpeningAmount] = useState("");
  const [openingNotes, setOpeningNotes] = useState("");
  const [moveType, setMoveType] = useState<"INGRESO" | "EGRESO">("INGRESO");
  const [moveAmount, setMoveAmount] = useState("");
  const [moveCategory, setMoveCategory] = useState("general");
  const [moveDesc, setMoveDesc] = useState("");
  const [closingAmount, setClosingAmount] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [result, setResult] = useState<{ expected: number; diff: number } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/cash");
      const d = await r.json();
      setOpen(d.open || null);
      setSessions(d.sessions || []);
      setRecent(d.recent || []);
    } catch { /* noop */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const income = open?.movements.filter((m) => m.type === "INGRESO").reduce((s, m) => s + m.amount, 0) || 0;
  const expense = open?.movements.filter((m) => m.type === "EGRESO").reduce((s, m) => s + m.amount, 0) || 0;
  const cash = open ? Math.round((open.openingAmount + income - expense) * 100) / 100 : 0;

  const openCash = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/cash", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "open", openingAmount: Number(openingAmount) || 0, notes: openingNotes || undefined }) });
      const d = await r.json();
      if (!r.ok) { ui.showToast(d.error || "Error", "error"); return; }
      ui.showToast("Caja abierta", "success");
      setOpeningAmount("");
      setOpeningNotes("");
      load();
    } finally { setBusy(false); }
  };

  const move = async () => {
    if (!open) return;
    const amount = Number(moveAmount);
    if (!amount || amount <= 0) { ui.showToast("Ingresá un monto válido", "error"); return; }
    if (!moveDesc.trim()) { ui.showToast("Ingresá un concepto", "error"); return; }
    setBusy(true);
    try {
      const r = await fetch(`/api/cash/${open.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "move", type: moveType, amount, category: moveCategory, description: moveDesc.trim() }) });
      const d = await r.json();
      if (!r.ok) { ui.showToast(d.error || "Error", "error"); return; }
      ui.showToast("Movimiento registrado", "success");
      setMoveAmount("");
      setMoveDesc("");
      load();
    } finally { setBusy(false); }
  };

  const closeCash = async () => {
    if (!open) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/cash/${open.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "close", closingAmount: Number(closingAmount) || 0, notes: closeNotes || undefined }) });
      const d = await r.json();
      if (!r.ok) { ui.showToast(d.error || "Error", "error"); return; }
      setResult({ expected: d.expected, diff: d.diff });
      ui.showToast("Caja cerrada", "success");
      load();
    } finally { setBusy(false); }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Caja</h1>
          <p className="text-sm text-neutral-500 mt-1">Apertura y cierre de caja, ingresos y egresos</p>
        </div>
        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${open ? "bg-emerald-500/10 text-emerald-400" : "bg-neutral-800 text-neutral-400"}`}>
          {open ? <><Unlock className="w-3.5 h-3.5" /> Caja abierta</> : <><Lock className="w-3.5 h-3.5" /> Caja cerrada</>}
        </span>
      </div>

      {!open && (
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-6 mb-6 max-w-xl">
          <h2 className="font-semibold mb-1 flex items-center gap-2"><Unlock className="w-4 h-4 text-emerald-400" /> Abrir caja</h2>
          <p className="text-xs text-neutral-500 mb-4">Registrá el dinero inicial en la caja para empezar la jornada.</p>
          <div className="flex flex-wrap gap-3">
            <input type="number" min={0} className="input py-2 text-sm w-40" placeholder="Monto inicial (Gs)" value={openingAmount} onChange={(e) => setOpeningAmount(e.target.value)} />
            <input className="input py-2 text-sm flex-1 min-w-[180px]" placeholder="Nota (opcional)" value={openingNotes} onChange={(e) => setOpeningNotes(e.target.value)} />
            <button onClick={openCash} disabled={busy} className="btn-primary text-sm px-5 py-2 flex items-center gap-2"><Unlock className="w-4 h-4" /> {busy ? "..." : "Abrir Caja"}</button>
          </div>
        </div>
      )}

      {open && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Dinero en caja", value: formatPYG(cash), icon: <Wallet className="w-5 h-5 text-brand-400" />, bg: "bg-brand-500/15" },
            { label: "Fondo inicial", value: formatPYG(open.openingAmount), icon: <TrendingUp className="w-5 h-5 text-neutral-400" />, bg: "bg-neutral-800/60" },
            { label: "Ingresos", value: formatPYG(income), icon: <ArrowDownCircle className="w-5 h-5 text-emerald-400" />, bg: "bg-emerald-500/15" },
            { label: "Egresos", value: formatPYG(expense), icon: <ArrowUpCircle className="w-5 h-5 text-rose-400" />, bg: "bg-rose-500/15" },
          ].map((c) => (
            <div key={c.label} className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${c.bg}`}>{c.icon}</div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-neutral-500">{c.label}</p>
                  <p className="font-bold truncate">{c.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-brand-400" /> Registrar movimiento</h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <button onClick={() => setMoveType("INGRESO")} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 border ${moveType === "INGRESO" ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400" : "border-neutral-700 text-neutral-400"}`}>
                  <ArrowDownCircle className="w-4 h-4" /> Ingreso
                </button>
                <button onClick={() => setMoveType("EGRESO")} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 border ${moveType === "EGRESO" ? "bg-rose-500/15 border-rose-500/40 text-rose-400" : "border-neutral-700 text-neutral-400"}`}>
                  <ArrowUpCircle className="w-4 h-4" /> Egreso
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select className="input py-2 text-sm" value={moveCategory} onChange={(e) => setMoveCategory(e.target.value)}>
                  <option value="venta">Venta</option>
                  <option value="pago-proveedor">Pago proveedor</option>
                  <option value="devolucion">Devolución</option>
                  <option value="gasto">Gasto</option>
                  <option value="sueldo">Sueldo</option>
                  <option value="flete">Flete</option>
                  <option value="general">General</option>
                </select>
                <input type="number" min={0} className="input py-2 text-sm" placeholder="Monto (Gs)" value={moveAmount} onChange={(e) => setMoveAmount(e.target.value)} />
              </div>
              <input className="input py-2 text-sm" placeholder="Concepto (ej: pago a Distribuidora X)" value={moveDesc} onChange={(e) => setMoveDesc(e.target.value)} />
              <div className="flex justify-end">
                <button onClick={move} disabled={busy} className="btn-primary text-sm px-5 py-2 flex items-center gap-2">
                  {moveType === "INGRESO" ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />} {busy ? "..." : "Registrar"}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5">
            <h3 className="font-semibold mb-4">Cierre de caja</h3>
            {!showClose ? (
              <button onClick={() => setShowClose(true)} className="btn-primary text-sm px-5 py-2 flex items-center gap-2 border border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"><Lock className="w-4 h-4" /> Cerrar caja</button>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-neutral-500 mb-1">Dinero esperado en caja: <span className="text-brand-400 font-bold">{formatPYG(cash)}</span></p>
                  <input type="number" min={0} className="input py-2 text-sm w-full" placeholder={`Monto contado (esperado ${cash.toLocaleString("es-PY")})`} value={closingAmount} onChange={(e) => setClosingAmount(e.target.value)} />
                </div>
                <input className="input py-2 text-sm w-full" placeholder="Observaciones del cierre" value={closeNotes} onChange={(e) => setCloseNotes(e.target.value)} />
                <div className="flex gap-2">
                  <button onClick={closeCash} disabled={busy} className="btn-primary text-sm px-4 py-2 flex items-center gap-2"><Lock className="w-4 h-4" /> {busy ? "..." : "Confirmar cierre"}</button>
                  <button onClick={() => setShowClose(false)} className="btn-ghost text-sm py-2">Cancelar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {result && (
        <div className={`rounded-xl border p-4 mb-6 text-sm ${result.diff === 0 ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-400" : "border-amber-500/40 bg-amber-500/5 text-amber-400"}`}>
          Cierre confirmado: esperado <b>{formatPYG(result.expected)}</b> — diferencia: <b>{formatPYG(result.diff)}</b>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-neutral-800 overflow-hidden">
          <div className="px-4 py-3 bg-neutral-900/60 border-b border-neutral-800 text-sm font-semibold flex items-center gap-2">
            <Wallet className="w-4 h-4 text-brand-400" /> Movimientos recientes
          </div>
          <div className="max-h-96 overflow-auto">
            {loading ? (
              <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-8 bg-neutral-800/60 rounded animate-pulse" />)}</div>
            ) : recent.length === 0 ? (
              <div className="p-8 text-center text-sm text-neutral-500">Sin movimientos aún</div>
            ) : recent.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-neutral-800/50 text-sm">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${m.type === "INGRESO" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                  {m.type === "INGRESO" ? <ArrowDownCircle className="w-4 h-4" /> : <ArrowUpCircle className="w-4 h-4" />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="truncate">{m.description || m.category}</p>
                  <p className="text-[10px] text-neutral-500">{m.category}{m.createdAt ? ` · ${new Date(m.createdAt).toLocaleString("es-PY", { hour: "2-digit", minute: "2-digit" })}` : ""}</p>
                </div>
                <span className={`font-bold shrink-0 ${m.type === "INGRESO" ? "text-emerald-400" : "text-rose-400"}`}>
                  {m.type === "INGRESO" ? "+" : "-"}{formatPYG(m.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-neutral-800 overflow-hidden">
          <div className="px-4 py-3 bg-neutral-900/60 border-b border-neutral-800 text-sm font-semibold">Cierres anteriores</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-800 bg-neutral-900/50">
                  <th className="text-left px-4 py-2.5 text-neutral-400 font-medium">Apertura</th>
                  <th className="text-left px-4 py-2.5 text-neutral-400 font-medium">Cierre</th>
                  <th className="text-right px-4 py-2.5 text-neutral-400 font-medium">Esperado</th>
                  <th className="text-right px-4 py-2.5 text-neutral-400 font-medium">Contado</th>
                  <th className="text-right px-4 py-2.5 text-neutral-400 font-medium">Dif.</th>
                  <th className="text-center px-4 py-2.5 text-neutral-400 font-medium">Mov.</th>
                </tr>
              </thead>
              <tbody>
                {sessions.filter((s) => s.status === "closed").map((s) => {
                  const diff = s.closingAmount != null && s.expectedAmount != null ? s.closingAmount - s.expectedAmount : null;
                  return (
                    <tr key={s.id} className="border-b border-neutral-800/50">
                      <td className="px-4 py-2.5 text-xs text-neutral-400">{new Date(s.openedAt).toLocaleDateString("es-PY")} {new Date(s.openedAt).toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="px-4 py-2.5 text-xs text-neutral-400">{s.closedAt ? new Date(s.closedAt).toLocaleDateString("es-PY") : "—"}</td>
                      <td className="px-4 py-2.5 text-right">{s.expectedAmount != null ? formatPYG(s.expectedAmount) : "—"}</td>
                      <td className="px-4 py-2.5 text-right">{formatPYG(s.closingAmount || 0)}</td>
                      <td className={`px-4 py-2.5 text-right font-medium ${diff === null ? "text-neutral-500" : diff === 0 ? "text-emerald-400" : "text-amber-400"}`}>{diff === null ? "—" : formatPYG(diff)}</td>
                      <td className="px-4 py-2.5 text-center text-neutral-400">{s._count?.movements ?? 0}</td>
                    </tr>
                  );
                })}
                {sessions.filter((s) => s.status === "closed").length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-neutral-500">Sin cierres registrados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}