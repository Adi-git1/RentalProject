import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** Statuses that consume inventory for a date range. */
export const BLOCKING_STATUSES = ["confirmed", "picked_up"] as const;

export interface Availability {
  itemId: string;
  quantity: number;
  bookedQty: number;
  blocked: boolean;
  availableQty: number;
}

/**
 * Availability for a set of items over an inclusive [start, end] range.
 * Mirrors the SQL function public.item_available_qty:
 *   available = quantity − booked − (quantity if any blocked overlap)
 * "booked" counts confirmed/picked_up plus pending bookings < 20 min old
 * (soft hold to avoid checkout races).
 */
export async function getAvailability(
  itemIds: string[],
  startISO: string,
  endISO: string,
): Promise<Map<string, Availability>> {
  const admin = createAdminClient();
  const result = new Map<string, Availability>();
  if (itemIds.length === 0) return result;

  const [{ data: items }, { data: bookingItems }, { data: blocks }] =
    await Promise.all([
      admin.from("items").select("id, quantity").in("id", itemIds),
      admin
        .from("booking_items")
        .select("item_id, qty, bookings!inner(status, start_date, end_date, created_at)")
        .in("item_id", itemIds)
        .lte("bookings.start_date", endISO)
        .gte("bookings.end_date", startISO),
      admin
        .from("blocked_dates")
        .select("item_id")
        .in("item_id", itemIds)
        .lte("start_date", endISO)
        .gte("end_date", startISO),
    ]);

  const cutoff = Date.now() - 20 * 60 * 1000;
  const bookedByItem = new Map<string, number>();
  type Joined = {
    item_id: string;
    qty: number;
    bookings: { status: string; created_at: string } | { status: string; created_at: string }[];
  };
  for (const row of (bookingItems ?? []) as Joined[]) {
    const b = Array.isArray(row.bookings) ? row.bookings[0] : row.bookings;
    if (!b) continue;
    const counts =
      BLOCKING_STATUSES.includes(b.status as (typeof BLOCKING_STATUSES)[number]) ||
      (b.status === "pending" && Date.parse(b.created_at) > cutoff);
    if (counts) {
      bookedByItem.set(row.item_id, (bookedByItem.get(row.item_id) ?? 0) + row.qty);
    }
  }

  const blockedItems = new Set((blocks ?? []).map((b) => b.item_id));

  for (const item of items ?? []) {
    const bookedQty = bookedByItem.get(item.id) ?? 0;
    const blocked = blockedItems.has(item.id);
    const availableQty = Math.max(
      0,
      item.quantity - bookedQty - (blocked ? item.quantity : 0),
    );
    result.set(item.id, {
      itemId: item.id,
      quantity: item.quantity,
      bookedQty,
      blocked,
      availableQty,
    });
  }

  return result;
}

export async function getAvailableQty(
  itemId: string,
  startISO: string,
  endISO: string,
): Promise<number> {
  const map = await getAvailability([itemId], startISO, endISO);
  return map.get(itemId)?.availableQty ?? 0;
}
