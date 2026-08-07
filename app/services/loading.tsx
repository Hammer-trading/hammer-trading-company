export default function LoadingServices() { return <div className="mx-auto max-w-[90rem] animate-pulse px-4 pb-16 pt-32 sm:px-6 lg:px-10"><div className="h-16 max-w-2xl rounded-lg bg-slate-200"/><div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-96 rounded-lg bg-slate-100"/>)}</div></div>; }

