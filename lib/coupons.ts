import { prisma } from "@/lib/prisma";

export type CouponLine = {
  productId: string;
  categoryId: string;
  unitPrice: number;
  quantity: number;
};

export type CouponValidationResult =
  | {
      valid: true;
      code: string;
      discount: number;
      freeDelivery: boolean;
      description: string | null;
      couponId: string;
    }
  | {
      valid: false;
      code: string;
      error: string;
    };

export async function validateCoupon(input: {
  code: string;
  userId?: string | null;
  customerPhone?: string | null;
  adjustedSubtotal: number;
  lines: CouponLine[];
}): Promise<CouponValidationResult> {
  const code = input.code.trim().toUpperCase();
  if (!code) return { valid: false, code, error: "Enter a coupon code." };

  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon) return { valid: false, code, error: "Coupon code was not found." };

  const now = new Date();
  if (!coupon.isActive) return { valid: false, code, error: "This coupon is inactive." };
  if (coupon.startsAt > now) return { valid: false, code, error: "This coupon is not active yet." };
  if (coupon.expiresAt && coupon.expiresAt < now) return { valid: false, code, error: "This coupon has expired." };
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    return { valid: false, code, error: "This coupon has reached its usage limit." };
  }
  if (coupon.customerId && coupon.customerId !== input.userId) {
    return { valid: false, code, error: "This coupon is not available for this customer." };
  }
  if (input.adjustedSubtotal < Number(coupon.minOrderAmount)) {
    return {
      valid: false,
      code,
      error: `Minimum order amount is Rs ${Number(coupon.minOrderAmount).toLocaleString("en-PK")}.`
    };
  }
  if (coupon.productId && !input.lines.some((line) => line.productId === coupon.productId)) {
    return { valid: false, code, error: "This coupon does not apply to the selected products." };
  }
  if (coupon.categoryId && !input.lines.some((line) => line.categoryId === coupon.categoryId)) {
    return { valid: false, code, error: "This coupon does not apply to the selected categories." };
  }

  if (coupon.perCustomerLimit) {
    if (!input.userId && !input.customerPhone) {
      return { valid: false, code, error: "Enter your phone number before applying this coupon." };
    }
    const customerUses = await prisma.order.count({
      where: {
        couponCode: code,
        ...(input.userId ? { userId: input.userId } : { customerPhone: input.customerPhone || "" })
      }
    });
    if (customerUses >= coupon.perCustomerLimit) {
      return { valid: false, code, error: "You have already used this coupon the maximum number of times." };
    }
  }

  const eligibleSubtotal = coupon.productId || coupon.categoryId
    ? input.lines
        .filter((line) => (!coupon.productId || line.productId === coupon.productId) && (!coupon.categoryId || line.categoryId === coupon.categoryId))
        .reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)
    : input.adjustedSubtotal;
  const rawDiscount = Number(coupon.amountOff || 0)
    + (Number(coupon.percentOff || 0) > 0 ? eligibleSubtotal * (Number(coupon.percentOff) / 100) : 0);
  const maxDiscount = coupon.maxDiscount === null ? rawDiscount : Number(coupon.maxDiscount);
  const discount = Math.min(rawDiscount, maxDiscount, input.adjustedSubtotal);

  return {
    valid: true,
    code,
    discount: Math.max(0, discount),
    freeDelivery: coupon.freeDelivery,
    description: coupon.description,
    couponId: coupon.id
  };
}
