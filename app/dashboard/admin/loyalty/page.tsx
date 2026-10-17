"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Save, Gift, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface Rule {
  id: string;
  pointsPer1000Gs: number;
  valuePerPointGs: number;
  minRedeemPoints: number;
  maxRedeemPercent: number;
  active: boolean;
}

interface Movement {
  id: string;
  type: string;
  points: number;
  note: string | null;
  createdAt: string;
  customer: { name: string; lastname: string; email: string };
  order: { orderNumber: string } | null;
}

export default function AdminLoyaltyPage() {
  const [rule, setRule] = useState<Rule | null>(null);
  const [form, setForm] = useState({ pointsPer1000Gs: "", valuePerPointGs: "", minRedeemPoints: "", maxRedeemPercent: "", active: true });
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/loyalty").then((r) => r.json()).catch(() => ({ rule: null })),
      fetch("/api/admin/loyalty/movements").then((r) => r.json()).catch(() => ({ movements: [] })),
    ]).then(([r, m]) => {
      if (r.rule) {
        setRule(r.rule);
        setForm({
          pointsPer1000Gs: String(r.rule.pointsPer1000Gs),
          valuePerPointGs: String(r.rule.valuePerPointGs),
          minRedeemPoints: String(r.rule.minRedeemPoints),
          maxRedeemPercent: String(r.rule.maxRedeemPercent),
          active: r.rule.active,
        });
      }
      setMovements(m.movements || []);
    }).finally(() => setLoading(false));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/loyalty", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pointsPer1000Gs: parseInt(form.pointsPer1000Gs) || 0,
          valuePerPointGs: parseInt(form.valuePerPointGs) || 0,
          minRedeemPoints: parseInt(form.minRedeemPoints) || 0,
          maxRedeemPercent: parseInt(form.maxRedeemPercent) || 0,
          active: form.active,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setRule(data.rule);
      setMsg("Regla guardada");
    } catch (err: any) {
      setMsg(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-neutral-500 text-sm">Cargando...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Gift className="w-6 h-6 text-amber-400" /> Programa de puntos</h1>
        <p className="text-sm text-neutral-400">Los clientes ganan puntos por cada compra y pueden canjearlos en el checkout</p>
      </div>

      <form onSubmit={save} className="bg-neutral-900 rounded-xl border border-neutral-800 p-6 space-y-4 max-w-2xl">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Puntos por cada 1.000 Gs.</label>
            <input type="number" min={0} value={form.pointsPer1000Gs} onChange={(e) => setForm({ ...form, pointsPer1000Gs: e.target.value })} className="input-dark w-full" />
          </div>
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Valor de 1 punto (Gs.)</label>
            <input type="number" min={0} value={form.valuePerPointGs} onChange={(e) => setForm({ ...form, valuePerPointGs: e.target.value })} className="input-dark w-full" />
          </div>
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Mínimo de puntos para canjear</label>
            <input type="number" min={0} value={form.minRedeemPoints} onChange={(e) => setForm({ ...form, minRedeemPoints: e.target.value })} className="input-dark w-full" />
          </div>
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Máximo canje por pedido (% del total)</label>
            <input type="number" min={0} max={100} value={form.maxRedeemPercent} onChange={(e) => setForm({ ...form, maxRedeemPercent: e.target.value })} className="input-dark w-full" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="accent-amber-500" />
          Programa activo
        </label>
        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary flex items-center gap-2" disabled={saving}>
            <Save className="w-4 h-4" /> {saving ? "Guardando..." : "Guardar regla"}
          </button>
          {msg && <span className="text-sm text-neutral-400">{msg}</span>}
        </div>
        {rule && (
          <p className="text-xs text-neutral-500 border-t border-neutral-800 pt-3">
            Ejemplo: comprando Gs. 100.000 ganás {Math.floor(100000 / 1000) * (parseInt(form.pointsPer1000Gs) || 0)} puntos = {(((Math.floor(100000 / 1000) * (parseInt(form.pointsPer1000Gs) || 0)) * (parseInt(form.valuePerPointGs) || 0))).toLocaleString("es-PY")} Gs. de descuento al canjear.
          </p>
        )}
      </form>

      <div>
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Últimos movimientos
        </h2>
        {movements.length === 0 ? (
          <p className="text-neutral-500 text-sm">No hay movimientos todavía</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-neutral-800">
            <table className="w-full text-sm">
              <thead className="bg-neutral-900 text-neutral-400">
                <tr>
                  <th className="text-left px-4 py-2">Cliente</th>
                  <th className="text-left px-4 py-2">Tipo</th>
                  <th className="text-right px-4 py-2">Puntos</th>
                  <th className="text-left px-4 py-2">Detalle</th>
                  <th className="text-left px-4 py-2">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id} className="border-t border-neutral-800">
                    <td className="px-4 py-2">
                      <div>{m.customer?.name} {m.customer?.lastname}</div>
                      <div className="text-neutral-500 text-xs">{m.customer?.email}</div>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${m.points >= 0 ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>
                        {m.points >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {m.type === "earn" ? "Ganados" : m.type === "redeem" ? "Canjeados" : "Ajuste"}
                      </span>
                    </td>
                    <td className={`px-4 py-2 text-right font-semibold ${m.points >= 0 ? "text-emerald-400" : "text-amber-400"}`}>
                      {m.points >= 0 ? `+${m.points}` : m.points}
                    </td>
                    <td className="px-4 py-2 text-xs text-neutral-400">{m.note || "—"}</td>
                    <td className="px-4 py-2 text-xs text-neutral-500">{new Date(m.createdAt).toLocaleString("es-PY")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
