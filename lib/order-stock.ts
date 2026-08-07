import type { Prisma } from "@prisma/client";

export type OrderStockItem = {
  productId: string;
  variantId: string | null;
  quantity: number;
  product: { stock: number; lowStockThreshold: number };
  variant: { id: string; stock: number } | null;
};

type StockContext = { orderId?: string; orderNumber: string; actorId?: string | null };

function aggregate(items: OrderStockItem[]) {
  const products = new Map<string, { quantity: number; stock: number; lowStockThreshold: number }>();
  const variants = new Map<string, { quantity: number; stock: number }>();
  for (const item of items) {
    const product = products.get(item.productId);
    products.set(item.productId, {
      quantity: (product?.quantity || 0) + item.quantity,
      stock: product?.stock ?? item.product.stock,
      lowStockThreshold: product?.lowStockThreshold ?? item.product.lowStockThreshold
    });
    if (item.variantId && item.variant) {
      const variant = variants.get(item.variantId);
      variants.set(item.variantId, { quantity: (variant?.quantity || 0) + item.quantity, stock: variant?.stock ?? item.variant.stock });
    }
  }
  return { products, variants };
}

export async function restoreOrderStock(tx: Prisma.TransactionClient, items: OrderStockItem[], context: StockContext, reason: string) {
  const grouped = aggregate(items);
  for (const [productId, item] of grouped.products) {
    await tx.product.update({
      where: { id: productId },
      data: {
        stock: { increment: item.quantity },
        inventory: {
          upsert: {
            update: { currentStock: { increment: item.quantity } },
            create: { currentStock: item.stock + item.quantity, minStockLevel: item.lowStockThreshold }
          }
        }
      }
    });
    await tx.inventoryLog.create({
      data: {
        productId,
        type: "ORDER_RESTORATION",
        quantity: item.quantity,
        previousStock: item.stock,
        newStock: item.stock + item.quantity,
        reason,
        orderId: context.orderId,
        actorId: context.actorId
      }
    });
  }
  for (const [variantId, item] of grouped.variants) {
    await tx.productVariant.update({ where: { id: variantId }, data: { stock: { increment: item.quantity } } });
  }
}

export async function deductOrderStock(tx: Prisma.TransactionClient, items: OrderStockItem[], context: StockContext, reason: string) {
  const grouped = aggregate(items);
  for (const [productId, item] of grouped.products) {
    const result = await tx.product.updateMany({ where: { id: productId, stock: { gte: item.quantity } }, data: { stock: { decrement: item.quantity } } });
    if (result.count !== 1) throw new Error(`Insufficient product stock for order ${context.orderNumber}`);
    await tx.inventory.upsert({
      where: { productId },
      update: { currentStock: { decrement: item.quantity } },
      create: { productId, currentStock: item.stock - item.quantity, minStockLevel: item.lowStockThreshold }
    });
    await tx.inventoryLog.create({
      data: {
        productId,
        type: "ORDER_REDUCTION",
        quantity: -item.quantity,
        previousStock: item.stock,
        newStock: item.stock - item.quantity,
        reason,
        orderId: context.orderId,
        actorId: context.actorId
      }
    });
  }
  for (const [variantId, item] of grouped.variants) {
    const result = await tx.productVariant.updateMany({ where: { id: variantId, isActive: true, stock: { gte: item.quantity } }, data: { stock: { decrement: item.quantity } } });
    if (result.count !== 1) throw new Error(`Insufficient variant stock for order ${context.orderNumber}`);
  }
}
