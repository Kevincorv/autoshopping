"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search, RefreshCw, Plus, Trash2, Send, Users, Tags as TagsIcon,
  Megaphone, X, Mail, Bell, MessageCircle,
} from "lucide-react";

interface Tag {
  id: string;
  name: string;
  color: string;
  _count?: { customers: number };
}

interface Customer {
  id: string;
  name: string;
  lastname: string;
  email: string;
  totalPurchases: number;
  balance: number;
  tags: Tag[];
}

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  subject: string | null;
  body: string;
  audience: string;
  sentAt: string | null;
  sentCount: number;
  createdAt: string;
}

type Tab = "customers" | "tags" | "campaigns";

export default function AdminCrmPage() {
  const [tab, setTab] = useState<Tab>("customers");
  const [tags, setTags] = useState<Tag[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [newTag, setNewTag] = useState({ name: "", color: "#3b82f6" });
  const [showTagForm, setShowTagForm] = useState(false);
  const [editingTagsFor, setEditingTagsFor] = useState<Customer | null>(null);

  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [campaignForm, setCampaignForm] = useState({
    name: "",
    type: "email",
    subject: "",
    body: "",
    audience: "all",
  });

  const loadAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/crm/tags").then((r) => r.json()).catch(() => ({ tags: [] })),
      fetch(`/api/customers${tagFilter ? `?tag=${tagFilter}` : ""}${search ? `${tagFilter ? "&" : "?"}q=${encodeURIComponent(search)}` : ""}`)
        .then((r) => r.json()).catch(() => ({ customers: [] })),
      fetch("/api/admin/crm/campaigns").then((r) => r.json()).catch(() => ({ campaigns: [] })),
    ])
      .then(([t, c, cam]) => {
        setTags(t.tags || []);
        const custs: Customer[] = c.customers || [];
        setCustomers(tagFilter ? custs.filter((x) => x.tags?.some((tg) => tg.id === tagFilter)) : custs);
        setCampaigns(cam.campaigns || []);
      })
      .finally(() => setLoading(false));
  }, [search, tagFilter]);

  useEffect(loadAll, [loadAll]);

  async function createTag(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/crm/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTag),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setNewTag({ name: "", color: "#3b82f6" });
      setShowTagForm(false);
      loadAll();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteTag(id: string) {
    if (!confirm("¿Eliminar esta etiqueta? Se quitará de todos los clientes.")) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/crm/tags/${id}`, { method: "DELETE" });
      loadAll();
    } finally {
      setBusy(false);
    }
  }

  async function saveCustomerTags(customerId: string, tagIds: string[]) {
    setBusy(true);
    try {
      await fetch(`/api/admin/crm/customers/${customerId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagIds }),
      });
      setEditingTagsFor(null);
      loadAll();
    } finally {
      setBusy(false);
    }
  }

  async function createCampaign(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/crm/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(campaignForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setShowCampaignForm(false);
      setCampaignForm({ name: "", type: "email", subject: "", body: "", audience: "all" });
      loadAll();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function sendCampaign(id: string) {
    if (!confirm("¿Enviar esta campaña a todos los destinatarios de la audiencia?")) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/crm/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      loadAll();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteCampaign(id: string) {
    if (!confirm("¿Eliminar esta campaña?")) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/crm/campaigns/${id}`, { method: "DELETE" });
      loadAll();
    } finally {
      setBusy(false);
    }
  }

  const TABS: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: "customers", label: "Clientes", icon: Users },
    { id: "tags", label: "Etiquetas", icon: TagsIcon },
    { id: "campaigns", label: "Campañas", icon: Megaphone },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">CRM</h1>
          <p className="text-sm text-neutral-400">Segmentos, etiquetas y campañas de clientes</p>
        </div>
        <button onClick={loadAll} className="btn-secondary flex items-center gap-2" disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Actualizar
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-2 flex items-center justify-between">
          {error}
          <button onClick={() => setError("")}><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex gap-2 border-b border-neutral-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id ? "border-red-500 text-white" : "border-transparent text-neutral-400 hover:text-white"
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "customers" && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, email, teléfono..."
                className="input-dark pl-9 w-full"
              />
            </div>
            <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className="input-dark w-auto">
              <option value="">Todas las etiquetas</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <p className="text-neutral-500 text-sm">Cargando...</p>
          ) : customers.length === 0 ? (
            <p className="text-neutral-500 text-sm">No hay clientes</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-neutral-800">
              <table className="w-full text-sm">
                <thead className="bg-neutral-900 text-neutral-400">
                  <tr>
                    <th className="text-left px-4 py-2">Cliente</th>
                    <th className="text-left px-4 py-2">Compras</th>
                    <th className="text-left px-4 py-2">Saldo</th>
                    <th className="text-left px-4 py-2">Etiquetas</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id} className="border-t border-neutral-800 hover:bg-neutral-900/50">
                      <td className="px-4 py-2">
                        <div className="font-medium">{c.name} {c.lastname}</div>
                        <div className="text-neutral-500 text-xs">{c.email}</div>
                      </td>
                      <td className="px-4 py-2">{c.totalPurchases}</td>
                      <td className="px-4 py-2">{c.balance > 0 ? `Gs. ${Math.round(c.balance).toLocaleString("es-PY")}` : "—"}</td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-1">
                          {c.tags.length === 0 && <span className="text-neutral-600 text-xs">Sin etiquetas</span>}
                          {c.tags.map((t) => (
                            <span key={t.id} className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${t.color}30`, color: t.color }}>
                              {t.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button onClick={() => setEditingTagsFor(c)} className="text-red-400 hover:text-red-300 text-xs">
                          Editar etiquetas
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "tags" && (
        <div className="space-y-4">
          {showTagForm ? (
            <form onSubmit={createTag} className="flex gap-3 items-end flex-wrap bg-neutral-900 rounded-lg p-4 border border-neutral-800">
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Nombre</label>
                <input value={newTag.name} onChange={(e) => setNewTag({ ...newTag, name: e.target.value })} className="input-dark w-48" required maxLength={50} />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Color</label>
                <input type="color" value={newTag.color} onChange={(e) => setNewTag({ ...newTag, color: e.target.value })} className="h-10 w-16 rounded cursor-pointer bg-neutral-900 border border-neutral-700" />
              </div>
              <button type="submit" className="btn-primary flex items-center gap-2" disabled={busy}>
                <Plus className="w-4 h-4" /> Crear
              </button>
              <button type="button" onClick={() => setShowTagForm(false)} className="btn-secondary">Cancelar</button>
            </form>
          ) : (
            <button onClick={() => setShowTagForm(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Nueva etiqueta
            </button>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tags.map((t) => (
              <div key={t.id} className="bg-neutral-900 rounded-lg p-4 border border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full" style={{ backgroundColor: t.color }} />
                  <div>
                    <div className="font-medium text-sm">{t.name}</div>
                    <div className="text-neutral-500 text-xs">{t._count?.customers ?? 0} clientes</div>
                  </div>
                </div>
                <button onClick={() => deleteTag(t.id)} className="text-neutral-500 hover:text-red-400" disabled={busy}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {tags.length === 0 && <p className="text-neutral-500 text-sm col-span-full">No hay etiquetas. Creá una para segmentar clientes.</p>}
          </div>
        </div>
      )}

      {tab === "campaigns" && (
        <div className="space-y-4">
          {showCampaignForm ? (
            <form onSubmit={createCampaign} className="bg-neutral-900 rounded-lg p-4 border border-neutral-800 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Nombre de campaña</label>
                  <input value={campaignForm.name} onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })} className="input-dark w-full" required maxLength={120} />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Tipo</label>
                  <select value={campaignForm.type} onChange={(e) => setCampaignForm({ ...campaignForm, type: e.target.value })} className="input-dark w-full">
                    <option value="email">Email (Resend/log)</option>
                    <option value="push">Push (Web Push)</option>
                    <option value="whatsapp">WhatsApp (manual)</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Asunto (para email/push)</label>
                  <input value={campaignForm.subject} onChange={(e) => setCampaignForm({ ...campaignForm, subject: e.target.value })} className="input-dark w-full" maxLength={150} />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Audiencia</label>
                  <select value={campaignForm.audience} onChange={(e) => setCampaignForm({ ...campaignForm, audience: e.target.value })} className="input-dark w-full">
                    <option value="all">Todos los clientes</option>
                    {tags.map((t) => (
                      <option key={t.id} value={`tag:${t.id}`}>Etiqueta: {t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Mensaje</label>
                <textarea value={campaignForm.body} onChange={(e) => setCampaignForm({ ...campaignForm, body: e.target.value })} className="input-dark w-full min-h-[100px]" required maxLength={2000} />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary" disabled={busy}>Crear campaña</button>
                <button type="button" onClick={() => setShowCampaignForm(false)} className="btn-secondary">Cancelar</button>
              </div>
            </form>
          ) : (
            <button onClick={() => setShowCampaignForm(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Nueva campaña
            </button>
          )}

          <div className="overflow-x-auto rounded-lg border border-neutral-800">
            <table className="w-full text-sm">
              <thead className="bg-neutral-900 text-neutral-400">
                <tr>
                  <th className="text-left px-4 py-2">Campaña</th>
                  <th className="text-left px-4 py-2">Tipo</th>
                  <th className="text-left px-4 py-2">Audiencia</th>
                  <th className="text-left px-4 py-2">Estado</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => {
                  const audienceLabel = c.audience === "all" ? "Todos" : tags.find((t) => t.id === c.audience.slice(4))?.name || c.audience;
                  return (
                    <tr key={c.id} className="border-t border-neutral-800">
                      <td className="px-4 py-2">
                        <div className="font-medium">{c.name}</div>
                        {c.subject && <div className="text-neutral-500 text-xs">{c.subject}</div>}
                      </td>
                      <td className="px-4 py-2">
                        <span className="flex items-center gap-1 text-xs">
                          {c.type === "email" ? <Mail className="w-3 h-3" /> : c.type === "push" ? <Bell className="w-3 h-3" /> : <MessageCircle className="w-3 h-3" />}
                          {c.type}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs">{audienceLabel}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${c.status === "sent" ? "bg-emerald-500/15 text-emerald-400" : "bg-neutral-700/40 text-neutral-400"}`}>
                          {c.status === "sent" ? `Enviada (${c.sentCount})` : "Borrador"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right space-x-2 whitespace-nowrap">
                        {c.status === "draft" && (
                          <button onClick={() => sendCampaign(c.id)} className="text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 text-xs" disabled={busy}>
                            <Send className="w-3 h-3" /> Enviar
                          </button>
                        )}
                        <button onClick={() => deleteCampaign(c.id)} className="text-neutral-500 hover:text-red-400" disabled={busy}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {campaigns.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-neutral-500 text-sm">No hay campañas</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editingTagsFor && (
        <TagPickerModal
          customer={editingTagsFor}
          allTags={tags}
          busy={busy}
          onClose={() => setEditingTagsFor(null)}
          onSave={(ids) => saveCustomerTags(editingTagsFor.id, ids)}
        />
      )}
    </div>
  );
}

function TagPickerModal({
  customer,
  allTags,
  busy,
  onClose,
  onSave,
}: {
  customer: Customer;
  allTags: Tag[];
  busy: boolean;
  onClose: () => void;
  onSave: (ids: string[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(customer.tags.map((t) => t.id)));

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-neutral-900 rounded-xl border border-neutral-700 p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold mb-1">Etiquetas de {customer.name} {customer.lastname}</h3>
        <p className="text-neutral-400 text-sm mb-4">Seleccioná las etiquetas del segmento</p>
        <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
          {allTags.map((t) => (
            <label key={t.id} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-neutral-800">
              <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggle(t.id)} className="accent-red-500" />
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
              <span className="text-sm">{t.name}</span>
            </label>
          ))}
          {allTags.length === 0 && <p className="text-neutral-500 text-sm">No hay etiquetas. Creá una en la pestaña Etiquetas.</p>}
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={() => onSave(Array.from(selected))} className="btn-primary" disabled={busy}>Guardar</button>
        </div>
      </div>
    </div>
  );
}
