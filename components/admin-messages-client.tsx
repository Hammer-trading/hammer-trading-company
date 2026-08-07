"use client";

import { Archive, ArchiveRestore, Ban, CheckCircle2, Clock3, Filter, MessageSquare, Pin, PinOff, RefreshCw, Save, ShieldCheck, ShoppingBag, Sparkles, UserRound } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatWindow } from "@/components/chat/chat-window";
import { ConversationList } from "@/components/chat/conversation-list";
import type { ChatConversation, ChatCustomerProfile, ChatMessageAction, ChatMessageDraft, ConversationStatus } from "@/components/chat/types";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/utils";

type InboxFilter = "all" | "unread" | "replied" | "not-replied" | "pinned" | "archived";
type InboxSort = "latest" | "oldest";

const quickReplies = [
  "Thanks for reaching out. Please share your order number so we can check it quickly.",
  "Your message has been received. Our team will verify the details and reply shortly.",
  "Please share a clear photo or SKU if this is about a product variant, size, or color.",
  "We can help with delivery tracking. Please confirm your city and phone number."
];

const filters: Array<{ value: InboxFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "replied", label: "Replied" },
  { value: "not-replied", label: "Needs reply" },
  { value: "pinned", label: "Pinned" },
  { value: "archived", label: "Archived" }
];

const conversationStatuses: ConversationStatus[] = ["NEW", "OPEN", "PENDING", "RESOLVED", "CLOSED"];

