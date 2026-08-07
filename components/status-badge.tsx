import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
  CONFIRMED: "bg-blue-50 text-blue-700 ring-blue-200",
  PROCESSING: "bg-cyan-50 text-cyan-700 ring-cyan-200",
  PACKED: "bg-violet-50 text-violet-700 ring-violet-200",
  READY_FOR_DISPATCH: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200",
  SHIPPED: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  OUT_FOR_DELIVERY: "bg-orange-50 text-orange-700 ring-orange-200",
  DELIVERED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  CANCELLED: "bg-red-50 text-red-700 ring-red-200",
  RETURNED: "bg-slate-100 text-slate-700 ring-slate-200",
  REFUNDED: "bg-teal-50 text-teal-700 ring-teal-200",
  DELIVERY_FAILED: "bg-red-50 text-red-700 ring-red-200",
  DISPUTED: "bg-rose-50 text-rose-700 ring-rose-200"
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1", styles[status] || styles.RETURNED, className)}>
      {status.replaceAll("_", " ")}
    </span>
  );
}
