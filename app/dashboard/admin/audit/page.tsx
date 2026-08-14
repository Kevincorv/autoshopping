"use client";

import { useEffect, useState } from "react";
import { ClipboardList, Search, Filter, User, Activity } from "lucide-react";

interface AuditEntry {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
  user: { name: string; lastname: string } | null;
}

export default function AdminAudit() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/audit")
      .then((r) => r.json())
      .then((data) => setLogs(data.logs || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.resource.toLowerCase().includes(search.toLowerCase()) ||
      l.details?.toLowerCase().includes(search.toLowerCase()) ||
      `${l.user?.name || ""} ${l.user?.lastname || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  const getActionColor = (action: string) => {
    if (action.includes("create")) return "text-emerald-400";
    if (action.includes("update") || action.includes("change")) return "text-sky-400";
    if (action.includes("delete")) return "text-rose-400";
    return "text-neutral-400";
  };

  const getResourceIcon = (resource: string) => {
    const map: Record<string, string> = {
      product: "📦",
      order: "🛒",
      user: "👤",
      category: "🏷️",
      payment: "💳",
      setting: "⚙️",
      role: "🛡️",
    };
    return map[resource] || "📋";
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-neutral-800 rounded animate-pulse" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 bg-neutral-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Auditoría</h1>
          <p className="text-sm text-neutral-500 mt-1">Registro de actividad del sistema</p>
        </div>
      </div>

      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar en auditoría..."
          className="input pl-9 w-full text-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-12 text-center">
          <ClipboardList className="w-12 h-12 text-neutral-700 mx-auto mb-3" />
          <p className="text-neutral-500">No se encontraron registros de auditoría</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-4 bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-4 hover:border-neutral-700 transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-lg shrink-0">
                {getResourceIcon(log.resource)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-white font-medium">
                    {log.user ? `${log.user.name} ${log.user.lastname}` : "Sistema"}
                  </span>
                  <span className={`text-xs font-medium ${getActionColor(log.action)}`}>
                    {log.action.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs text-neutral-500 capitalize">{log.resource}</span>
                </div>
                {log.details && (
                  <p className="text-sm text-neutral-400 mt-1">{log.details}</p>
                )}
                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-neutral-600">
                  <span>{new Date(log.createdAt).toLocaleString("es-PY")}</span>
                  {log.ipAddress && <span>IP: {log.ipAddress}</span>}
                  {log.resourceId && <span>ID: {log.resourceId.slice(0, 8)}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