export function AdminMessagesClient({ initialConversationId }: { initialConversationId?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [items, setItems] = useState<ChatConversation[]>([]);
  const [selected, setSelected] = useState<ChatConversation | null>(null);
  const [profile, setProfile] = useState<ChatCustomerProfile | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [sort, setSort] = useState<InboxSort>("latest");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sending, setSending] = useState(false);
  const [savingConversation, setSavingConversation] = useState(false);
  const [internalNotes, setInternalNotes] = useState("");
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);
  const listRequestRef = useRef(0);
  const chatRequestRef = useRef(0);
  const chatAbortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(false);
  const selectedIdRef = useRef<string | null>(null);
  const sendRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      listRequestRef.current += 1;
      chatRequestRef.current += 1;
      chatAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    selectedIdRef.current = selected?.id || null;
  }, [selected?.id]);

  const totalUnread = useMemo(() => items.reduce((sum, item) => sum + Number(item.adminUnreadCount || 0), 0), [items]);

  const loadList = useCallback(async (showSpinner = true) => {
    const requestId = ++listRequestRef.current;
    if (showSpinner) setLoadingList(true);
    try {
      const params = new URLSearchParams({ filter, sort, pageSize: "50" });
      if (query.trim()) params.set("q", query.trim());
      const response = await fetch(`/api/admin/messages?${params}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load conversations");
      if (requestId !== listRequestRef.current) return;
      const rows = Array.isArray(data.items) ? data.items : [];
      setItems(rows);
      setTotal(Number(data.total || rows.length));
      setSelected((current) => {
        if (!current) return current;
        const fresh = rows.find((item: ChatConversation) => item.id === current.id);
        return fresh ? { ...fresh, messages: current.messages || fresh.messages } : current;
      });
    } catch (err) {
      if (requestId === listRequestRef.current) setError(err instanceof Error ? err.message : "Unable to load conversations");
    } finally {
      if (showSpinner && requestId === listRequestRef.current) setLoadingList(false);
    }
  }, [filter, query, sort]);

  const openConversation = useCallback(async (conversation: ChatConversation, options: { spinner?: boolean; navigate?: boolean } = {}) => {
    const requestId = ++chatRequestRef.current;
    chatAbortRef.current?.abort();
    const controller = new AbortController();
    chatAbortRef.current = controller;
    if (options.spinner !== false) setLoadingChat(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/messages/${conversation.id}`, { cache: "no-store", signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to open conversation");
      if (requestId !== chatRequestRef.current || !mountedRef.current) return;
      setSelected(data.conversation);
      setInternalNotes(data.conversation?.internalNotes || "");
      setProfile(data.profile || null);
      setItems((current) => current.map((item) => item.id === conversation.id ? { ...item, adminUnreadCount: 0 } : item));
      if (
        options.navigate !== false &&
        !pathname.endsWith(conversation.id) &&
        window.location.pathname.startsWith("/admin/messages")
      ) {
        router.push(`/admin/messages/${conversation.id}`);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (requestId === chatRequestRef.current && mountedRef.current) setError(err instanceof Error ? err.message : "Unable to open conversation");
    } finally {
      if (requestId === chatRequestRef.current && mountedRef.current) setLoadingChat(false);
    }
  }, [pathname, router]);

  useEffect(() => {
    void loadList(true);
  }, [loadList]);

  useEffect(() => {
    const timer = window.setInterval(() => void loadList(false), 8000);
    return () => window.clearInterval(timer);
  }, [loadList]);

  useEffect(() => {
    if (!selected) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) void openConversation(selected, { spinner: false, navigate: false });
    }, 8000);
    return () => window.clearInterval(timer);
  }, [openConversation, selected]);

  useEffect(() => {
    if (!items.length || loadingChat) return;
    if (initialConversationId) {
      const found = items.find((item) => item.id === initialConversationId);
      if (found && selected?.id !== found.id) void openConversation(found);
      return;
    }
    if (!selected) void openConversation(items[0]);
  }, [initialConversationId, items, loadingChat, openConversation, selected]);

  async function send(draft: ChatMessageDraft) {
    if (!selected || sendRef.current) return;
    const conversationId = selected.id;
    sendRef.current = true;
    setSending(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/messages/${conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Reply failed");
      if (selectedIdRef.current === conversationId) {
        setSelected(data.conversation);
        setProfile(data.profile || profile);
      }
      await loadList(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Reply failed";
      setError(message);
      throw err;
    } finally {
      sendRef.current = false;
      setSending(false);
    }
  }

  async function updateConversation(changes: Partial<Pick<ChatConversation, "status" | "isPinned" | "isArchived" | "isBlocked" | "internalNotes">>) {
    if (!selected) return;
    setSavingConversation(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/messages/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Conversation update failed");
      setSelected(data.conversation);
      setProfile(data.profile || profile);
      setInternalNotes(data.conversation?.internalNotes || "");
      await loadList(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversation update failed");
    } finally {
      setSavingConversation(false);
    }
  }

  async function updateMessage(messageId: string, action: ChatMessageAction) {
    if (!selected) return;
    const conversationId = selected.id;
    setError("");
    try {
      const response = await fetch(`/api/admin/messages/${conversationId}/messages/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Message update failed");
      if (selectedIdRef.current === conversationId) {
        setSelected(data.conversation);
        setProfile(data.profile || profile);
      }
      await loadList(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Message update failed");
      throw err;
    }
  }

  return (
    <div className="space-y-4">
      <div className="admin-hero overflow-hidden p-5 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-red-100">
              <MessageSquare size={14} /> Customer support inbox
            </p>
            <h1 className="mt-3 text-2xl font-black sm:text-3xl">Customer Messages</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">
              Every customer has one private thread. Conversations refresh quietly every few seconds and are sorted by the latest message.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
              <p className="text-xs font-bold uppercase text-slate-300">Unread</p>
              <strong className="text-2xl">{totalUnread}</strong>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
              <p className="text-xs font-bold uppercase text-slate-300">Threads</p>
              <strong className="text-2xl">{total}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/88 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/88">
        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-black transition ${filter === item.value ? "bg-slate-950 text-white shadow-lg shadow-slate-950/10 dark:bg-red-700" : "border border-slate-200 bg-white text-slate-700 hover:border-red-200 hover:text-red-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"}`}
            >
              <Filter size={15} /> {item.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select value={sort} onChange={(event) => setSort(event.target.value as InboxSort)} className="premium-field h-10 rounded-xl px-3 text-sm font-bold">
            <option value="latest">Latest first</option>
            <option value="oldest">Oldest first</option>
          </select>
          <Button type="button" variant="outline" onClick={() => void loadList(true)} className="gap-2">
            <RefreshCw size={17} /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid min-h-[74vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950 lg:grid-cols-[360px_minmax(0,1fr)_310px]">
        <ConversationList
          items={items}
          selectedId={selected?.id}
          loading={loadingList}
          query={query}
          onQueryChange={setQuery}
          onSelect={(conversation) => void openConversation(conversation)}
        />
        <ChatWindow conversation={selected} perspective="ADMIN" loading={loadingChat} sending={sending} error={error} onRetry={() => selected ? void openConversation(selected) : void loadList(true)} onSend={send} onMessageAction={updateMessage} />
        <aside className="border-t border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/45 lg:border-l lg:border-t-0">
          <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-500">
            <UserRound size={16} /> Customer profile
          </h2>
          {selected ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <h3 className="font-black">{selected.customer?.name || "Customer"}</h3>
                <p className="mt-1 break-all font-mono text-xs font-bold text-slate-500">{selected.customer?.customerPublicId || selected.customerId}</p>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{selected.customer?.email || "No email"}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{selected.customer?.phone || "No phone"}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="inline-flex items-center gap-2 text-sm font-black"><ShieldCheck size={16} /> Conversation controls</h3>
                  {selected.isBlocked ? <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black uppercase text-amber-900 dark:bg-amber-950 dark:text-amber-100">Customer blocked</span> : null}
                </div>
                <label className="mt-3 block text-xs font-black uppercase text-slate-500">
                  Status
                  <select value={selected.status} disabled={savingConversation} onChange={(event) => void updateConversation({ status: event.target.value as ConversationStatus })} className="premium-field mt-1 h-10 w-full rounded-xl px-3 text-sm font-bold">
                    {conversationStatuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
                  </select>
                </label>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" disabled={savingConversation} onClick={() => void updateConversation({ isPinned: !selected.isPinned })} className="gap-2 text-xs">
                    {selected.isPinned ? <PinOff size={15} /> : <Pin size={15} />} {selected.isPinned ? "Unpin" : "Pin"}
                  </Button>
                  <Button type="button" variant="outline" disabled={savingConversation} onClick={() => void updateConversation({ isArchived: !selected.isArchived })} className="gap-2 text-xs">
                    {selected.isArchived ? <ArchiveRestore size={15} /> : <Archive size={15} />} {selected.isArchived ? "Restore" : "Archive"}
                  </Button>
                  <Button type="button" variant="outline" disabled={savingConversation} onClick={() => void updateConversation({ isBlocked: !selected.isBlocked })} className="col-span-2 gap-2 text-xs">
                    <Ban size={15} /> {selected.isBlocked ? "Unblock customer" : "Block customer"}
                  </Button>
                </div>
                <label className="mt-3 block text-xs font-black uppercase text-slate-500">
                  Internal note
                  <textarea value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} rows={3} maxLength={4000} placeholder="Visible to admins only" className="premium-field mt-1 w-full resize-none rounded-xl p-3 text-sm font-semibold normal-case" />
                </label>
                <Button type="button" variant="outline" disabled={savingConversation || internalNotes === (selected.internalNotes || "")} onClick={() => void updateConversation({ internalNotes })} className="mt-2 w-full gap-2 text-xs">
                  <Save size={15} /> Save internal note
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                  <p className="text-xs font-bold uppercase text-slate-500">Orders</p>
                  <strong className="text-xl">{profile?.orderCount ?? 0}</strong>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                  <p className="text-xs font-bold uppercase text-slate-500">Spend</p>
                  <strong className="text-lg">{money(profile?.lifetimeSpend || 0)}</strong>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="inline-flex items-center gap-2 font-black"><ShoppingBag size={17} /> Latest orders</h3>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500"><Clock3 size={13} /> {profile?.lastOrderAt ? new Date(profile.lastOrderAt).toLocaleDateString() : "None"}</span>
                </div>
                <div className="mt-3 space-y-2">
                  {profile?.latestOrders?.length ? profile.latestOrders.map((order) => (
                    <div key={order.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-900">
                      <div className="flex items-center justify-between gap-2">
                        <strong>{order.orderNumber}</strong>
                        <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[11px] font-black text-white">{order.status.replaceAll("_", " ")}</span>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{order.paymentMethod.replaceAll("_", " ")} - {money(order.total)}</p>
                    </div>
                  )) : (
                    <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 dark:border-slate-800">
                      No orders found for this customer yet.
                    </div>
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-red-100 bg-red-50 p-4 dark:border-red-950 dark:bg-red-950/20">
                <h3 className="inline-flex items-center gap-2 text-sm font-black text-red-800 dark:text-red-100"><Sparkles size={16} /> Quick replies</h3>
                <div className="mt-3 grid gap-2">
                  {quickReplies.map((reply) => (
                    <button key={reply} type="button" onClick={() => void send({ messageText: reply }).catch(() => undefined)} className="rounded-xl bg-white px-3 py-2 text-left text-xs font-bold leading-5 text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:text-red-700 dark:bg-slate-950 dark:text-slate-200">
                      {reply}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950">
              <CheckCircle2 className="mx-auto mb-3 text-slate-400" size={34} />
              Select a customer thread to view details.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
