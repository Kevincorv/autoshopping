import { prisma } from "@/lib/prisma";
import { toHttps } from "@/lib/utils";
import ProductDetailClient from "./ProductDetailClient";

export const dynamic = "force-dynamic";

interface Props {
  params: { id: string };
}

async function getProduct(id: string) {
  try {
    return await prisma.product.findFirst({
      where: { OR: [{ id }, { slug: id }], isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        price: true,
        comparePrice: true,
        stock: true,
        rating: true,
        reviews: true,
        metaTitle: true,
        metaDescription: true,
        brand: { select: { name: true } },
        images: { where: { isPrimary: true }, take: 1, select: { url: true } },
      },
    });
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props) {
  const p = await getProduct(params.id);
  if (!p) return { title: "Producto no encontrado | AutoShopping" };
  const title = p.metaTitle || `${p.name} | AutoShopping`;
  const description = p.metaDescription || p.description?.slice(0, 160) || `${p.name} — comprá en AutoShopping, San Ignacio, Misiones.`;
  const image = p.images[0] ? toHttps(p.images[0].url) : undefined;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: image ? [image] : undefined,
    },
    twitter: { card: "summary_large_image", title, description, images: image ? [image] : undefined },
  };
}

export default async function ProductPage({ params }: Props) {
  const p = await getProduct(params.id);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const image = p?.images?.[0] ? toHttps(p.images[0].url) : undefined;

  const jsonLd = p
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: p.name,
        sku: p.slug,
        description: p.description || undefined,
        image: image ? [image] : undefined,
        brand: { "@type": "Brand", name: p.brand.name },
        aggregateRating:
          p.reviews > 0
            ? { "@type": "AggregateRating", ratingValue: p.rating, reviewCount: p.reviews }
            : undefined,
        offers: {
          "@type": "Offer",
          url: `${appUrl}/products/${p.slug}`,
          priceCurrency: "PYG",
          price: p.price,
          availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        },
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
      )}
      <ProductDetailClient />
    </>
  );
}
