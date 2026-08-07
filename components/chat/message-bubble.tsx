"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { FileText, Pencil, Pin, PinOff, Reply, ShoppingCart, Trash2, X, Zap } from "lucide-react";
import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useCart } from "@/components/cart-provider";
import type { ChatMessage, ChatMessageAction } from "@/components/chat/types";
import { VoicePlayer } from "@/components/chat/voice-player";
import { money } from "@/lib/utils";

function replyLabel(message: ChatMessage["replyTo"]) {
  if (!message || message.deletedAt) return "Message unavailable";
  if (message.messageText) return message.messageText;
  if (message.messageType === "VOICE") return "Voice message";
  if (message.messageType === "PRODUCT") return "Shared product";
  return message.attachmentName || "Attachment";
}

export function MessageBubble({
  message,
  perspective,
  onReply,
  onAction
}: {
  message: ChatMessage;
  perspective: "CUSTOMER" | "ADMIN";
  onReply?: (message: ChatMessage) => void;
  onAction?: (messageId: string, action: ChatMessageAction) => Promise<void> | void;
}) {
  const mine = message.senderRole === perspective;
  const cart = useCart();
  const product = message.productSnapshot;
  const isVoiceMessage = message.messageType === "VOICE" || message.attachmentType?.startsWith("audio/");
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.messageText);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deleted = Boolean(message.deletedAt);
  const canEdit = mine && !deleted && Date.now() - new Date(message.createdAt).getTime() <= 15 * 60_000;

  function clearLongPress() {
    if (longPressRef.current) clearTimeout(longPressRef.current);
    longPressRef.current = null;
  }

  function startLongPress(event: ReactPointerEvent) {
    if ((event.target as HTMLElement).closest("button,a,input,textarea,audio")) return;
    clearLongPress();
    longPressRef.current = setTimeout(() => {
      setMenuOpen(true);
      navigator.vibrate?.(25);
    }, 500);
  }

  async function runAction(action: ChatMessageAction) {
    if (!onAction || busy) return;
    setBusy(true);
    setActionError("");
    try {
      await onAction(message.id, action);
      setMenuOpen(false);
      if (action.action === "edit") setEditing(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Message action failed");
    } finally {
      setBusy(false);
    }
  }

  function finishSwipe(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    clearLongPress();
    if (info.offset.x > 52 && !deleted) {
      onReply?.(message);
      navigator.vibrate?.(18);
    }
  }

  return (
    <div className={`relative flex min-w-0 ${mine ? "justify-end" : "justify-start"}`}>
      <motion.div
        drag={deleted ? false : "x"}
        dragConstraints={{ left: 0, right: 72 }}
        dragElastic={0.16}
        onDragStart={clearLongPress}
        onDragEnd={finishSwipe}
        className="relative min-w-0 max-w-[92%] sm:max-w-[74%]"
      >
        <article
          onPointerDown={startLongPress}
          onPointerUp={clearLongPress}
          onPointerCancel={clearLongPress}
          onPointerLeave={clearLongPress}
          onContextMenu={(event) => {
            event.preventDefault();
            if (!deleted) setMenuOpen(true);
          }}
          className={`min-w-0 rounded-[1.35rem] px-3 py-2.5 text-sm shadow-sm sm:px-4 ${
            mine
              ? "rounded-br-md bg-slate-950 text-white dark:bg-red-700"
              : "rounded-bl-md border border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          } ${message.isPinned ? "ring-2 ring-amber-400/45" : ""}`}
        >
          <div className="mb-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[10px] font-black uppercase opacity-65 sm:text-[11px]">
            <span>{message.senderRole === "ADMIN" ? "Admin" : message.sender?.name || "Customer"}</span>
            <time>{new Date(message.createdAt).toLocaleString()}</time>
          </div>

          {message.replyTo ? (
            <div className="mb-2 block w-full border-l-2 border-red-400 bg-white/10 px-2.5 py-2 text-left">
              <span className="block text-[10px] font-black uppercase opacity-65">{message.replyTo.senderRole === perspective ? "You" : message.replyTo.senderRole === "ADMIN" ? "Admin" : "Customer"}</span>
              <span className="mt-0.5 block truncate text-xs font-semibold opacity-85">{replyLabel(message.replyTo)}</span>
            </div>
          ) : null}

          {deleted ? (
            <p className="inline-flex items-center gap-2 py-1 text-xs font-semibold italic opacity-60"><Trash2 size={14} /> Message unsent</p>
          ) : editing ? (
            <div className="grid gap-2">
              <textarea value={editText} onChange={(event) => setEditText(event.target.value)} rows={3} autoFocus className="min-w-0 resize-none rounded-xl border border-white/20 bg-white/10 p-2 text-sm text-inherit outline-none focus:border-red-300" maxLength={4000} />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { setEditing(false); setEditText(message.messageText); }} className="grid size-8 place-items-center rounded-full bg-white/10" aria-label="Cancel edit"><X size={14} /></button>
                <button type="button" disabled={busy || !editText.trim()} onClick={() => void runAction({ action: "edit", messageText: editText })} className="min-h-8 rounded-full bg-red-600 px-3 text-xs font-black text-white disabled:opacity-50">Save</button>
              </div>
            </div>
          ) : (
            <>
              {message.messageText ? <p className="whitespace-pre-wrap break-words leading-6">{message.messageText}</p> : null}
              {message.attachmentUrl && isVoiceMessage ? (
                <div className="mt-2 min-w-0">
                  <VoicePlayer src={message.attachmentUrl} waveform={message.voiceWaveform} duration={message.voiceDuration} label={message.attachmentName || "Voice message"} />
                </div>
              ) : message.attachmentUrl ? (
                <a href={message.attachmentUrl} target="_blank" rel="noreferrer" className="mt-2 block overflow-hidden rounded-xl border border-current/15 bg-white/10 transition hover:opacity-90" aria-label={`Open attachment ${message.attachmentName || "file"}`}>
                  {message.attachmentType?.startsWith("image/") ? (
                    <Image src={message.attachmentUrl} alt={message.attachmentName || "Message attachment"} width={720} height={480} unoptimized className="max-h-64 w-full object-cover" />
                  ) : (
                    <span className="flex items-center gap-2 px-3 py-3 font-bold"><FileText size={18} /><span className="truncate">{message.attachmentName || "Open attachment"}</span></span>
                  )}
                </a>
              ) : null}
              {product ? (
                <div className="mt-3 overflow-hidden rounded-2xl border border-current/15 bg-white text-slate-950 shadow-sm dark:bg-slate-900 dark:text-slate-100">
                  <div className="grid gap-3 p-3 sm:grid-cols-[96px_minmax(0,1fr)]">
                    <div className="relative aspect-square overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                      <Image src={product.image || "/brand/htc-logo.png"} alt={product.name} fill unoptimized className="object-cover" sizes="120px" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase text-red-700 dark:text-red-300">{product.brand} / {product.category}</p>
                      <h3 className="mt-1 line-clamp-2 font-black leading-tight">{product.name}</h3>
                      <p className="mt-1 truncate font-mono text-[11px] font-bold text-slate-500">{product.sku}{product.variantName ? ` / ${product.variantName}` : ""}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <strong>{money(Number(product.price || 0))}</strong>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${Number(product.stock || 0) > 0 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-100" : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-100"}`}>
                          {Number(product.stock || 0) > 0 ? `${product.stock} in stock` : "Unavailable"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 border-t border-slate-200 p-2 dark:border-slate-800 sm:gap-2">
                    <Link href={`/products/${product.slug}`} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 px-2 text-xs font-black transition hover:border-red-300 hover:text-red-700 dark:border-slate-700">View</Link>
                    <button type="button" disabled={Number(product.stock || 0) < 1} onClick={() => cart.add(product.id, 1, product.variantId || null)} className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl bg-slate-950 px-2 text-xs font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"><ShoppingCart size={14} /> Cart</button>
                    <Link href={`/buy-now/${product.slug}${product.variantId ? `?variantId=${encodeURIComponent(product.variantId)}` : ""}`} className={`inline-flex min-h-10 items-center justify-center gap-1 rounded-xl px-2 text-xs font-black text-white transition ${Number(product.stock || 0) > 0 ? "bg-red-700 hover:bg-red-800" : "pointer-events-none bg-slate-400"}`}><Zap size={14} /> Buy</Link>
                  </div>
                </div>
              ) : null}
            </>
          )}

          {!deleted ? (
            <div className="mt-1.5 flex items-center justify-end gap-2 text-[10px] font-bold opacity-55">
              {message.isPinned ? <span className="inline-flex items-center gap-1"><Pin size={10} fill="currentColor" /> Pinned</span> : null}
              {message.editedAt ? <span>Edited</span> : null}
              {mine ? <span>{message.isRead ? "Read" : message.deliveredAt ? "Delivered" : "Sent"}</span> : null}
            </div>
          ) : null}
          {actionError ? <p className="mt-2 rounded-lg bg-red-500/15 px-2 py-1.5 text-xs font-bold text-red-200" role="alert">{actionError}</p> : null}
        </article>

        <AnimatePresence>
          {menuOpen && !deleted ? (
            <motion.div
              initial={{ opacity: 0, y: 5, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.96 }}
              className={`absolute bottom-[calc(100%+6px)] z-20 flex min-w-max items-center gap-1 rounded-full border border-slate-200 bg-white p-1.5 text-slate-800 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-white ${mine ? "right-0" : "left-0"}`}
              role="menu"
            >
              <button type="button" onClick={() => { onReply?.(message); setMenuOpen(false); }} className="grid size-9 place-items-center rounded-full transition hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Reply to message" title="Reply"><Reply size={16} /></button>
              {canEdit ? <button type="button" onClick={() => { setEditing(true); setMenuOpen(false); }} className="grid size-9 place-items-center rounded-full transition hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Edit message" title="Edit"><Pencil size={15} /></button> : null}
              <button type="button" disabled={busy} onClick={() => void runAction({ action: "pin", isPinned: !message.isPinned })} className="grid size-9 place-items-center rounded-full transition hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800" aria-label={message.isPinned ? "Unpin message" : "Pin message"} title={message.isPinned ? "Unpin" : "Pin"}>
                {message.isPinned ? <PinOff size={15} /> : <Pin size={15} />}
              </button>
              {mine ? <button type="button" disabled={busy} onClick={() => void runAction({ action: "delete" })} className="grid size-9 place-items-center rounded-full text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/40" aria-label="Unsend message" title="Unsend"><Trash2 size={15} /></button> : null}
              <button type="button" onClick={() => setMenuOpen(false)} className="grid size-9 place-items-center rounded-full transition hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close message menu"><X size={15} /></button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
