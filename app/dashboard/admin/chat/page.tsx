"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { RefreshCw, Send, MessageCircle, CheckCircle2, Lock, ArrowLeft } from "lucide-react";

interface Message {
  id: string;
  sender: string;
  body: string;
  createdAt: string;
}

interface ChatSession {
  id: string;
  guestName: string | null;
  guestEmail: string | null;
  status: string;
  unreadAdmin: number;
  lastMessageAt: string | null;
  createdAt: string;
  messages: Message[];
  _count?: { messages: number };
  customer?: { name: string; lastname: string; email: string } | null;
}

export default function AdminChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    fetch("/api/admin/chat")
      .then((r) => r.json())
      .then((data) => setSessions(data.sessions || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  useEffect(() => {
    if (!selected?.id) return;
    const interval = setInterval(() => {
      fetch(`/api/admin/chat/${selected.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.session?.messages) {
            setMessages(data.session.messages);
            setSelected((s) => (s ? { ...s, unreadAdmin: 0 } : s));
          }
        })
        .catch(() => {});
    }, 6000);
    return () => clearInterval(interval);
  }, [selected?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function openSession(s: ChatSession) {
    setSelected(s);
    try {
      const res = await fetch(`/api/admin/chat/${s.id}`);
      const data = await res.json();
      if (data.session) setMessages(data.session.messages || []);
    } catch {}
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!selected?.id || !text.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/admin/chat/${selected.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.message) {
        setMessages((m) => [...m, data.message]);
        setText("");
      }
    } finally {
      setSending(false);
    }
  }

  async function toggleStatus(s: ChatSession) {
    const next = s.status === "open" ? "closed" : "open";
    await fetch(`/api/admin/chat/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setSelected((sel) => (sel ? { ...sel, status: next } : sel));
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><MessageCircle className="w-6 h-6 text-red-400" /> Chats</h1>
          <p className="text-sm text-neutral-400">Conversaciones con clientes (actualiza cada 6s)</p>
        </div>
        <button onClick={load} className="btn-secondary flex items-center gap-2" disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Actualizar
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="rounded-lg border border-neutral-800 overflow-hidden">
          <div className="bg-neutral-900 px-4 py-2 text-xs text-neutral-400 font-medium">Conversaciones</div>
          <div className="max-h-[600px] overflow-y-auto">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => openSession(s)}
                className={`w-full text-left px-4 py-3 border-b border-neutral-800 hover:bg-neutral-900/60 transition-colors ${
                  selected?.id === s.id ? "bg-neutral-900" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm truncate">
                    {s.guestName || s.customer?.name || "Cliente"}
                  </span>
                  <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full ${
                    s.status === "open" ? "bg-emerald-500/15 text-emerald-400" : "bg-neutral-700/40 text-neutral-500"
                  }`}>
                    {s.status === "open" ? "Abierto" : "Cerrado"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className="text-xs text-neutral-500 truncate">{s.guestEmail || s.customer?.email || "—"}</span>
                  {s.unreadAdmin > 0 && (
                    <span className="shrink-0 bg-red-500 text-white text-[10px] rounded-full px-1.5">{s.unreadAdmin}</span>
                  )}
                </div>
                {s.messages?.[0] && (
                  <p className="text-xs text-neutral-400 truncate mt-1">{s.messages[0].body}</p>
                )}
              </button>
            ))}
            {sessions.length === 0 && <p className="text-neutral-500 text-sm p-4">No hay chats todavía</p>}
          </div>
        </div>

        <div className="rounded-lg border border-neutral-800 flex flex-col" style={{ height: 600 }}>
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-neutral-600 text-sm">
              Seleccioná una conversación
            </div>
          ) : (
            <>
              <div className="bg-neutral-900 px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{selected.guestName || selected.customer?.name || "Cliente"}</p>
                  <p className="text-xs text-neutral-500">{selected.guestEmail || selected.customer?.email || "—"}</p>
                </div>
                <button onClick={() => toggleStatus(selected)} className={`btn-secondary text-xs flex items-center gap-1 ${selected.status === "open" ? "text-amber-400" : "text-emerald-400"}`}>
                  {selected.status === "open" ? <Lock className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                  {selected.status === "open" ? "Cerrar chat" : "Reabrir"}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.sender === "admin" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      m.sender === "admin" ? "bg-red-600 text-white" : "bg-neutral-800 text-neutral-200"
                    }`}>
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <p className="text-[10px] opacity-60 mt-1">{new Date(m.createdAt).toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              {selected.status === "open" ? (
                <form onSubmit={send} className="p-3 border-t border-neutral-800 flex gap-2">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Responder al cliente..."
                    className="input-dark flex-1 text-sm"
                    maxLength={1000}
                  />
                  <button type="submit" disabled={sending || !text.trim()} className="btn-primary px-3">
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <div className="p-3 border-t border-neutral-800 text-center text-xs text-neutral-500">
                  Chat cerrado — reabrí para responder
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
