import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/middleware";
import { sanitizeText, sanitizeMultiline } from "@/lib/validation";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const all = searchParams.get("all") === "1";
  const q = searchParams.get("q");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(parseInt(searchParams.get("limit") || "12", 10), 50);

  const where: Record<string, unknown> = {};
  if (!all) where.published = true;
  if (q) where.OR = [{ title: { contains: q } }, { excerpt: { contains: q } }, { tags: { contains: q } }];

  try {
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          coverImage: true,
          authorName: true,
          tags: true,
          published: true,
          publishedAt: true,
          createdAt: true,
        },
      }),
      prisma.post.count({ where }),
    ]);

    return NextResponse.json({
      posts: posts.map((p) => ({
        ...p,
        publishedAt: p.publishedAt?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
        tagList: p.tags ? p.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      })),
      total,
    });
  } catch (error) {
    console.error("Posts API error:", error);
    return NextResponse.json({ posts: [], total: 0 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request as any);
  if (auth.response) return auth.response;
  try {
    const body = await request.json();
    const { title, slug, excerpt, content, coverImage, authorName, tags, published, metaTitle, metaDescription } = body || {};

    if (!title || !String(title).trim()) {
      return NextResponse.json({ error: "El título es obligatorio" }, { status: 400 });
    }
    const cleanTitle = sanitizeText(String(title), 200);
    const rootSlug = slug && String(slug).trim() ? slugify(String(slug)) : slugify(cleanTitle) || `post-${Date.now()}`;

    let finalSlug = rootSlug;
    let i = 2;
    while (await prisma.post.findUnique({ where: { slug: finalSlug } })) {
      finalSlug = `${rootSlug}-${i}`;
      i++;
    }

    const now = new Date();
    const isPublished = published === true;

    const post = await prisma.post.create({
      data: {
        title: cleanTitle,
        slug: finalSlug,
        excerpt: excerpt ? sanitizeText(String(excerpt), 500) : "",
        content: content ? sanitizeMultiline(String(content), 100000) : "",
        coverImage: coverImage ? sanitizeText(String(coverImage), 500) : null,
        authorName: authorName ? sanitizeText(String(authorName), 100) : "AutoShopping",
        tags: tags && typeof tags === "string" ? sanitizeText(tags, 300) : Array.isArray(tags) ? sanitizeText(tags.join(","), 300) : "",
        published: isPublished,
        publishedAt: isPublished ? now : null,
        metaTitle: metaTitle ? sanitizeText(String(metaTitle), 200) : null,
        metaDescription: metaDescription ? sanitizeText(String(metaDescription), 300) : null,
      },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error: any) {
    console.error("Post create error:", error);
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Ya existe un artículo con ese slug" }, { status: 409 });
    }
    return NextResponse.json({ error: "Error al crear el artículo" }, { status: 500 });
  }
}
