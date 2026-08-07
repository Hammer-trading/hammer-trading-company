export function PremiumBackground() {
  return (
    <div className="store-atmosphere pointer-events-none absolute inset-x-0 top-0 z-0 h-[860px] overflow-hidden contain-paint" aria-hidden="true">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.62),transparent_76%)] opacity-70 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.025),transparent_76%)]" />
      <div className="store-atmosphere-grid absolute inset-0 opacity-[0.025] [background-image:linear-gradient(#111827_1px,transparent_1px),linear-gradient(90deg,#111827_1px,transparent_1px)] [background-size:56px_56px] dark:opacity-[0.05]" />
      <div className="store-atmosphere-scan absolute inset-0 opacity-0 dark:opacity-100" />
    </div>
  );
}
