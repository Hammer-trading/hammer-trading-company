import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetailClient } from "@/components/product-detail-client";
import { ProductCard } from "@/components/product-card";
import { SectionReveal } from "@/components/section-reveal";
import { filterStorefrontProducts, getStorefrontProduct, getStorefrontProducts, toProductCardSummary } from "@/lib/storefront-products";
import { money } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { ProductReviews } from "@/components/product-reviews";
import { getAppUrl } from "@/lib/app-url";
import { tryDatabaseRead } from "@/lib/db-fallback";

export const revalidate = 300;
export const dynamic = "force-dynamic";
export const dynamicParams = true;

function safeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getStorefrontProduct(slug);
  if (!product) return {};
  const title = product.seoTitle || product.name;
  const description = product.seoDescription || product.shortDescription;
  return {
    title,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: product.image, alt: product.name }]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [product.image]
    }
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [product, products] = await Promise.all([getStorefrontProduct(slug), getStorefrontProducts()]);
  if (!product) notFound();
  const reviews = await tryDatabaseRead(() => prisma.review.findMany({
    where: { productId: product.id, isApproved: true, isRejected: false, isAbusive: false },
    select: {
      id: true,
      rating: true,
      title: true,
      comment: true,
      reply: true,
      isVerifiedPurchase: true,
      createdAt: true,
      user: { select: { name: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 20
  }), 6_000) || [];
  const related = filterStorefrontProducts(products, undefined, product.category).filter((item) => item.id !== product.id).slice(0, 5);
  const together = products.filter((item) => item.id !== product.id).slice(0, 2);

  return (
    <div className="store-product-detail-page mx-auto max-w-[92rem] px-4 py-8 sm:px-6 sm:py-10 lg:px-8 xl:px-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            image: product.images.map((image) => image.url),
            description: product.seoDescription || product.shortDescription,
            sku: product.sku,
            brand: { "@type": "Brand", name: product.brand },
            category: product.category,
            ...(product.reviewCount ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.rating, reviewCount: product.reviewCount } } : {}),
            offers: {
              "@type": "Offer",
              priceCurrency: "PKR",
              price: product.price,
              availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
              url: `${getAppUrl()}/products/${product.slug}`
            }
          })
        }}
      />
      <ProductDetailClient product={product} />
      <SectionReveal className="mt-16 grid gap-8 border-y border-[var(--line)] py-8 lg:grid-cols-2">
        <div>
          <p className="store-eyebrow">Complete the order</p>
          <h2 className="mt-2 font-display text-3xl font-black">Frequently bought together</h2>
          <div className="mt-4 grid gap-3">
            {together.map((item) => <div key={item.id} className="flex justify-between border-t border-[var(--line)] py-3 text-sm"><span>{item.name}</span><strong>{money(item.price)}</strong></div>)}
          </div>
        </div>
        <div>
          <p className="store-eyebrow">Verified feedback</p>
          <h2 className="mt-2 font-display text-3xl font-black">Customer reviews</h2>
          <ProductReviews productId={product.id} reviews={reviews.map((review) => ({ ...review, createdAt: review.createdAt.toISOString() }))} />
        </div>
      </SectionReveal>
      <SectionReveal className="mt-16">
        <div className="store-section-heading"><div><p className="store-eyebrow">Continue browsing</p><h2>Related products</h2></div></div>
        <div className="mt-7 grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-5 xl:grid-cols-5">
          {related.map((item, index) => <ProductCard key={item.id} product={toProductCardSummary(item)} index={index} desktopColumns={5} />)}
        </div>
      </SectionReveal>
    </div>
  );
}
