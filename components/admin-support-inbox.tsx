"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Mail, MessageCircle, Phone, RefreshCw, Search, Send, UserRound } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type Message = {
  id: string;
  senderType: "CUSTOMER" | "ADMIN" | string;
  senderName: string;
  body: string;
  createdAt: string;
};

type Conversation = {
  id: string;
  customerPublicId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  status: string;
  title: string;
  description: string;
  unreadByAdmin?: number;
  unreadByCustomer?: number;
  lastMessageAt?: string;
  messages: Message[];
};

const statuses = ["", "OPEN", "PENDING_CUSTOMER", "RESOLVED", "CLOSED"];

export function AdminSupportInbox() {
  const [items, setItems] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [reply, setReply] = useState("");
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  const selectedId = selected?.id;
  const unread = useMemo(() => items.reduce((sum, item) => sum + Number(item.unreadByAdmin || 0), 0), [items]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    const response = await fetch(`/api/admin/support-conversations?${params}`);
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setToast(data.error || "Unable to load conversations");
      return;
    }
    const rows = Array.isArray(data.items) ? data.items : [];
    setItems(rows);
    setSource(data.source || "database");
    setSelected((current) => current ? rows.find((item: Conversation) => item.id === current.id) || current : rows[0] || null);
  }, [q, status]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => void load(), 9000);
    return () => window.clearInterval(timer);
  }, [load]);

  async function openConversation(item: Conversation) {
    const response = await fetch(`/api/admin/support-conversations/${item.id}`);
    const data = await response.json();
    if (response.ok) {
      setSelected(data.conversation);
      setItems((current) => current.map((row) => row.id === item.id ? { ...row, unreadByAdmin: 0 } : row));
    } else {
      setSelected(item);
    }
  }

  async function sendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !reply.trim()) return;
    const response = await fetch(`/api/admin/support-conversations/${selected.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: reply })
    });
    const data = await response.json();
    if (!response.ok) {
      setToast(data.error || "Reply failed");
      return;
    }
    setReply("");
    await openConversation(selected);
    await load();
  }

  async function updateStatus(nextStatus: string) {
    if (!selected) return;
    const response = await fetch(`/api/admin/support-conversations/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus })
    });
    const data = await response.json();
    setToast(response.ok ? "Status updated" : data.error || "Status update failed");
    if (response.ok) {
      setSelected(data.conversation);
      await load();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">Customer messaging inbox</h1>
          <p className="text-sm text-slate-500">Every customer has a public ID and private conversation history.</p>
        </div>
        <Button variant="outline" onClick={() => void load()}><RefreshCw size={17} /> Refresh</Button>
      </div>
      {source === "fallback" ? (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          PostgreSQL is not connected yet. Messaging is using the local fallback store, and customer-admin chat can still be saved and read.
        </motion.div>
      ) : null}
      <div className="grid min-h-[72vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950 lg:grid-cols-[380px_1fr]">
        <aside className="border-b border-slate-200 bg-slate-50/75 dark:border-slate-800 dark:bg-slate-900/60 lg:border-b-0 lg:border-r">
          <div className="space-y-3 p-4">
            <div className="flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
              <Search size={17} className="text-slate-500" />
              <input className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none" value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search customer, phone, ID" />
            </div>
            <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" value={status} onChange={(event) => setStatus(event.target.value)}>
              {statuses.map((item) => <option key={item} value={item}>{item || "All statuses"}</option>)}
            </select>
            <div className="rounded-xl bg-white p-3 text-sm font-bold text-slate-700 dark:bg-slate-950">Unread for admin: {unread}</div>
          </div>
          <div className="max-h-[58vh] overflow-y-auto p-2">
            {loading ? <div className="skeleton m-3 h-24 rounded-xl" /> : items.length ? items.map((item) => (
              <button key={item.id} onClick={() => void openConversation(item)} className={`mb-2 w-full rounded-xl border p-3 text-left transition hover:border-red-200 hover:bg-white ${selectedId === item.id ? "border-red-200 bg-white shadow-sm" : "border-transparent bg-white/70 dark:bg-slate-950"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <strong className="line-clamp-1">{item.customerName || "Customer"}</strong>
                    <p className="mt-1 line-clamp-1 text-xs text-slate-500">{item.title}</p>
                  </div>
                  {item.unreadByAdmin ? <span className="grid size-6 place-items-center rounded-full bg-red-700 text-xs font-black text-white">{item.unreadByAdmin}</span> : null}
                </div>
                <p className="mt-2 break-all font-mono text-[11px] text-slate-500">{item.customerPublicId}</p>
                <p className="mt-2 text-xs font-bold text-slate-500">{item.status}</p>
              </button>
            )) : <div className="m-3 rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">No conversations yet.</div>}
          </div>
        </aside>

        <section className="flex min-h-[72vh] flex-col">
          {selected ? (
            <>
              <div className="border-b border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black">{selected.title}</h2>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1"><UserRound size={14} /> {selected.customerName || "Customer"}</span>
                      <span className="inline-flex items-center gap-1"><Phone size={14} /> {selected.customerPhone || "No phone"}</span>
                      <span className="inline-flex items-center gap-1"><Mail size={14} /> {selected.customerEmail || "No email"}</span>
                    </div>
                    <p className="mt-2 break-all rounded-lg bg-slate-50 px-2 py-1 font-mono text-xs text-slate-500 dark:bg-slate-900">ID: {selected.customerPublicId || selected.id}</p>
                  </div>
                  <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" value={selected.status} onChange={(event) => void updateStatus(event.target.value)}>
                    {statuses.filter(Boolean).map((item) => <option key={item}>{item}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-4 dark:bg-slate-900/40">
                {selected.messages?.map((message) => (
                  <motion.div key={message.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm shadow-sm ${message.senderType === "ADMIN" ? "ml-auto bg-slate-950 text-white" : "bg-white text-slate-800 dark:bg-slate-950 dark:text-slate-100"}`}>
                    <p className="text-[11px] font-bold opacity-65">{message.senderName}</p>
                    <p className="whitespace-pre-wrap">{message.body}</p>
                    <time className="mt-2 block text-[10px] opacity-60">{new Date(message.createdAt).toLocaleString()}</time>
                  </motion.div>
                ))}
              </div>
              <form onSubmit={sendReply} className="flex gap-2 border-t border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                <textarea className="min-w-0 flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-red-600 dark:border-slate-700 dark:bg-slate-900" rows={2} value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Reply to customer..." />
                <Button type="submit" variant="accent" className="self-end"><Send size={17} /> Reply</Button>
              </form>
            </>
          ) : (
            <div className="grid flex-1 place-items-center p-8 text-center text-slate-500">
              <div>
                <MessageCircle className="mx-auto mb-3 text-slate-400" size={42} />
                <p>Select a customer conversation.</p>
              </div>
            </div>
          )}
        </section>
      </div>
      <AnimatePresence>{toast ? <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} className="fixed bottom-5 right-5 rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white" onAnimationComplete={() => window.setTimeout(() => setToast(""), 2200)}>{toast}</motion.div> : null}</AnimatePresence>
    </div>
  );
}
