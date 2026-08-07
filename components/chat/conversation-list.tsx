"use client";

import { Archive, Clock3, Mail, Phone, Pin, Search, UserRound } from "lucide-react";
import type { ChatConversation } from "@/components/chat/types";

export function ConversationList({
  items,
  selectedId,
  loading,
  query,
  onQueryChange,
  onSelect
}: {
  items: ChatConversation[];
  selectedId?: string | null;
  loading?: boolean;
  query?: string;
  onQueryChange?: (value: string) => void;
  onSelect: (conversation: ChatConversation) => void;
}) {
  return (
    <aside className="flex min-h-0 flex-col border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/55 lg:border-b-0 lg:border-r">
      {onQueryChange ? (
        <div className="p-3">
          <label className="flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <Search size={17} className="text-slate-500" />
            <input
              value={query || ""}
              onChange={(event) => onQueryChange(event.target.value)}
              className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none"
              placeholder="Search name, ID, email, phone, message..."
            />
          </label>
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto p-2" data-lenis-prevent>
        {loading ? (
          <div className="m-3 h-24 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        ) : items.length ? items.map((item) => {
          const active = item.id === selectedId;
          const unread = item.adminUnreadCount || 0;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item)}
              className={`mb-2 w-full rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:border-red-200 hover:bg-white dark:hover:bg-slate-950 ${active ? "border-red-300 bg-white shadow-sm dark:border-red-900 dark:bg-slate-950" : "border-transparent bg-white/70 dark:bg-slate-950/70"}`}
            >
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-950 text-white dark:bg-red-700">
                  <UserRound size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <strong className="line-clamp-1 text-sm">{item.customer?.name || "Customer"}</strong>
                    <span className="flex shrink-0 items-center gap-1">
                      {item.isPinned ? <Pin size={12} className="text-red-700" aria-label="Pinned" /> : null}
                      {item.isArchived ? <Archive size={12} className="text-slate-500" aria-label="Archived" /> : null}
                      {unread ? <span className="grid min-w-6 place-items-center rounded-full bg-red-700 px-1.5 py-0.5 text-xs font-black text-white">{unread}</span> : null}
                    </span>
                  </span>
                  <span className="mt-1 block break-all font-mono text-[11px] font-bold text-slate-500">{item.customer?.customerPublicId || item.customerId}</span>
                  <span className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold text-slate-500">
                    {item.customer?.phone ? <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-900"><Phone size={11} /> {item.customer.phone}</span> : null}
                    {item.customer?.email ? <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-900"><Mail size={11} /> {item.customer.email}</span> : null}
                  </span>
                  <span className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600 dark:text-slate-400">{item.lastMessage || "No messages yet"}</span>
                  <span className="mt-2 flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-400"><span className="inline-flex items-center gap-1"><Clock3 size={12} /> {item.lastMessageAt ? new Date(item.lastMessageAt).toLocaleString() : "New conversation"}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 font-black text-slate-600 dark:bg-slate-900 dark:text-slate-300">{item.status}</span></span>
                </span>
              </div>
            </button>
          );
        }) : (
          <div className="m-3 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950">
            No conversations yet.
          </div>
        )}
      </div>
    </aside>
  );
}
