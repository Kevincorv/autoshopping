"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { useAuth } from "@/lib/auth/store";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface Message {
  id: string;
  sender: string;
  body: string;
  createdAt: string;
}

interface Session {
  id: string;
  status: string;
  messages: Message[];
}

export function ChatWidget() {
  const user = useAuth((s) => s.user);
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [starting, setStarting] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetch("/api/chat")
        .then((r) => r.json())
        .then((data) => {
          const open = (data.sessions || []).find((s: Session) => s.status === "open");
          if (open) {
            setSession(open);
            setMessages(open.messages || []);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (!session?.id || session.status !== "open") return;
    const interval = setInterval(() => {
      fetch(`/api/chat/${session.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.session?.messages) setMessages(data.session.messages);
        })
        .catch(() => {});
    }, 8000);
    return () => clearInterval(interval);
  }, [session?.id, session?.status]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setStarting(true);
    setError("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message: "Hola, quiero consultar por un producto." }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setSession(data.session);
      setMessages(data.session.messages || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setStarting(false);
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !session?.id || sending) return;
    setSending(true);
    const optimistic: Message = { id: `tmp-${Date.now()}`, sender: "customer", body: text.trim(), createdAt: new Date().toISOString() };
    setMessages((m) => [...m, optimistic]);
    setText("");
    try {
      const res = await fetch(`/api/chat/${session.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: optimistic.body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setMessages((m) => [...m.filter((x) => x.id !== optimistic.id), data.message]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Chat de atención"
        className="fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg flex items-center justify-center transition-colors"
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </button>

      {open && (
        <div className="fixed bottom-36 right-4 z-40 w-80 max-w-[calc(100vw-2rem)] bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden flex flex-col" style={{ height: 420 }}>
          <div className="bg-neutral-800 px-4 py-3 border-b border-neutral-700">
            <p className="font-semibold text-sm">Atención AutoShopping</p>
            <p className="text-xs text-neutral-400">Respondemos por chat dentro del horario de la tienda</p>
          </div>

          {!session ? (
            <form onSubmit={start} className="p-4 space-y-3 flex-1 flex flex-col justify-center">
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Tu nombre</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="input-dark w-full" required maxLength={80} />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Email (opcional)</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-dark w-full" maxLength={120} />
              </div>
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <button type="submit" className="btn-primary w-full" disabled={starting}>
                {starting ? "Iniciando..." : "Iniciar chat"}
              </button>
              <p className="text-xs text-neutral-500 text-center">Si preferís, escribinos por WhatsApp desde el botón flotante.</p>
            </form>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.sender === "admin" ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      m.sender === "admin" ? "bg-neutral-800 text-neutral-200" : "bg-red-600 text-white"
                    }`}>
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <p className="text-[10px] opacity-60 mt-1">
                        {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true, locale: es })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              {session.status === "closed" ? (
                <div className="p-3 text-center text-xs text-neutral-500 border-t border-neutral-800">Chat cerrado</div>
              ) : (
                <form onSubmit={send} className="p-2 border-t border-neutral-800 flex gap-2">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Escribí tu mensaje..."
                    className="input-dark flex-1 text-sm"
                    maxLength={1000}
                  />
                  <button type="submit" disabled={sending || !text.trim()} className="btn-primary px-3" aria-label="Enviar">
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
