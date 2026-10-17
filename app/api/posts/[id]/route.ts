import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/middleware";
import { sanitizeText, sanitizeMultiline } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const post = await prisma.post.findFirst({
      where: { OR: [{ id: params.id }, { slug: params.id }] },
    });
    if (!post) {
      return NextResponse.json({ error: "Artículo no encontrado" }, { status: 404 });
    }
    return NextResponse.json({
      post: {
        ...post,
        publishedAt: post.publishedAt?.toISOString() ?? null,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
        tagList: post.tags ? post.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      },
    });
  } catch (error) {
    console.error("Post get error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin(request as any);
  if (auth.response) return auth.response;
  try {
    const existing = await prisma.post.findFirst({
      where: { OR: [{ id: params.id }, { slug: params.id }] },
    });
    if (!existing) {
      return NextResponse.json({ error: "Artículo no encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const { title, excerpt, content, coverImage, authorName, tags, published, metaTitle, metaDescription } = body || {};

    const becomesPublished = published === true && !existing.published;

    const updated = await prisma.post.update({
      where: { id: existing.id },
      data: {
        title: title !== undefined ? sanitizeText(String(title), 200) : existing.title,
        excerpt: excerpt !== undefined ? sanitizeText(String(excerpt), 500) : existing.excerpt,
        content: content !== undefined ? sanitizeMultiline(String(content), 100000) : existing.content,
        coverImage: coverImage !== undefined ? (coverImage ? sanitizeText(String(coverImage), 500) : null) : existing.coverImage,
        authorName: authorName !== undefined ? sanitizeText(String(authorName), 100) : existing.authorName,
        tags: tags !== undefined
          ? typeof tags === "string"
            ? sanitizeText(tags, 300)
            : Array.isArray(tags)
              ? sanitizeText(tags.join(","), 300)
              : existing.tags
          : existing.tags,
        published: published !== undefined ? published === true : existing.published,
        publishedAt: becomesPublished ? new Date() : existing.publishedAt,
        metaTitle: metaTitle !== undefined ? (metaTitle ? sanitizeText(String(metaTitle), 200) : null) : existing.metaTitle,
        metaDescription: metaDescription !== undefined ? (metaDescription ? sanitizeText(String(metaDescription), 300) : null) : existing.metaDescription,
      },
    });

    return NextResponse.json({ post: { id: updated.id, slug: updated.slug, title: updated.title, published: updated.published } });
  } catch (error) {
    console.error("Post update error:", error);
    return NextResponse.json({ error: "Error al actualizar el artículo" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin(_request as any);
  if (auth.response) return auth.response;
  try {
    const existing = await prisma.post.findFirst({
      where: { OR: [{ id: params.id }, { slug: params.id }] },
    });
    if (!existing) {
      return NextResponse.json({ error: "Artículo no encontrado" }, { status: 404 });
    }
    await prisma.post.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Post delete error:", error);
    return NextResponse.json({ error: "Error al eliminar el artículo" }, { status: 500 });
  }
}
