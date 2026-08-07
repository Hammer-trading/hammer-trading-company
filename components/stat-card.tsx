import type { LucideIcon } from "lucide-react";

export function StatCard({ icon: Icon, label, value, hint }: { icon: LucideIcon; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-500">{label}</p>
        <Icon className="text-safety" size={22} />
      </div>
      <strong className="mt-4 block text-3xl">{value}</strong>
      <p className="mt-2 text-sm text-slate-500">{hint}</p>
    </div>
  );
}
