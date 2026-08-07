"use client";

import dynamic from "next/dynamic";

const LazyAdminMessages = dynamic(
  () => import("@/components/admin-messages-client").then((module) => module.AdminMessagesClient),
  {
    ssr: false,
    loading: () => <div className="admin-surface h-[70vh] animate-pulse bg-slate-100 dark:bg-slate-900" aria-label="Loading messages" />
  }
);

export function AdminMessagesLazy({ initialConversationId }: { initialConversationId?: string }) {
  return <LazyAdminMessages initialConversationId={initialConversationId} />;
}
