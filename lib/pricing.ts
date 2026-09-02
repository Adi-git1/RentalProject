/**
 * Pricing engine. Pure functions — no I/O. All amounts are integer cents.
 *
 * Rule (from project blueprint):
 *   Total for N days = best of:
 *     - N × day price
 *     - weekend price, when the whole range is a Fri–Sun weekend (N ≤ 3)
 *     - week price × ceil(N/7)
 *   Delivery fee added if delivery chosen (free over threshold).
 *   Sales tax applied to (rental + delivery).
 *   Deposit is a separate card hold, never part of the charge.
 */
import { toCents } from "./money";

export type PriceMethod = "daily" | "weekend" | "weekly";

export interface ItemPriceInput {
  priceDay: number | string;
  priceWeekend?: number | string | null;
  priceWeek?: number | string | null;
}

export interface ItemPriceResult {
  days: number;
  unitCents: number;
  method: PriceMethod;
  methodLabel: string;
}

/** Inclusive day count between two ISO dates (YYYY-MM-DD). */
export function rentalDays(startISO: string, endISO: string): number {
  const start = Date.parse(`${startISO}T00:00:00Z`);
  const end = Date.parse(`${endISO}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.round((end - start) / 86_400_000) + 1;
}

/** True when every day in the inclusive range is Fri, Sat or Sun. */
export function isWeekendRange(startISO: string, endISO: string): boolean {
  const days = rentalDays(startISO, endISO);
  if (days === 0 || days > 3) return false;
  const start = new Date(`${startISO}T00:00:00Z`);
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * 86_400_000).getUTCDay(); // 0 Sun … 6 Sat
    if (d !== 0 && d !== 5 && d !== 6) return false;
  }
  return true;
}

/** Best (cheapest) price for one unit of an item over the whole range. */
export function computeItemPrice(
  input: ItemPriceInput,
  startISO: string,
  endISO: string,
): ItemPriceResult {
  const days = rentalDays(startISO, endISO);
  const dayCents = toCents(input.priceDay);
  const weekendCents = input.priceWeekend != null ? toCents(input.priceWeekend) : null;
  const weekCents = input.priceWeek != null ? toCents(input.priceWeek) : null;

  const candidates: { method: PriceMethod; cents: number; label: string }[] = [
    { method: "daily", cents: dayCents * days, label: `${days} day${days === 1 ? "" : "s"} × daily rate` },
  ];

  if (weekendCents != null && isWeekendRange(startISO, endISO)) {
    candidates.push({ method: "weekend", cents: weekendCents, label: "Weekend rate (Fri–Sun)" });
  }

  if (weekCents != null && days >= 1) {
    const weeks = Math.ceil(days / 7);
    candidates.push({
      method: "weekly",
      cents: weekCents * weeks,
      label: `${weeks} week${weeks === 1 ? "" : "s"} × weekly rate`,
    });
  }

  const best = candidates.reduce((a, b) => (b.cents < a.cents ? b : a));
  return { days, unitCents: best.cents, method: best.method, methodLabel: best.label };
}

export interface QuoteLineInput {
  itemId: string;
  name: string;
  qty: number;
  priceDay: number | string;
  priceWeekend?: number | string | null;
  priceWeek?: number | string | null;
  deposit: number | string;
}

export interface QuoteLine {
  itemId: string;
  name: string;
  qty: number;
  days: number;
  unitCents: number;
  lineCents: number;
  method: PriceMethod;
  methodLabel: string;
  depositCents: number;
}

export interface QuoteSettings {
  deliveryFee: number | string;
  freeDeliveryThreshold: number | string;
  taxRate: number | string;
}

export interface Quote {
  startISO: string;
  endISO: string;
  days: number;
  fulfillment: "pickup" | "delivery";
  lines: QuoteLine[];
  subtotalCents: number;
  deliveryFeeCents: number;
  taxRate: number;
  taxCents: number;
  totalCents: number;
  depositTotalCents: number;
}

export function computeQuote(
  lines: QuoteLineInput[],
  startISO: string,
  endISO: string,
  fulfillment: "pickup" | "delivery",
  settings: QuoteSettings,
): Quote {
  const quoteLines: QuoteLine[] = lines.map((l) => {
    const price = computeItemPrice(l, startISO, endISO);
    const qty = Math.max(1, Math.floor(l.qty));
    return {
      itemId: l.itemId,
      name: l.name,
      qty,
      days: price.days,
      unitCents: price.unitCents,
      lineCents: price.unitCents * qty,
      method: price.method,
      methodLabel: price.methodLabel,
      depositCents: toCents(l.deposit) * qty,
    };
  });

  const subtotalCents = quoteLines.reduce((s, l) => s + l.lineCents, 0);
  const depositTotalCents = quoteLines.reduce((s, l) => s + l.depositCents, 0);

  const feeCents = toCents(settings.deliveryFee);
  const thresholdCents = toCents(settings.freeDeliveryThreshold);
  const deliveryFeeCents =
    fulfillment === "delivery" && subtotalCents < thresholdCents ? feeCents : 0;

  const taxRate = Number(settings.taxRate) || 0;
  const taxCents = Math.round((subtotalCents + deliveryFeeCents) * taxRate);
  const totalCents = subtotalCents + deliveryFeeCents + taxCents;

  return {
    startISO,
    endISO,
    days: rentalDays(startISO, endISO),
    fulfillment,
    lines: quoteLines,
    subtotalCents,
    deliveryFeeCents,
    taxRate,
    taxCents,
    totalCents,
    depositTotalCents,
  };
}
