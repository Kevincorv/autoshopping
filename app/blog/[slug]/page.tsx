import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, User, ArrowLeft, Tag } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { toHttps } from "@/lib/utils";
import { textToHtml } from "@/lib/content";

export const dynamic = "force-dynamic";

interface Props {
  params: { slug: string };
}

async function getPost(slug: string) {
  try {
    return await prisma.post.findFirst({ where: { slug, published: true } });
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props) {
  const post = await getPost(params.slug);
  if (!post) return { title: "Artículo no encontrado | AutoShopping" };
  const title = post.metaTitle || `${post.title} | Blog AutoShopping`;
  const description = post.metaDescription || post.excerpt || "Artículo del blog automotriz de AutoShopping.";
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: post.publishedAt?.toISOString(),
      images: post.coverImage ? [toHttps(post.coverImage)] : undefined,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const post = await getPost(params.slug);
  if (!post) notFound();

  const tagList = post.tags ? post.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
  const cover = post.coverImage ? toHttps(post.coverImage) : null;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt || undefined,
    image: cover || undefined,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: { "@type": "Person", name: post.authorName },
    publisher: { "@type": "Organization", name: "AutoShopping" },
    mainEntityOfPage: `${appUrl}/blog/${post.slug}`,
  };

  return (
    <article className="max-w-3xl mx-auto px-4 py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-brand-400 transition-colors mb-5">
        <ArrowLeft className="w-4 h-4" /> Volver al blog
      </Link>

      <header>
        {cover && (
          <div className="aspect-[16/9] rounded-xl overflow-hidden bg-neutral-800 mb-6">
            <img src={cover} alt={post.title} className="w-full h-full object-cover" />
          </div>
        )}
        <h1 className="text-2xl md:text-3xl font-extrabold leading-tight">{post.title}</h1>
        <div className="flex items-center gap-4 mt-3 text-sm text-neutral-400 flex-wrap">
          <span className="inline-flex items-center gap-1.5">
            <User className="w-4 h-4" /> {post.authorName}
          </span>
          {post.publishedAt && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4" />
              {new Date(post.publishedAt).toLocaleDateString("es-PY", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          )}
        </div>
        {tagList.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tagList.map((t) => (
              <span key={t} className="px-2.5 py-1 text-xs rounded-full bg-neutral-800 text-neutral-300 inline-flex items-center gap-1">
                <Tag className="w-3 h-3" /> {t}
              </span>
            ))}
          </div>
        )}
      </header>

      <div
        className="prose-blog mt-8 text-neutral-300 leading-relaxed text-[15px]"
        dangerouslySetInnerHTML={{ __html: textToHtml(post.content) }}
      />

      <footer className="mt-10 pt-6 border-t border-neutral-800">
        <p className="text-sm text-neutral-500">
          ¿Necesitás repuestos o asesoramiento? Escribinos por WhatsApp o visitá nuestra tienda en San Ignacio, Misiones.
        </p>
        <Link href="/products" className="btn-primary inline-flex mt-4">Ver productos</Link>
      </footer>
    </article>
  );
}
