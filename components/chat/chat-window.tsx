"use client";

import { MessageCircle, Pin, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MessageBubble } from "@/components/chat/message-bubble";
import { MessageInput } from "@/components/chat/message-input";
import type { ChatConversation, ChatMessage, ChatMessageAction, ChatMessageDraft } from "@/components/chat/types";

export function ChatWindow({
  conversation,
  perspective,
  loading,
  sending,
  error,
  onRetry,
  onSend,
  onMessageAction
}: {
  conversation: ChatConversation | null;
  perspective: "CUSTOMER" | "ADMIN";
  loading?: boolean;
  sending?: boolean;
  error?: string;
  onRetry?: () => void;
  onSend: (draft: ChatMessageDraft) => Promise<void> | void;
  onMessageAction?: (messageId: string, action: ChatMessageAction) => Promise<void> | void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const messages = conversation?.messages || [];
  const pinnedMessages = messages.filter((message) => message.isPinned && !message.deletedAt);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, conversation?.id]);

  useEffect(() => {
    setReplyTo(null);
  }, [conversation?.id]);

  return (
    <section className="chat-shell flex min-h-[66dvh] min-w-0 flex-col overflow-hidden bg-white dark:bg-slate-950 sm:min-h-[72vh]">
      <header className="border-b border-slate-200 bg-white/95 p-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:p-4">
        {conversation ? (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-red-700 dark:text-red-300">
                {perspective === "ADMIN" ? "Customer conversation" : "Chat with admin"}
              </p>
              <h1 className="mt-1 text-xl font-black sm:text-2xl">{conversation.customer?.name || "Customer"}</h1>
              <p className="mt-1 break-all font-mono text-xs font-bold text-slate-500">
                {conversation.customer?.customerPublicId || conversation.customerId}
              </p>
            </div>
            <div className="max-w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 sm:text-xs">
              {conversation.lastMessageAt ? `Last: ${new Date(conversation.lastMessageAt).toLocaleString()}` : "New chat"}
            </div>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-black">{perspective === "ADMIN" ? "Messages" : "Chat with admin"}</h1>
            <p className="mt-1 text-sm text-slate-500">Select a conversation or send your first message.</p>
          </div>
        )}
      </header>

      {perspective === "CUSTOMER" && conversation?.isBlocked ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100" role="status">
          Messaging has been disabled for this account. Existing conversation history remains available.
        </div>
      ) : null}

      {pinnedMessages.length ? (
        <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-950 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-100">
          <Pin size={14} fill="currentColor" className="shrink-0" />
          <span className="min-w-0 flex-1 truncate">
            {pinnedMessages.length} pinned: {pinnedMessages[pinnedMessages.length - 1].messageText || pinnedMessages[pinnedMessages.length - 1].attachmentName || "Message"}
          </span>
        </div>
      ) : null}

      <div className="chat-message-canvas min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:p-4" data-lenis-prevent>
        {loading ? (
          <div className="space-y-3">
            <div className="h-16 w-3/4 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
            <div className="ml-auto h-16 w-2/3 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
            <p>{error}</p>
            {onRetry ? <button type="button" onClick={onRetry} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-black transition hover:border-red-400 dark:border-red-800 dark:bg-slate-950"><RefreshCw size={14} /> Retry</button> : null}
          </div>
        ) : messages.length ? (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              perspective={perspective}
              onReply={setReplyTo}
              onAction={onMessageAction}
            />
          ))
        ) : (
          <div className="grid h-full place-items-center text-center">
            <div className="max-w-sm rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <MessageCircle className="mx-auto mb-3 text-slate-400" size={42} />
              <p className="font-bold text-slate-900 dark:text-slate-100">No messages yet</p>
              <p className="mt-2">Start the conversation. Every reply stays private in this customer thread.</p>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <MessageInput
        disabled={loading || Boolean(error && !conversation) || (perspective === "ADMIN" && !conversation) || (perspective === "CUSTOMER" && Boolean(conversation?.isBlocked))}
        loading={sending}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        onSend={(draft) => onSend({ ...draft, conversationId: conversation?.id })}
        placeholder={perspective === "ADMIN" ? "Reply to this customer..." : "Message admin..."}
      />
    </section>
  );
}
