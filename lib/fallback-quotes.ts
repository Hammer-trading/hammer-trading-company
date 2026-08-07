import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertLocalFallbackEnabled } from "@/lib/db-fallback";

export type FallbackQuoteStatus = "PENDING" | "REPLIED" | "APPROVED" | "REJECTED" | "CONVERTED";

export type FallbackQuoteRequest = {
  id: string;
  productId?: string | null;
  productName: string;
  quantity: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  city: string;
  note?: string | null;
  status: FallbackQuoteStatus;
  adminReply?: string | null;
  quotedPrice?: number | null;
  convertedOrderId?: string | null;
  convertedOrderNumber?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type QuoteInput = {
  productId?: string | null;
  productName: string;
  quantity: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  city: string;
  note?: string | null;
};

const storePath = path.join(process.cwd(), "data", "fallback-quotes.json");

async function ensureStore() {
  await mkdir(path.dirname(storePath), { recursive: true });
}

async function writeQuotes(quotes: FallbackQuoteRequest[]) {
  await ensureStore();
  await writeFile(storePath, JSON.stringify(quotes, null, 2), "utf8");
}

export async function readFallbackQuotes() {
  assertLocalFallbackEnabled();
  try {
    const raw = await readFile(storePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FallbackQuoteRequest[]) : [];
  } catch {
    return [];
  }
}

export async function saveFallbackQuote(input: QuoteInput) {
  const quotes = await readFallbackQuotes();
  const now = new Date().toISOString();
  const quote: FallbackQuoteRequest = {
    id: `fallback-quote-${Date.now()}`,
    productId: input.productId || null,
    productName: input.productName,
    quantity: input.quantity,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    customerEmail: input.customerEmail || null,
    city: input.city,
    note: input.note || null,
    status: "PENDING",
    adminReply: null,
    quotedPrice: null,
    convertedOrderId: null,
    convertedOrderNumber: null,
    createdAt: now,
    updatedAt: now
  };
  await writeQuotes([quote, ...quotes]);
  return quote;
}

export async function updateFallbackQuote(id: string, data: Partial<FallbackQuoteRequest>) {
  const quotes = await readFallbackQuotes();
  const index = quotes.findIndex((quote) => quote.id === id);
  if (index === -1) return null;
  quotes[index] = { ...quotes[index], ...data, updatedAt: new Date().toISOString() };
  await writeQuotes(quotes);
  return quotes[index];
}

export async function getFallbackQuote(id: string) {
  const quotes = await readFallbackQuotes();
  return quotes.find((quote) => quote.id === id) || null;
}
