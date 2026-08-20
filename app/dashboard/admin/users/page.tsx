"use client";

import { useEffect, useState } from "react";
import { Users, Shield, Search, Ban, CheckCircle, Plus, MoreVertical, X } from "lucide-react";

interface UserRow {
  id: string;
  name: string;
  lastname: string;
  email: string;
  phone: string;
  role: { id: string; name: string };
  isActive: boolean;
  createdAt: string;
}

interface RoleRow {
  id: string;
  name: string;
  description: string | null;
  _count: { users: number };
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"users" | "roles">("users");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    lastname: "",
    email: "",
    document: "",
    phone: "",
    password: "",
    roleId: "",
  });

  async function loadUsers() {
    const r = await fetch("/api/users").then((r) => r.json()).catch(() => ({ users: [] }));
    setUsers(r.users || []);
  }

  useEffect(() => {
    Promise.all([
      loadUsers(),
      fetch("/api/roles").then((r) => r.json()).catch(() => ({ roles: [] })),
    ]).then(([, r]) => {
      setRoles(r.roles || []);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = users.filter(
    (u) =>
      `${u.name} ${u.lastname}`.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggleUserStatus = async (userId: string, current: boolean) => {
    try {
      await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !current }),
      });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isActive: !current } : u)));
    } catch {}
  };

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al crear el usuario");
        setSaving(false);
        return;
      }
      setModalOpen(false);
      setForm({ name: "", lastname: "", email: "", document: "", phone: "", password: "", roleId: "" });
      await loadUsers();
    } catch {
      setError("Error de conexión");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-neutral-800 rounded animate-pulse" />
        <div className="h-64 bg-neutral-800/50 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Usuarios y Roles</h1>
          <p className="text-sm text-neutral-500 mt-1">Gestión de acceso al sistema</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" />
          Nuevo Usuario
        </button>
      </div>

      <div className="flex gap-1 mb-6 bg-neutral-900 rounded-lg p-0.5 border border-neutral-800 w-fit">
        <button
          onClick={() => setTab("users")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            tab === "users" ? "bg-brand-600 text-white" : "text-neutral-400 hover:text-white"
          }`}
        >
          <Users className="w-4 h-4" />
          Usuarios ({users.length})
        </button>
        <button
          onClick={() => setTab("roles")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            tab === "roles" ? "bg-brand-600 text-white" : "text-neutral-400 hover:text-white"
          }`}
        >
          <Shield className="w-4 h-4" />
          Roles ({roles.length})
        </button>
      </div>

      {tab === "users" && (
        <>
          <div className="relative max-w-sm mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar usuarios..."
              className="input pl-9 w-full text-sm"
            />
          </div>

          <div className="rounded-xl border border-neutral-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-800 bg-neutral-900/50">
                  <th className="text-left px-4 py-3 text-neutral-400 font-medium">Usuario</th>
                  <th className="text-left px-4 py-3 text-neutral-400 font-medium">Email</th>
                  <th className="text-left px-4 py-3 text-neutral-400 font-medium">Teléfono</th>
                  <th className="text-left px-4 py-3 text-neutral-400 font-medium">Rol</th>
                  <th className="text-center px-4 py-3 text-neutral-400 font-medium">Estado</th>
                  <th className="text-right px-4 py-3 text-neutral-400 font-medium">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-neutral-500">
                      No se encontraron usuarios
                    </td>
                  </tr>
                ) : (
                  filtered.map((u) => (
                    <tr key={u.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-neutral-800 flex items-center justify-center">
                            <span className="text-xs font-bold text-neutral-400">
                              {u.name[0]}{u.lastname[0]}
                            </span>
                          </div>
                          <div>
                            <p className="text-white font-medium">{u.name} {u.lastname}</p>
                            <p className="text-[10px] text-neutral-500">ID: {u.id.slice(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-neutral-300">{u.email}</td>
                      <td className="px-4 py-3 text-neutral-400">{u.phone}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-brand-500/10 text-brand-400">
                          {u.role.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          u.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                        }`}>
                          {u.isActive ? "Activo" : "Bloqueado"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => toggleUserStatus(u.id, u.isActive)}
                          className="btn-ghost p-1.5"
                          title={u.isActive ? "Bloquear" : "Activar"}
                        >
                          {u.isActive ? <Ban className="w-4 h-4 text-rose-400" /> : <CheckCircle className="w-4 h-4 text-emerald-400" />}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === "roles" && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => (
            <div
              key={role.id}
              className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5 hover:border-neutral-700 transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-brand-500/15 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-brand-400" />
                </div>
                <div>
                  <p className="text-white font-semibold capitalize">{role.name.replace("_", " ")}</p>
                  {role.description && (
                    <p className="text-xs text-neutral-500">{role.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-400">{role._count.users} usuario(s)</span>
                <button className="text-brand-400 text-xs hover:underline">Editar permisos</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Nuevo Usuario</h2>
              <button onClick={() => setModalOpen(false)} className="btn-ghost p-1.5">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">Nombre</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="input px-3 w-full"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">Apellido</label>
                  <input
                    value={form.lastname}
                    onChange={(e) => setForm((p) => ({ ...p, lastname: e.target.value }))}
                    className="input px-3 w-full"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="input px-3 w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">Documento</label>
                <input
                  value={form.document}
                  onChange={(e) => setForm((p) => ({ ...p, document: e.target.value }))}
                  className="input px-3 w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">Teléfono</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  className="input px-3 w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">Contraseña</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  className="input px-3 w-full"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">Rol</label>
                <select
                  value={form.roleId}
                  onChange={(e) => setForm((p) => ({ ...p, roleId: e.target.value }))}
                  className="input px-3 w-full"
                  required
                >
                  <option value="">Seleccionar rol...</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-ghost px-4 py-2 text-sm">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="btn-primary px-4 py-2 text-sm">
                  {saving ? "Creando..." : "Crear usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
