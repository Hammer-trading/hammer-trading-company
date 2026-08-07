import Link from "next/link";
import type { CSSProperties } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  Headphones,
  MessageCircle,
  ScanLine,
  ShieldCheck,
  Truck,
  Wrench
} from "lucide-react";
import { Hero } from "@/components/hero";
import { FeaturedProductMarquee } from "@/components/storefront/featured-product-marquee";
import { ProductShelf } from "@/components/storefront/product-shelf";
import { RoomPackageShowcase } from "@/components/storefront/room-package-showcase";
import { ScrollShowcase } from "@/components/storefront/scroll-showcase";
import { SpatialHomeExperience } from "@/components/storefront/spatial-home-experience";
import { DynamicMedia } from "@/components/storefront/dynamic-media";
import { ResilientStoreImage } from "@/components/storefront/resilient-store-image";
import { SectionReveal, StaggerItem, StaggerReveal } from "@/components/section-reveal";
import { LinkButton } from "@/components/ui/button";
import { getHeroSlides } from "@/lib/storefront-banners";
import { getRoomPackages } from "@/lib/room-services";
import { getStorefrontCategories, getStorefrontProducts, toProductCardSummary } from "@/lib/storefront-products";
import {
  getHomepageSections,
  getPublishedPackages,
  getPublishedProjects,
  getPublishedServices,
  packageAvailableStock
} from "@/lib/platform-content";
import { money } from "@/lib/utils";

export const revalidate = 300;

const serviceLinks = [
  { Icon: Wrench, label: "Find the right tool", detail: "Search categories, brands and SKUs.", href: "/products" },
  { Icon: Truck, label: "Tracked delivery", detail: "Follow dispatch through handover.", href: "/track" },
  { Icon: ScanLine, label: "Verified handover", detail: "QR and OTP delivery confirmation.", href: "/shipping" },
  { Icon: MessageCircle, label: "Private support", detail: "Chat directly with the HTC team.", href: "/account/messages" },
  { Icon: Wrench, label: "Room installation", detail: "Hardware supplied and professionally fitted.", href: "/home-service" }
] as const;

