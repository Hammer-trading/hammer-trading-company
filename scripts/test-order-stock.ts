import assert from "node:assert/strict";
import type { Prisma } from "@prisma/client";
import { deductOrderStock, restoreOrderStock, type OrderStockItem } from "../lib/order-stock";

async function main() {
const items: OrderStockItem[] = [
  { productId: "product-1", variantId: "variant-a", quantity: 2, product: { stock: 10, lowStockThreshold: 3 }, variant: { id: "variant-a", stock: 4 } },
  { productId: "product-1", variantId: "variant-b", quantity: 3, product: { stock: 10, lowStockThreshold: 3 }, variant: { id: "variant-b", stock: 6 } }
];

const restoredProducts: unknown[] = [];
const restoredVariants: unknown[] = [];
const restorationLogs: unknown[] = [];
const restoreTx = {
  product: { update: async (args: unknown) => { restoredProducts.push(args); } },
  productVariant: { update: async (args: unknown) => { restoredVariants.push(args); } },
  inventoryLog: { create: async (args: unknown) => { restorationLogs.push(args); } }
} as unknown as Prisma.TransactionClient;

await restoreOrderStock(restoreTx, items, { orderId: "order-1", orderNumber: "HTC-1" }, "test restoration");
assert.equal(restoredProducts.length, 1, "parent product must be restored once");
assert.equal((restoredProducts[0] as { data: { stock: { increment: number } } }).data.stock.increment, 5, "all variant quantities must be aggregated");
assert.equal(restoredVariants.length, 2, "each variant must be restored independently");
assert.equal(restorationLogs.length, 1, "one parent inventory log must record the aggregate restoration");

const deductions: unknown[] = [];
const variantDeductions: unknown[] = [];
const deductTx = {
  product: { updateMany: async (args: unknown) => { deductions.push(args); return { count: 1 }; } },
  productVariant: { updateMany: async (args: unknown) => { variantDeductions.push(args); return { count: 1 }; } },
  inventory: { upsert: async () => undefined },
  inventoryLog: { create: async () => undefined }
} as unknown as Prisma.TransactionClient;

await deductOrderStock(deductTx, items, { orderId: "order-1", orderNumber: "HTC-1" }, "test reopen");
assert.equal(deductions.length, 1, "parent product must be deducted once");
assert.equal((deductions[0] as { data: { stock: { decrement: number } } }).data.stock.decrement, 5, "reopen must deduct the full aggregate quantity");
assert.equal(variantDeductions.length, 2, "each variant must be deducted independently");

console.log("ORDER_STOCK_TEST_PASSED");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
