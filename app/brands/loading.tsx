import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingBrands() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Skeleton className="h-10 w-48" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="rounded-lg border border-slate-200 bg-white p-6">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="mt-2 h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