export default async function HomePage() {
  const [products, categories, heroSlides, roomPackages, managedServices, managedPackages, managedProjects, managedSections] = await Promise.all([
    getStorefrontProducts(),
    getStorefrontCategories(),
    getHeroSlides(),
    getRoomPackages(),
    getPublishedServices({ homepage: true, take: 3 }),
    getPublishedPackages({ homepage: true, take: 3 }),
    getPublishedProjects({ homepage: true, take: 3 }),
    getHomepageSections()
  ]);

  const sectionByKey = new Map(managedSections.map((section) => [section.key, section]));
  const featuredProducts = products.filter((product) => product.isFeatured || product.isBestSeller);
  const bestSellers = products.filter((product) => product.isBestSeller);
  const dealProducts = products.filter((product) => product.compareAtPrice && product.compareAtPrice > product.price);
  const categoryNames = categories.length ? categories : Array.from(new Set(products.map((product) => product.category)));
  const categorySections = categoryNames
    .map((category) => {
      const categoryProducts = products.filter((product) => product.category === category);
      return {
        id: category,
        slug: category.toLowerCase().replaceAll(" ", "-"),
        name: category,
        count: categoryProducts.length,
        leadProduct: categoryProducts[0]
      };
    })
    .filter((section) => Boolean(section.leadProduct))
    .slice(0, 6);
  const heroProduct = featuredProducts[0] || products[0];
  const primaryShelf = (featuredProducts.length ? featuredProducts : products).slice(0, 8);
  const primaryIds = new Set(primaryShelf.map((product) => product.id));
  const secondaryCandidates = (bestSellers.length ? bestSellers : products).filter((product) => !primaryIds.has(product.id));
  const secondaryShelf = secondaryCandidates.slice(0, 8);
  const visibleProductIds = new Set([...primaryShelf, ...secondaryShelf].map((product) => product.id));
  const uniqueDeals = dealProducts.filter((product) => !visibleProductIds.has(product.id)).slice(0, 6);
  function homepageBlock(key: string, fallbackOrder: number) {
    const section = managedSections.find((entry) => entry.key === key);
    const visibility = !section
      ? ""
      : !section.isActive
        ? "hidden"
        : section.mobileVisible && section.desktopVisible
          ? ""
          : section.mobileVisible
            ? "md:hidden"
            : section.desktopVisible
              ? "hidden md:block"
              : "hidden";
    return { className: visibility, style: { order: section?.sortOrder ?? fallbackOrder } as CSSProperties };
  }

  return (
    <>
      <Hero
        slides={heroSlides}
        product={heroProduct ? {
          name: heroProduct.name,
          slug: heroProduct.slug,
          image: heroProduct.image,
          price: heroProduct.price,
          brand: heroProduct.brand,
          variantCount: heroProduct.variants.length
        } : undefined}
      />

      <SpatialHomeExperience
        products={[...primaryShelf, ...secondaryShelf].slice(0, 8).map(toProductCardSummary)}
        categories={categorySections.map((section) => ({
          id: section.id,
          name: section.name,
          count: section.count,
          image: section.leadProduct?.image || "/brand/workshop-hero.webp"
        }))}
        controls={{
          products: homepageBlock("featured-products", 10),
          categories: homepageBlock("categories", 30),
          workflow: homepageBlock("confidence", 100)
        }}
      />

      <div className="store-standard-home">

      <div {...homepageBlock("featured-products", 10)}><ProductShelf
        eyebrow="Selected by HTC"
        title="Featured hardware"
        description="Real stock, current pricing and variant-ready products selected from the live catalogue."
        href="/products?best=true"
        products={primaryShelf.map(toProductCardSummary)}
        className="!pt-7 sm:!pt-10"
      /></div>

      <div {...homepageBlock("service-rail", 20)}><section className="store-service-rail" aria-label="Store services">
        <div className="mx-auto grid max-w-[92rem] grid-cols-2 px-4 sm:px-6 md:grid-cols-3 lg:px-8 xl:grid-cols-5 xl:px-10">
          {serviceLinks.map(({ Icon, label, detail, href }) => (
            <Link key={label} href={href} className="store-service-link group">
              <span className="store-service-icon"><Icon size={19} aria-hidden="true" /></span>
              <span className="min-w-0">
                <strong>{label}</strong>
                <small>{detail}</small>
              </span>
            </Link>
          ))}
        </div>
      </section></div>

      {categorySections.length ? (
        <div {...homepageBlock("categories", 30)}><SectionReveal className="store-categories py-14 sm:py-18 lg:py-20">
          <div className="mx-auto max-w-[92rem] px-4 sm:px-6 lg:px-8 xl:px-10">
            <div className="store-section-heading">
              <div>
                <p className="store-eyebrow">Popular departments</p>
                <h2>Shop around the work</h2>
              </div>
              <div className="flex max-w-xl flex-col items-start gap-4 sm:items-end">
                <p>Start with a department, then choose the exact size, color, inch, price and stock.</p>
                <Link href="/categories" className="store-text-link">All departments <ArrowRight size={16} aria-hidden="true" /></Link>
              </div>
            </div>
            <StaggerReveal className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {categorySections.map((section) => {
                const leadProduct = section.leadProduct;
                if (!leadProduct) return null;
                return (
                  <StaggerItem key={section.id}>
                    <Link href={`/products?category=${encodeURIComponent(section.name)}`} className="store-category-tile group">
                      <span className="store-category-image">
                        <ResilientStoreImage
                          src={leadProduct.image}
                          alt=""
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.045]"
                          sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 16vw"
                        />
                      </span>
                      <strong>{section.name}</strong>
                      <small>{section.count} products</small>
                    </Link>
                  </StaggerItem>
                );
              })}
            </StaggerReveal>
          </div>
        </SectionReveal></div>
      ) : null}

      <div {...homepageBlock("featured-marquee", 40)}><FeaturedProductMarquee /></div>

      <div {...homepageBlock("popular-products", 50)}><ProductShelf
        eyebrow="Popular right now"
        title={bestSellers.length ? "Customer favourites" : "Fresh from the catalogue"}
        description="Frequently selected products with a direct route from configuration to checkout."
        href="/products"
        products={secondaryShelf.map(toProductCardSummary)}
        className="bg-white"
      /></div>

      <div {...homepageBlock("room-packages", 60)}><RoomPackageShowcase packages={roomPackages.filter((item) => item.isFeatured).length ? roomPackages.filter((item) => item.isFeatured) : roomPackages} /></div>

      {managedServices.length || managedPackages.length || managedProjects.length ? (
        <div {...homepageBlock("complete-solutions", 70)}><SectionReveal className="store-solutions py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-[92rem] px-4 sm:px-6 lg:px-8 xl:px-10">
            <div className="store-section-heading">
              <div>
                <p className="store-eyebrow">Complete solutions</p>
                <h2>{sectionByKey.get("complete-solutions")?.heading || "Supply, install, complete"}</h2>
              </div>
              <p>{sectionByKey.get("complete-solutions")?.description || "Choose a managed service, a stock-backed room package, or inspect real HTC field work before you decide."}</p>
            </div>
            <StaggerReveal className="mt-9 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {managedServices.map((service) => (
                <StaggerItem key={`service-${service.id}`}>
                  <Link href={`/services/${service.slug}`} className="store-editorial-card group">
                    <span className="store-editorial-media"><DynamicMedia src={service.coverImage} alt={service.imageAlt || service.name} className="transition-transform duration-500 group-hover:scale-[1.04]" /></span>
                    <span className="store-editorial-copy">
                      <small>Professional service</small>
                      <strong>{service.name}</strong>
                      <span>{service.fixedPrice ? money(Number(service.fixedPrice)) : service.startingPrice ? `From ${money(Number(service.startingPrice))}` : "Request quote"}</span>
                    </span>
                  </Link>
                </StaggerItem>
              ))}
              {managedPackages.map((bundle) => (
                <StaggerItem key={`package-${bundle.id}`}>
                  <Link href={`/packages/${bundle.slug}`} className="store-editorial-card group">
                    <span className="store-editorial-media"><DynamicMedia src={bundle.coverImage} alt={bundle.imageAlt || bundle.name} className="transition-transform duration-500 group-hover:scale-[1.04]" /></span>
                    <span className="store-editorial-copy">
                      <small>{packageAvailableStock(bundle.items)} packages available</small>
                      <strong>{bundle.name}</strong>
                      <span>{money(Number(bundle.finalPrice))}</span>
                    </span>
                  </Link>
                </StaggerItem>
              ))}
              {managedProjects.map((project) => (
                <StaggerItem key={`project-${project.id}`}>
                  <Link href={`/projects/${project.slug}`} className="store-editorial-card group">
                    <span className="store-editorial-media"><DynamicMedia src={project.coverImage || project.media[0]?.url} alt={project.imageAlt || project.title} className="transition-transform duration-500 group-hover:scale-[1.04]" /></span>
                    <span className="store-editorial-copy">
                      <small>{project.projectStatus.replaceAll("_", " ")}</small>
                      <strong>{project.title}</strong>
                      <span>{project.location || "HTC field project"}</span>
                    </span>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerReveal>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href="/services" variant="outline">All services</LinkButton>
              <LinkButton href="/packages" variant="outline">All packages</LinkButton>
              <LinkButton href="/projects" variant="outline">All projects</LinkButton>
            </div>
          </div>
        </SectionReveal></div>
      ) : null}

      <div {...homepageBlock("product-showcase", 80)}><ScrollShowcase product={heroProduct ? { name: heroProduct.name, slug: heroProduct.slug, sku: heroProduct.sku, price: heroProduct.price, stock: heroProduct.stock } : undefined} /></div>

      {uniqueDeals.length ? (
        <div {...homepageBlock("deals", 90)}><ProductShelf
          eyebrow="Limited pricing"
          title="Current reductions"
          description="Active catalogue discounts only. Original and current prices remain connected to the live product record."
          href="/products?discount=true"
          products={uniqueDeals.map(toProductCardSummary)}
          className="bg-white"
        /></div>
      ) : null}

      <div {...homepageBlock("confidence", 100)}><SectionReveal className="store-confidence py-16 sm:py-20">
        <div className="mx-auto max-w-[92rem] px-4 sm:px-6 lg:px-8 xl:px-10">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="store-eyebrow">Built to keep moving</p>
              <h2 className="mt-3 max-w-xl font-display text-4xl font-black leading-[0.92] sm:text-5xl">From quotation to verified handover.</h2>
              <div className="mt-7 flex flex-wrap gap-3">
                <LinkButton href="/wholesale" variant="accent">Get a wholesale quote</LinkButton>
                <LinkButton href="/track" variant="outline">Track delivery</LinkButton>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-7">
              {[
                [BadgeCheck, "Variant ready", "Size, color and inch options retain their own stock."],
                [Clock3, "Clear checkout", "Delivery and payment details appear before placement."],
                [Truck, "Trackable orders", "Follow dispatch through verified delivery."],
                [Headphones, "Private support", "Message the HTC team from your account."]
              ].map(([Icon, title, body]) => {
                const FeatureIcon = Icon as typeof ShieldCheck;
                return (
                  <div key={title as string} className="store-confidence-item">
                    <FeatureIcon size={20} aria-hidden="true" />
                    <strong>{title as string}</strong>
                    <p>{body as string}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </SectionReveal></div>
      </div>
    </>
  );
}
