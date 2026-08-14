"use client";

import { useEffect, useState } from "react";
import { Shield, Plus, X, Save, Trash2, Users } from "lucide-react";
import { useUI } from "@/lib/store";

interface RoleRow { id: string; name: string; description?: string | null; permissions: { resource: string; action: string }[]; _count: { users: number }; }

const RESOURCE_LABELS: Record<string, string> = {
  dashboard: "Dashboard", products: "Productos", categories: "Categorías", brands: "Marcas",
  stock: "Stock y movimientos", purchases: "Compras", suppliers: "Proveedores",
  sales: "Ventas", returns: "Devoluciones", customers: "Clientes", receivables: "Cuentas por cobrar",
  cash: "Caja", reports: "Reportes", settings: "Configuración", users: "Usuarios",
  integrations: "Integraciones", notifications: "Notificaciones",
};
const ACTION_LABELS: Record<string, string> = { view: "Ver", create: "Crear", update: "Editar", delete: "Eliminar", approve: "Aprobar" };

export default function RolesPage() {
  const ui = useUI();
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [resources, setResources] = useState<string[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<RoleRow | null>(null);
  const [matrix, setMatrix] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/roles");
      const d = await r.json();
      setRoles(d.roles || []);
      setResources(d.resources || []);
      setActions(d.actions || []);
    } catch { /* noop */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const selectRole = (role: RoleRow) => {
    setSelected(role);
    const m: Record<string, string[]> = {};
    for (const r of resources) m[r] = role.permissions.filter((p) => p.resource === r).map((p) => p.action);
    setMatrix(m);
  };

  const toggle = (resource: string, action: string) => {
    setMatrix((prev) => {
      const current = prev[resource] || [];
      return { ...prev, [resource]: current.includes(action) ? current.filter((a) => a !== action) : [...current, action] };
    });
  };

  const savePermissions = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const r = await fetch("/api/roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId: selected.id, permissions: resources.map((resource) => ({ resource, actions: matrix[resource] || [] })) }),
      });
      const d = await r.json();
      if (!r.ok) { ui.showToast(d.error || "Error", "error"); return; }
      ui.showToast("Permisos guardados", "success");
      load();
      const fresh = roles.find((x) => x.id === selected.id);
      if (fresh) selectRole(fresh);
    } catch { ui.showToast("Error de conexión", "error"); }
    finally { setSaving(false); }
  };

  const createRole = async () => {
    if (!newName.trim()) { ui.showToast("Nombre obligatorio", "error"); return; }
    const r = await fetch("/api/roles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || undefined }) });
    const d = await r.json();
    if (!r.ok) { ui.showToast(d.error || "Error", "error"); return; }
    ui.showToast("Rol creado", "success");
    setShowNew(false);
    setNewName("");
    setNewDesc("");
    load();
  };

  const deleteRole = async () => {
    if (!selected) return;
    if (!confirm(`¿Eliminar el rol "${selected.name}"?`)) return;
    const r = await fetch(`/api/roles?id=${selected.id}`, { method: "DELETE" });
    const d = await r.json();
    if (!r.ok) { ui.showToast(d.error || "Error", "error"); return; }
    ui.showToast("Rol eliminado", "success");
    setSelected(null);
    load();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Roles y permisos</h1>
          <p className="text-sm text-neutral-500 mt-1">Control de acceso por módulo y acción</p>
        </div>
        <button onClick={() => setShowNew(!showNew)} className="btn-primary text-sm py-2 flex items-center gap-2">
          {showNew ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {showNew ? "Cancelar" : "Nuevo Rol"}
        </button>
      </div>

      {showNew && (
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5 mb-6 max-w-2xl">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-brand-400" /> Crear rol</h2>
          <div className="flex flex-wrap gap-3">
            <input className="input py-2 text-sm w-56" placeholder="Nombre del rol *" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <input className="input py-2 text-sm flex-1 min-w-[200px]" placeholder="Descripción" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
            <button onClick={createRole} className="btn-primary text-sm px-4 py-2"><Save className="w-4 h-4 inline mr-1" /> Crear</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="rounded-xl border border-neutral-800 overflow-hidden">
          <div className="px-4 py-3 bg-neutral-900/60 border-b border-neutral-800 text-sm font-semibold">Roles</div>
          <div>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 bg-neutral-800/50 m-2 rounded animate-pulse" />)
            ) : roles.map((r) => (
              <button key={r.id} onClick={() => selectRole(r)}
                className={`w-full text-left px-4 py-3 border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors flex items-center justify-between ${selected?.id === r.id ? "bg-brand-500/10" : ""}`}>
                <div>
                  <p className="text-sm font-medium flex items-center gap-2"><Shield className="w-4 h-4 text-brand-400" /> {r.name}</p>
                  {r.description && <p className="text-[10px] text-neutral-500 truncate max-w-[180px]">{r.description}</p>}
                </div>
                <span className="text-[10px] text-neutral-500 flex items-center gap-1"><Users className="w-3 h-3" /> {r._count.users}</span>
              </button>
            ))}
          </div>
        </div>

        {selected ? (
          <div className="lg:col-span-3 rounded-xl border border-neutral-800 bg-gradient-to-b from-neutral-900 to-neutral-950 overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold">{selected.name}</h2>
                <p className="text-xs text-neutral-500">{selected.description || "Sin descripción"}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={savePermissions} disabled={saving} className="btn-primary text-sm px-4 py-2 flex items-center gap-2"><Save className="w-4 h-4" /> {saving ? "Guardando..." : "Guardar permisos"}</button>
                {!["admin", "vendedor", "cliente"].includes(selected.name) && (
                  <button onClick={deleteRole} className="btn-ghost p-2 text-rose-400 hover:bg-rose-500/10"><Trash2 className="w-4 h-4" /></button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-800 bg-neutral-900/50">
                    <th className="text-left px-5 py-2.5 text-neutral-400 font-medium">Módulo</th>
                    {actions.map((a) => <th key={a} className="text-center px-3 py-2.5 text-neutral-400 font-medium w-16">{ACTION_LABELS[a] || a}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {resources.map((resource) => (
                    <tr key={resource} className="border-b border-neutral-800/50 hover:bg-neutral-800/20">
                      <td className="px-5 py-2.5 font-medium">{RESOURCE_LABELS[resource] || resource}</td>
                      {actions.map((a) => (
                        <td key={a} className="px-3 py-2.5 text-center">
                          <button onClick={() => toggle(resource, a)}
                            className={`w-6 h-6 rounded-md border transition-colors ${(matrix[resource] || []).includes(a) ? "bg-brand-500 border-brand-400" : "border-neutral-700"}`}
                            aria-label={`${resource} ${a}`} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-3 rounded-xl border border-neutral-800 border-dashed p-12 text-center text-sm text-neutral-500">
            <Shield className="w-10 h-10 mx-auto mb-3 text-neutral-700" />
            Seleccioná un rol para configurar sus permisos
          </div>
        )}
      </div>
    </div>
  );
}