"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Box, Boxes, Layers3, ScanLine, Truck, Wrench } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { ProductCard } from "@/components/product-card";
import { ResilientStoreImage } from "@/components/storefront/resilient-store-image";
import { useSpatialStorefront, type SpatialStorefrontTheme } from "@/components/storefront/use-spatial-storefront";
import type { ProductCardSummary } from "@/lib/catalog";

type SpatialCategory = { id: string; name: string; count: number; image: string };
type SectionControl = { className?: string; style?: CSSProperties };
type Props = {
  products: ProductCardSummary[];
  categories: SpatialCategory[];
  controls?: { categories?: SectionControl; products?: SectionControl; workflow?: SectionControl };
};

function ControlledSection({ control, className, children }: { control?: SectionControl; className: string; children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.section
      className={`${className} ${control?.className || ""}`}
      style={control?.style}
      initial={reduceMotion ? false : { opacity: 0, y: 32 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.14 }}
      transition={{ duration: reduceMotion ? 0 : 0.52, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.section>
  );
}

function FoundryCinema({ products, categories, controls }: Props) {
  const stock = products.reduce((total, product) => total + Math.max(product.stock, 0), 0);
  const variants = products.reduce((total, product) => total + product.variantCount, 0);
  return (
    <main className="store-spatial-home interface-foundry">
      <ControlledSection control={controls?.categories} className="foundry-index">
        <div className="foundry-index-copy"><p>01 / Live floor</p><h2>Hardware built around real work.</h2><Link href="/products">Enter catalogue <ArrowUpRight size={18}/></Link></div>
        <div className="foundry-readout"><span><strong>{products.length}</strong>Products</span><span><strong>{variants}</strong>Variants</span><span><strong>{stock}</strong>Units</span></div>
        <div className="foundry-departments">{categories.slice(0, 5).map((category, index) => <Link key={category.id} href={`/products?category=${encodeURIComponent(category.name)}`} style={{ "--index": index } as CSSProperties}><span><ResilientStoreImage src={category.image} alt="" sizes="150px"/></span><strong>{category.name}</strong><small>{category.count} products</small></Link>)}</div>
      </ControlledSection>
      <ControlledSection control={controls?.products} className="foundry-product-field">
        <header><div><p>02 / Equipment</p><h2>Exact fit. Live stock.</h2></div><Link href="/products">View all <ArrowRight size={17}/></Link></header>
        <div className="foundry-product-grid">{products.slice(0, 7).map((product, index) => <div className={`foundry-slot foundry-slot-${index + 1}`} key={product.id}><ProductCard product={product} index={index} desktopColumns={3}/></div>)}</div>
      </ControlledSection>
      <ControlledSection control={controls?.workflow} className="foundry-workflow"><WorkflowLinks/><footer><Box/><span>Wholesale quantities and project supply use the same live catalogue.</span><Link href="/wholesale">Request quote</Link></footer></ControlledSection>
    </main>
  );
}

function AxonometricWorkshop({ products, categories, controls }: Props) {
  return (
    <main className="store-spatial-home interface-axonometric">
      <ControlledSection control={controls?.categories} className="axon-workbench">
        <header><span>Workshop index / 01</span><h2>Choose a department. Build the order.</h2></header>
        <div className="axon-board">
          <nav>{categories.slice(0, 6).map((category, index) => <Link key={category.id} href={`/products?category=${encodeURIComponent(category.name)}`}><b>{String(index + 1).padStart(2, "0")}</b><span>{category.name}<small>{category.count} live products</small></span><ArrowUpRight/></Link>)}</nav>
          <div className="axon-board-visual">{categories.slice(0, 4).map((category, index) => <Link key={category.id} href={`/products?category=${encodeURIComponent(category.name)}`} className={`axon-cube axon-cube-${index + 1}`}><ResilientStoreImage src={category.image} alt="" sizes="260px"/><strong>{category.name}</strong></Link>)}</div>
        </div>
      </ControlledSection>
      <ControlledSection control={controls?.products} className="axon-catalogue">
        <header><div><span>Live inventory / 02</span><h2>Product matrix</h2></div><p>Compare stock, options and current prices without leaving the workbench.</p></header>
        <div className="axon-product-matrix">{products.slice(0, 8).map((product, index) => <ProductCard key={product.id} product={product} index={index} desktopColumns={4}/>)}</div>
      </ControlledSection>
      <ControlledSection control={controls?.workflow} className="axon-process"><header><Boxes/><span>Configure to handover</span></header><WorkflowLinks/></ControlledSection>
    </main>
  );
}

function PrismGallery({ products, categories, controls }: Props) {
  return (
    <main className="store-spatial-home interface-prism">
      <ControlledSection control={controls?.categories} className="prism-opening">
        <p>HTC curated hardware / 01</p><h2>Objects for spaces that work beautifully.</h2>
        <div className="prism-category-ribbon">{categories.slice(0, 5).map((category) => <Link key={category.id} href={`/products?category=${encodeURIComponent(category.name)}`}><span><ResilientStoreImage src={category.image} alt="" sizes="220px"/></span><strong>{category.name}</strong><small>{category.count} pieces</small></Link>)}</div>
      </ControlledSection>
      <ControlledSection control={controls?.products} className="prism-runway">
        <header><p>Selected collection / 02</p><h2>Made to be chosen closely.</h2></header>
        <div>{products.slice(0, 6).map((product, index) => <article className={index % 2 ? "prism-row is-reversed" : "prism-row"} key={product.id}><span className="prism-row-number">0{index + 1}</span><ProductCard product={product} index={index} desktopColumns={2}/><div className="prism-row-copy"><small>{product.category}</small><strong>{product.name}</strong><p>{product.variantCount > 1 ? `${product.variantCount} exact configurations available.` : "Ready from live HTC stock."}</p><Link href={`/products/${product.slug}`}>View product <ArrowUpRight/></Link></div></article>)}</div>
      </ControlledSection>
      <ControlledSection control={controls?.workflow} className="prism-service-line"><header><p>Complete support / 03</p><h2>One calm route from selection to installation.</h2></header><WorkflowLinks/></ControlledSection>
    </main>
  );
}

function WorkflowLinks() {
  return <div className="interface-workflow-links"><Link href="/products"><Layers3/><span><small>Configure</small><strong>Exact sizes and colors</strong></span><ArrowUpRight/></Link><Link href="/home-service"><Wrench/><span><small>Install</small><strong>Room hardware service</strong></span><ArrowUpRight/></Link><Link href="/track"><Truck/><span><small>Track</small><strong>Delivery progress</strong></span><ArrowUpRight/></Link><Link href="/shipping"><ScanLine/><span><small>Verify</small><strong>QR and OTP handover</strong></span><ArrowUpRight/></Link></div>;
}

function CrucibleMeridian({ products, categories, controls }: Props) {
  return (
    <main className="store-spatial-home interface-crucible">
      <ControlledSection control={controls?.categories} className="crucible-atrium">
        <header><span>Curated hardware / 01</span><h2>Architectural staging for working spaces.</h2></header>
        <div className="crucible-depth-planes">
          {categories.slice(0, 4).map((category, index) => (
            <Link key={category.id} href={`/products?category=${encodeURIComponent(category.name)}`} className={`crucible-plane crucible-plane-${index + 1}`}>
              <ResilientStoreImage src={category.image} alt="" sizes="(max-width: 768px) 50vw, 25vw" />
              <div className="crucible-plane-label"><strong>{category.name}</strong><small>{category.count} products</small></div>
            </Link>
          ))}
        </div>
      </ControlledSection>
      <ControlledSection control={controls?.products} className="crucible-collection">
        <header><span>Selected pieces / 02</span><h2>Material honesty meets functional precision.</h2></header>
        <div className="crucible-product-stagger">{products.slice(0, 6).map((product, index) => <ProductCard key={product.id} product={product} index={index} desktopColumns={3} />)}</div>
      </ControlledSection>
      <ControlledSection control={controls?.workflow} className="crucible-services"><header><span>Complete workflow / 03</span><h2>From specification to installation support.</h2></header><WorkflowLinks/></ControlledSection>
    </main>
  );
}

export function SpatialHomeExperience(props: Props) {
  const theme: SpatialStorefrontTheme | null = useSpatialStorefront();
  if (theme === "foundry3d") return <FoundryCinema {...props}/>;
  if (theme === "axonometric") return <AxonometricWorkshop {...props}/>;
  if (theme === "prism3d") return <PrismGallery {...props}/>;
  if (theme === "crucible") return <CrucibleMeridian {...props}/>;
  return null;
}
