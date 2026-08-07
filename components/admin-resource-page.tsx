import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";

export function AdminResourcePage({
  title,
  description,
  stats,
  children
}: {
  title: string;
  description: string;
  stats?: Array<{ label: string; value: string | number; hint?: string }>;
  children?: ReactNode;
}) {
  return (
    <section className="space-y-5">
      <div className="admin-page-hero overflow-hidden p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-red-600 dark:text-red-400">Management workspace</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight md:text-3xl">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{description}</p>
          </div>
          <div className="hidden min-w-44 border-l border-slate-200 px-5 py-1 text-sm dark:border-white/[0.08] md:block">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Status</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <strong>Live admin</strong>
              <span className="grid size-8 place-items-center rounded-md bg-red-600 text-white"><ArrowUpRight size={16} /></span>
            </div>
          </div>
        </div>
      </div>
      {stats?.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="admin-surface admin-card-3d p-5">
              <p className="text-sm font-semibold text-slate-500">{stat.label}</p>
              <strong className="mt-3 block text-2xl">{stat.value}</strong>
              {stat.hint ? <p className="mt-2 text-sm text-slate-500">{stat.hint}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function AdminEmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="admin-empty-state rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
      <h3 className="font-bold text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-2 text-sm">{body}</p>
    </div>
  );
}
