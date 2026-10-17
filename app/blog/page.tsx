import Link from "next/link";
import { CalendarDays, User, Newspaper, Tag } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { toHttps } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Blog automotriz | AutoShopping",
  description:
    "Consejos de mantenimiento, novedades y guías de repuestos para tu auto. Blog automotriz de AutoShopping, San Ignacio, Misiones.",
};

export default async function BlogPage() {
  let posts: {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    coverImage: string | null;
    authorName: string;
    tags: string;
    publishedAt: Date | null;
  }[] = [];

  try {
    posts = await prisma.post.findMany({
      where: { published: true },
      orderBy: { publishedAt: "desc" },
      take: 60,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        coverImage: true,
        authorName: true,
        tags: true,
        publishedAt: true,
      },
    });
  } catch {
    posts = [];
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          <Newspaper className="w-6 h-6 text-brand-400" /> Blog automotriz
        </h1>
        <p className="text-sm text-neutral-400 mt-1">
          Consejos de mantenimiento, guías de compra y novedades del mundo automotor.
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="card p-12 text-center">
          <Newspaper className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
          <p className="text-neutral-300">Aún no hay artículos publicados.</p>
          <p className="text-sm text-neutral-500 mt-1">Volvé pronto: publicamos consejos y guías nuevas cada semana.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {posts.map((p) => {
            const tagList = p.tags ? p.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
            return (
              <Link
                key={p.id}
                href={`/blog/${p.slug}`}
                className="card overflow-hidden group hover:border-brand-500/50 hover:shadow-lg hover:shadow-brand-500/5 transition-all duration-300 flex flex-col"
              >
                <div className="aspect-[16/9] bg-neutral-800 overflow-hidden">
                  {p.coverImage ? (
                    <img
                      src={toHttps(p.coverImage) || ""}
                      alt={p.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-600">
                      <Newspaper className="w-10 h-10" />
                    </div>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h2 className="font-bold line-clamp-2 group-hover:text-brand-400 transition">{p.title}</h2>
                  {p.excerpt && <p className="text-sm text-neutral-400 mt-2 line-clamp-3">{p.excerpt}</p>}
                  <div className="mt-auto pt-3 flex items-center gap-3 text-xs text-neutral-500">
                    <span className="inline-flex items-center gap-1">
                      <User className="w-3 h-3" /> {p.authorName}
                    </span>
                    {p.publishedAt && (
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {new Date(p.publishedAt).toLocaleDateString("es-PY")}
                      </span>
                    )}
                  </div>
                  {tagList.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {tagList.slice(0, 3).map((t) => (
                        <span key={t} className="px-2 py-0.5 text-[10px] rounded-full bg-neutral-800 text-neutral-300 inline-flex items-center gap-1">
                          <Tag className="w-2.5 h-2.5" /> {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
