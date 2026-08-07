import type { DeliveryRule } from "@prisma/client";

export type DeliveryInput = {
  city: string;
  area?: string;
  subtotal: number;
  totalWeightKg: number;
  hasHeavyItem: boolean;
  hasBulkyItem?: boolean;
  quantity?: number;
  zone?: string;
  sameDay?: boolean;
  storePickup?: boolean;
};

export type DeliveryQuote = {
  charge: number;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  ruleName: string;
};

function minimumCustomerDelivery(min: number, max: number): Pick<DeliveryQuote, "estimatedDaysMin" | "estimatedDaysMax"> {
  const estimatedDaysMin = Math.max(3, min);
  return {
    estimatedDaysMin,
    estimatedDaysMax: Math.max(estimatedDaysMin, max)
  };
}

export function calculateFallbackDelivery(input: DeliveryInput): DeliveryQuote {
  const lahore = input.city.trim().toLowerCase() === "lahore";
  const standard = lahore ? 180 : 250;
  const heavy = input.hasHeavyItem ? 450 : 0;
  const bulky = input.hasBulkyItem ? 650 : 0;
  const free = input.subtotal >= 25000;

  const estimate = minimumCustomerDelivery(lahore ? 1 : 2, lahore ? 2 : 5);

  return {
    charge: free ? 0 : standard + heavy + bulky,
    ...estimate,
    ruleName: "Default fallback delivery"
  };
}

export function calculateDelivery(input: DeliveryInput, rules: DeliveryRule[]): DeliveryQuote {
  if (input.storePickup) {
    return { charge: 0, estimatedDaysMin: 0, estimatedDaysMax: 0, ruleName: "Store pickup" };
  }

  const active = rules.filter((rule) => rule.isActive);
  const city = input.city.trim().toLowerCase();
  const area = input.area?.trim().toLowerCase();
  const zone = input.zone?.trim().toLowerCase();
  const quantity = input.quantity || 0;
  const candidates = active
    .filter((rule) => !rule.city || rule.city.toLowerCase() === city)
    .filter((rule) => !rule.area || rule.area.toLowerCase() === area)
    .filter((rule) => !rule.zone || rule.zone.toLowerCase() === zone)
    .filter((rule) => rule.minWeightKg === null || rule.minWeightKg === undefined || input.totalWeightKg >= Number(rule.minWeightKg))
    .filter((rule) => rule.maxWeightKg === null || rule.maxWeightKg === undefined || input.totalWeightKg <= Number(rule.maxWeightKg))
    .filter((rule) => rule.minQuantity === null || rule.minQuantity === undefined || quantity >= rule.minQuantity)
    .filter((rule) => rule.maxQuantity === null || rule.maxQuantity === undefined || quantity <= rule.maxQuantity)
    .sort((a, b) => {
      const score = (rule: DeliveryRule) =>
        (rule.area ? 80 : 0) +
        (rule.city ? 40 : 0) +
        (rule.zone ? 25 : 0) +
        (rule.minWeightKg || rule.maxWeightKg ? 14 : 0) +
        (rule.minQuantity || rule.maxQuantity ? 8 : 0);
      return score(b) - score(a);
    });

  const rule = candidates[0] || active[0];
  if (!rule) return { charge: 0, estimatedDaysMin: 3, estimatedDaysMax: 5, ruleName: "No delivery rule" };

  const freeThreshold = rule.freeDeliveryThreshold ? Number(rule.freeDeliveryThreshold) : undefined;
  const free = freeThreshold !== undefined && input.subtotal >= freeThreshold;
  const heavy = input.hasHeavyItem ? Number(rule.heavyItemCharge) : 0;
  const bulky = input.hasBulkyItem ? Number(rule.bulkyItemCharge) : 0;
  const sameDay = input.sameDay && rule.sameDayDeliveryEnabled ? Number(rule.sameDayCharge) : 0;
  const quantityCharge = input.quantity && rule.minQuantity && input.quantity >= rule.minQuantity ? Number(rule.baseCharge) : 0;
  const standard = Number(rule.standardCharge || rule.baseCharge);
  const charge = free ? 0 : standard + quantityCharge + heavy + bulky + sameDay;

  const estimate = minimumCustomerDelivery(rule.estimatedDaysMin, rule.estimatedDaysMax);

  return {
    charge,
    ...estimate,
    ruleName: rule.name
  };
}
