import { ArrowUpRight, Box, ScanLine, Truck } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { money } from "@/lib/utils";

const stages = [
  {
    Icon: Box,
    label: "01 / Select",
    title: "Start with the exact tool.",
    body: "Search by department, brand, application, or SKU."
  },
  {
    Icon: ScanLine,
    label: "02 / Configure",
    title: "Choose the exact build.",
    body: "Size, color, inch, price, and stock stay tied to each variant."
  },
  {
    Icon: Truck,
    label: "03 / Deliver",
    title: "Track every handover.",
    body: "Clear order status with QR and OTP delivery verification."
  }
] as const;

type ShowcaseProduct = {
  name: string;
  slug: string;
  sku: string;
  price: number;
  stock: number;
};

export function ScrollShowcase({ product }: { product?: ShowcaseProduct }) {
  return (
    <section className="luminous-dark overflow-hidden py-16 text-white sm:py-20 lg:py-24">
      <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-10">
        <div className="grid items-end gap-7 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="precision-kicker">The continuous HTC workflow</p>
            <h2 className="mt-4 max-w-3xl font-display text-4xl font-black leading-[0.92] sm:text-6xl">
              From the right product to a verified delivery.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-400">
              A faster shopping flow that keeps product configuration, stock, order status, and handover connected.
            </p>
          </div>
          <LinkButton
            href={product ? `/products/${product.slug}` : "/products"}
            variant="ghost"
            className="gap-2 rounded-md border-0 bg-white/10 text-white ring-0 hover:bg-white/15 hover:ring-0"
          >
            {product ? "Inspect featured product" : "Explore products"} <ArrowUpRight size={16} />
          </LinkButton>
        </div>

        <div className="workflow-loop-viewport group mt-12" role="region" aria-label="HTC shopping workflow">
          <div className="workflow-loop flex w-max items-stretch group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex shrink-0 gap-4 pr-4" aria-hidden={copy === 1 ? true : undefined}>
                {stages.map(({ Icon, label, title, body }) => (
                  <article
                    key={`${copy}-${label}`}
                    className="relative flex min-h-64 w-[19rem] shrink-0 flex-col overflow-hidden rounded-lg bg-white/[0.055] p-6 ring-1 ring-white/10 transition duration-300 hover:-translate-y-1 hover:bg-white/[0.08] sm:w-[23rem] lg:w-[26rem]"
                  >
                    <div className="absolute inset-x-0 top-0 h-1 origin-left scale-x-[0.18] bg-red-600 transition duration-300 group-hover:scale-x-100" />
                    <div className="flex items-start justify-between gap-5">
                      <span className="grid size-11 place-items-center rounded-md bg-red-600/15 text-red-300 ring-1 ring-red-400/15">
                        <Icon size={21} />
                      </span>
                      <span className="font-mono text-[10px] font-black uppercase tracking-[0.12em] text-[#83b8ba]">{label}</span>
                    </div>
                    <h3 className="mt-9 max-w-xs text-2xl font-black leading-tight text-white">{title}</h3>
                    <p className="mt-3 max-w-xs text-sm leading-6 text-slate-400">{body}</p>
                    <div className="mt-auto flex items-center gap-3 pt-7">
                      <span className="h-px flex-1 bg-white/10" />
                      <ArrowUpRight size={15} className="text-red-300" />
                    </div>
                  </article>
                ))}

                {product ? (
                  <article className="relative flex min-h-64 w-[19rem] shrink-0 flex-col overflow-hidden rounded-lg bg-red-700 p-6 sm:w-[23rem] lg:w-[26rem]">
                    <p className="font-mono text-[10px] font-black uppercase tracking-[0.12em] text-red-100">Featured configuration / {product.sku}</p>
                    <h3 className="mt-8 max-w-sm font-display text-3xl font-black leading-[0.92]">{product.name}</h3>
                    <div className="mt-auto flex items-end justify-between gap-5 pt-8">
                      <div>
                        <strong className="block font-mono text-xl">{money(product.price)}</strong>
                        <span className="mt-1 block text-xs font-bold text-red-100">{product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}</span>
                      </div>
                      <ArrowUpRight size={22} />
                    </div>
                  </article>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-7 flex items-center justify-between gap-5 border-t border-white/10 pt-5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
          <span>Continuous product workflow</span>
          <span className="hidden sm:inline">Hover to pause / reduced motion supported</span>
        </div>
      </div>
    </section>
  );
}
