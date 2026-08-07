"use client";

import { RefreshCw, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChatWindow } from "@/components/chat/chat-window";
import type { ChatConversation, ChatMessageAction, ChatMessageDraft } from "@/components/chat/types";
import { Button } from "@/components/ui/button";

export function CustomerMessagesClient() {
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [customerPublicId, setCustomerPublicId] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const loadRequestRef = useRef(0);
  const sendRef = useRef(false);

  const load = useCallback(async (showSpinner = true) => {
    const requestId = ++loadRequestRef.current;
    if (showSpinner) setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/account/messages", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load messages");
      if (requestId !== loadRequestRef.current) return;
      setConversation(data.conversation);
      setCustomerPublicId(data.customerPublicId || data.conversation?.customer?.customerPublicId || "");
    } catch (err) {
      if (requestId === loadRequestRef.current) setError(err instanceof Error ? err.message : "Unable to load messages");
    } finally {
      if (showSpinner && requestId === loadRequestRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(true);
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!document.hidden) void load(false);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [load]);

  async function send(draft: ChatMessageDraft) {
    if (sendRef.current) return;
    sendRef.current = true;
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/account/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Message failed");
      setConversation(data.conversation);
      setCustomerPublicId(data.customerPublicId || data.conversation?.customer?.customerPublicId || customerPublicId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Message failed";
      setError(message);
      throw err;
    } finally {
      sendRef.current = false;
      setSending(false);
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
    <div className="mx-auto max-w-5xl px-2 py-5 sm:px-4 sm:py-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1 sm:mb-5 sm:px-0">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-red-700">Private customer inbox</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">Messages / Chat with Admin</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Your chat is tied to your logged-in customer account only.</p>
        </div>
        <Button type="button" variant="outline" onClick={() => void load(true)} className="gap-2">
          <RefreshCw size={17} /> Refresh
        </Button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/25 dark:text-emerald-100 sm:mb-4 sm:rounded-2xl sm:p-4 sm:text-sm">
        <ShieldCheck size={18} />
        <span>Customer ID:</span>
        <span className="break-all font-mono">{customerPublicId || "Creating..."}</span>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 shadow-xl dark:border-slate-800 sm:rounded-2xl">
        <ChatWindow conversation={conversation} perspective="CUSTOMER" loading={loading} sending={sending} error={error} onRetry={() => void load(true)} onSend={send} onMessageAction={updateMessage} />
      </div>
    </div>
  );
}
