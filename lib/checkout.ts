import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAvailability } from "@/lib/availability";
import { computeQuote, type Quote } from "@/lib/pricing";
import { checkDeliveryAddress } from "@/lib/geo";
import { validateRange } from "@/lib/date";
import { getSettings } from "@/lib/data";
import type { DeliveryAddress, ItemRow } from "@/lib/database.types";

export interface CartLineInput {
  itemId: string;
  qty: number;
}

export interface ServerQuoteOk {
  ok: true;
  quote: Quote;
  items: Pick<ItemRow, "id" | "name" | "price_day" | "price_weekend" | "price_week" | "deposit">[];
  deliveryDistanceMiles: number | null;
  formattedAddress: string | null;
}

export interface ServerQuoteErr {
  ok: false;
  error: string;
  field?: string;
}

export async function buildServerQuote(params: {
  lines: CartLineInput[];
  startISO: string;
  endISO: string;
  fulfillment: "pickup" | "delivery";
  deliveryAddress?: DeliveryAddress;
}): Promise<ServerQuoteOk | ServerQuoteErr> {
  const { lines, startISO, endISO, fulfillment, deliveryAddress } = params;
  const settings = await getSettings();

  const rangeError = validateRange(startISO, endISO, settings.min_rental_days);
  if (rangeError) return { ok: false, error: rangeError, field: "dates" };

  const admin = createAdminClient();
  const ids = [...new Set(lines.map((l) => l.itemId))];
  const { data: items } = await admin
    .from("items")
    .select("*")
    .in("id", ids)
    .eq("active", true);

  if (!items || items.length !== ids.length) {
    return { ok: false, error: "One or more items are no longer available." };
  }

  const availability = await getAvailability(ids, startISO, endISO);
  for (const line of lines) {
    const item = items.find((i) => i.id === line.itemId)!;
    const avail = availability.get(line.itemId)?.availableQty ?? 0;
    if (line.qty > avail) {
      return {
        ok: false,
        error:
          avail <= 0
            ? `"${item.name}" is fully booked for those dates.`
            : `Only ${avail} of "${item.name}" available for those dates (you asked for ${line.qty}).`,
        field: "availability",
      };
    }
  }

  let deliveryDistanceMiles: number | null = null;
  let formattedAddress: string | null = null;
  if (fulfillment === "delivery") {
    if (!deliveryAddress) {
      return { ok: false, error: "Enter a delivery address.", field: "deliveryAddress" };
    }
    const addr = `${deliveryAddress.line1}, ${deliveryAddress.city}, ${deliveryAddress.state} ${deliveryAddress.postal_code}`;
    const check = await checkDeliveryAddress(
      addr,
      Number(settings.delivery_radius_miles),
      settings.pickup_address,
    );
    if (!check.ok) {
      return { ok: false, error: check.reason ?? "We can't deliver to that address.", field: "deliveryAddress" };
    }
    deliveryDistanceMiles = check.distanceMiles;
    formattedAddress = addr;
  }

  const quote = computeQuote(
    lines.map((l) => {
      const item = items.find((i) => i.id === l.itemId)!;
      return {
        itemId: item.id,
        name: item.name,
        qty: l.qty,
        priceDay: item.price_day,
        priceWeekend: item.price_weekend,
        priceWeek: item.price_week,
        deposit: item.deposit,
      };
    }),
    startISO,
    endISO,
    fulfillment,
    {
      deliveryFee: settings.delivery_fee,
      freeDeliveryThreshold: settings.free_delivery_threshold,
      taxRate: settings.tax_rate,
    },
  );

  return {
    ok: true,
    quote,
    items: items.map((i) => ({
      id: i.id,
      name: i.name,
      price_day: i.price_day,
      price_weekend: i.price_weekend,
      price_week: i.price_week,
      deposit: i.deposit,
    })),
    deliveryDistanceMiles,
    formattedAddress,
  };
}
