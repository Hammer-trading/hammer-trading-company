"use client";

import { AnimatePresence, motion } from "motion/react";
import { Chrome, MessageCircle, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageBubble } from "@/components/chat/message-bubble";
import { MessageInput } from "@/components/chat/message-input";
import type { ChatConversation, ChatMessage, ChatMessageAction, ChatMessageDraft } from "@/components/chat/types";

type SessionResponse = {
  user: null | {
    customerPublicId?: string | null;
    name: string;
    email: string;
    isAdmin: boolean;
  };
};

export function CustomerChatWidget() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [customerPublicId, setCustomerPublicId] = useState("");
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const submitRef = useRef(false);

  const unread = useMemo(() => Number(conversation?.customerUnreadCount || 0), [conversation?.customerUnreadCount]);

  const load = useCallback(async () => {
    try {
      const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
      const sessionData = (await sessionResponse.json()) as SessionResponse;
      if (!sessionData.user || sessionData.user.isAdmin) {
        setSignedIn(false);
        setCustomerPublicId("");
        setConversation(null);
        return;
      }
      setSignedIn(true);
      setCustomerPublicId(sessionData.user.customerPublicId || "");
      const response = await fetch("/api/account/messages", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load chat");
      setConversation(data.conversation);
      setCustomerPublicId(data.customerPublicId || sessionData.user.customerPublicId || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load chat");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!open) return;
    void load();
    const timer = window.setInterval(() => void load(), 12000);
    return () => window.clearInterval(timer);
  }, [load, open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [conversation?.messages?.length, open]);

  async function submit(draft: ChatMessageDraft) {
    if (!signedIn || submitRef.current) return;
    submitRef.current = true;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/account/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, conversationId: conversation?.id })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The message could not be sent.");
      setConversation(data.conversation);
      setCustomerPublicId(data.customerPublicId || customerPublicId);
      setReplyTo(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The message could not be sent.");
      throw err;
    } finally {
      submitRef.current = false;
      setLoading(false);
    }
  }

  async function updateMessage(messageId: string, action: ChatMessageAction) {
    setError("");
    try {
      const response = await fetch(`/api/account/messages/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Message update failed");
      setConversation(data.conversation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Message update failed");
      throw err;
    }
  }

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        whileTap={{ scale: 0.94 }}
        className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-4 z-50 grid size-12 place-items-center rounded-full bg-red-700 text-white shadow-glow md:bottom-5 md:right-5 md:size-14"
        aria-label="Customer support chat"
      >
        <MessageCircle size={26} />
        {unread ? <span className="absolute -right-1 -top-1 grid size-6 place-items-center rounded-full bg-amber-400 text-xs font-black text-slate-950">{unread}</span> : null}
      </motion.button>
      <AnimatePresence>
        {open ? (
          <motion.div className="fixed inset-0 z-[90] flex items-end bg-slate-950/35 p-2 backdrop-blur-sm sm:grid sm:place-items-end sm:p-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button className="absolute inset-0" aria-label="Close chat" onClick={() => setOpen(false)} />
            <motion.section initial={{ y: 28, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 28, opacity: 0, scale: 0.98 }} className="relative ml-auto flex h-[min(88dvh,46rem)] max-h-[calc(100dvh-1rem)] w-full max-w-md flex-col overflow-hidden rounded-xl border border-white/60 bg-white shadow-2xl sm:rounded-2xl">
              <div className="bg-gradient-to-r from-slate-950 to-red-950 p-3 text-white sm:p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase text-white/60">Hammer Support</p>
                    <h2 className="text-lg font-black">Chat with Admin</h2>
                  </div>
                  <button className="grid size-9 place-items-center rounded-xl bg-white/10" onClick={() => setOpen(false)} aria-label="Close chat"><X size={18} /></button>
                </div>
                <p className="mt-2 break-all text-xs text-white/65">{signedIn ? `Customer ID: ${customerPublicId || "Creating..."}` : "Login required for private customer chat"}</p>
                {!signedIn ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a href="/api/auth/google?next=/account/messages" className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/15">
                      <Chrome size={15} /> Google login
                    </a>
                    <a href="/login?next=/account/messages" className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/15">
                      Sign in
                    </a>
                  </div>
                ) : (
                  <a href="/account/messages" className="mt-3 inline-flex rounded-xl bg-emerald-400/15 px-3 py-2 text-xs font-bold text-emerald-50 transition hover:bg-emerald-400/25">Open full inbox</a>
                )}
              </div>

              <div className="chat-message-canvas min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:p-4" data-lenis-prevent>
                {!signedIn ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-center text-sm text-slate-600">
                    <p className="font-bold text-slate-900">Please log in to chat with admin.</p>
                    <p className="mt-2">Your messages and admin replies stay inside your private customer thread.</p>
                  </div>
                ) : conversation?.messages?.length ? conversation.messages.map((item) => (
                  <MessageBubble key={item.id} message={item} perspective="CUSTOMER" onReply={setReplyTo} onAction={updateMessage} />
                )) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-center text-sm text-slate-500">
                    Send your first message. Admin replies will appear here.
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {signedIn ? (
                <div className="shrink-0">
                  {error ? <p className="mx-3 mt-2 rounded-lg bg-red-50 p-2 text-xs font-semibold text-red-700">{error}</p> : null}
                  <MessageInput disabled={!signedIn} loading={loading} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} onSend={submit} placeholder="Message admin..." />
                </div>
              ) : null}
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
