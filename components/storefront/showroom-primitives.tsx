import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ShowroomPanelProps = { children: ReactNode; className?: string; tone?: "light" | "dark" };

export function ShowroomPanel({ children, className, tone = "light" }: ShowroomPanelProps) {
  return <section className={cn("showroom-panel", tone === "dark" && "showroom-panel-dark", className)}>{children}</section>;
}

export function SectionNumber({ children }: { children: ReactNode }) {
  return <span className="showroom-section-number">{children}</span>;
}

export function ShowroomSectionHeader({ number, eyebrow, title, body, action }: { number?: string; eyebrow?: string; title: ReactNode; body?: ReactNode; action?: ReactNode }) {
  return <div className="showroom-section-header">
    <div className="min-w-0">
      <div className="flex items-center gap-3">{number ? <SectionNumber>{number}</SectionNumber> : null}{eyebrow ? <p className="showroom-eyebrow">{eyebrow}</p> : null}</div>
      <h2 className="showroom-section-title mt-4">{title}</h2>
      {body ? <p className="showroom-section-body mt-4">{body}</p> : null}
    </div>
    {action ? <div className="shrink-0">{action}</div> : null}
  </div>;
}

export function StatusPill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "brand" }) {
  return <span className={cn("status-pill", `status-pill-${tone}`)}>{children}</span>;
}

export function ProductMeta({ brand, category, sku }: { brand: string; category?: string; sku?: string }) {
  return <div className="product-meta"><span>{brand}</span>{category ? <span>{category}</span> : null}{sku ? <code>{sku}</code> : null}</div>;
}
