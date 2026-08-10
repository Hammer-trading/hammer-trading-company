import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingProducts() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <section className="store-catalog-hero border-b border-[var(--line)] bg-[var(--surface)]">
        <div className="mx-auto max-w-[92rem] px-4 py-10 sm:px-6 sm:py-12 lg:px-8 xl:px-10">
          <div className="mt-3 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <Skeleton className="h-4 w-48" />
              <h1 className="mt-3 h-16 max-w-4xl"><Skeleton className="h-full w-full" /></h1>
              <Skeleton className="mt-5 h-6 max-w-2xl" />
            </div>
          </div>
        </div>
      </section>

      <div className="store-catalog-layout mx-auto grid max-w-[92rem] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-8 xl:px-10">
        <aside className="hidden lg:block">
          <Skeleton className="h-96 w-full rounded-lg" />
        </aside>
        <div>
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--line)] pb-4">
            <div>
              <Skeleton className="h-4 w-40" />
              <Skeleton className="mt-2 h-10 w-32" />
            </div>
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-5 2xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="flex flex-col">
                <Skeleton className="aspect-square w-full rounded-lg" />
                <Skeleton className="mt-3 h-4 w-20" />
                <Skeleton className="mt-2 h-6 w-full" />
                <Skeleton className="mt-2 h-4 w-32" />
                <Skeleton className="mt-3 h-8 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
