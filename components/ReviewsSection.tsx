"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, ShieldCheck, MessageSquare } from "lucide-react";
import { useAuth } from "@/lib/auth/store";
import { useUI } from "@/lib/store";
import { classNames } from "@/lib/utils";

interface ReviewItem {
  id: string;
  rating: number;
  title: string | null;
  comment: string;
  verifiedPurchase: boolean;
  author: string;
  createdAt: string;
}

export function ReviewsSection({ productId }: { productId: string }) {
  const user = useAuth((s) => s.user);
  const showToast = useUI((s) => s.showToast);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [total, setTotal] = useState(0);
  const [average, setAverage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    try {
      const res = await fetch(`/api/products/${productId}/reviews`);
      const data = await res.json();
      setReviews(data.reviews || []);
      setTotal(data.total || 0);
      setAverage(data.average);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    if (comment.trim().length < 3) {
      showToast("Escribí un comentario más largo", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, title: title.trim() || undefined, comment: comment.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "No se pudo enviar la reseña", "error");
        return;
      }
      showToast("¡Gracias por tu reseña!", "success");
      setComment("");
      setTitle("");
      setShowForm(false);
      load();
    } catch {
      showToast("Error de conexión", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-12 card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-brand-400" /> Reseñas
        </h2>
        <div className="text-sm text-neutral-400">
          {average != null ? (
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" /> {average} / 5 · {total} reseña{total === 1 ? "" : "s"}
            </span>
          ) : (
            <span>Sin reseñas todavía</span>
          )}
        </div>
      </div>

      {user ? (
        showForm ? (
          <form onSubmit={submitReview} className="mb-6 bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-3">
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Tu calificación</label>
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setRating(i + 1)}
                    aria-label={`${i + 1} estrellas`}
                  >
                    <Star className={classNames("w-6 h-6 transition-colors", i < rating ? "text-amber-400 fill-amber-400" : "text-neutral-700 hover:text-neutral-500")} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Título (opcional)</label>
              <input className="input px-3 py-2 text-sm w-full" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Excelente producto" />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Comentario</label>
              <textarea className="input px-3 py-2 text-sm w-full" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={2000} required placeholder="Contá cómo te fue con el producto…" />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={submitting} className="btn-primary px-4 py-2 text-sm">
                {submitting ? "Enviando…" : "Publicar reseña"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost px-4 py-2 text-sm">Cancelar</button>
            </div>
          </form>
        ) : (
          <button onClick={() => setShowForm(true)} className="btn-ghost px-4 py-2 text-sm mb-6">
            Dejar mi reseña
          </button>
        )
      ) : (
        <p className="text-sm text-neutral-500 mb-6">
          <Link href={`/login?redirect=/products/${productId}`} className="text-brand-400 hover:underline">Iniciá sesión</Link> para dejar una reseña.
        </p>
      )}

      {loading ? (
        <p className="text-sm text-neutral-500">Cargando reseñas…</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-neutral-500"> Sé el primero en reseñar este producto.</p>
      ) : (
        <ul className="space-y-4">
          {reviews.map((r) => (
            <li key={r.id} className="border-b border-neutral-800/60 last:border-0 pb-4 last:pb-0">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={classNames("w-3.5 h-3.5", i < r.rating ? "text-amber-400 fill-amber-400" : "text-neutral-700")} />
                  ))}
                </div>
                <span className="text-sm font-medium">{r.author}</span>
                {r.verifiedPurchase && (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                    <ShieldCheck className="w-3 h-3" /> Compra verificada
                  </span>
                )}
                <span className="text-xs text-neutral-600 ml-auto">{new Date(r.createdAt).toLocaleDateString("es-PY")}</span>
              </div>
              {r.title && <p className="text-sm font-semibold mt-1.5">{r.title}</p>}
              <p className="text-sm text-neutral-300 mt-1 whitespace-pre-line">{r.comment}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
