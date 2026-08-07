import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ProductCardSummary } from "@/lib/catalog";
import { ProductCard } from "@/components/product-card";
import { SectionReveal, StaggerItem, StaggerReveal } from "@/components/section-reveal";

type ProductShelfProps = {
  eyebrow: string;
  title: string;
  description?: string;
  href: string;
  products: ProductCardSummary[];
  className?: string;
};

export function ProductShelf({ eyebrow, title, description, href, products, className = "" }: ProductShelfProps) {
  if (!products.length) return null;

  return (
    <SectionReveal className={`store-shelf ${className}`}>
      <div className="mx-auto max-w-[92rem] px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="store-section-heading">
          <div>
            <p className="store-eyebrow">{eyebrow}</p>
            <h2>{title}</h2>
          </div>
          <div className="flex max-w-2xl flex-col items-start gap-4 sm:items-end">
            {description ? <p className="hidden sm:block">{description}</p> : null}
            <Link href={href} className="store-text-link">
              View all <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
        <StaggerReveal slow className="mt-5 grid grid-cols-2 gap-x-3 gap-y-8 sm:mt-7 md:grid-cols-3 md:gap-x-5 xl:grid-cols-5">
          {products.slice(0, 10).map((product, index) => (
            <StaggerItem key={product.id} from="top" slow>
              <ProductCard product={product} index={index} desktopColumns={5} />
            </StaggerItem>
          ))}
        </StaggerReveal>
      </div>
    </SectionReveal>
  );
}
