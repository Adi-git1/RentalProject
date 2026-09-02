import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayISO } from "@/lib/date";
import type {
  BlockedDateRow,
  ItemPhotoRow,
  ItemRow,
} from "@/lib/database.types";

export interface InventoryRow extends ItemRow {
  photoCount: number;
  coverUrl: string | null;
  upcomingBookings: number;
}

export async function listInventory(): Promise<InventoryRow[]> {
  const admin = createAdminClient();
  const today = todayISO();

  const [{ data: items }, { data: photos }, { data: bookingItems }] = await Promise.all([
    admin.from("items").select("*").order("created_at", { ascending: false }),
    admin.from("item_photos").select("item_id, url, sort"),
    admin
      .from("booking_items")
      .select("item_id, bookings!inner(status, end_date)")
      .in("bookings.status", ["confirmed", "picked_up"])
      .gte("bookings.end_date", today),
  ]);

  const coverByItem = new Map<string, { url: string; sort: number }>();
  const countByItem = new Map<string, number>();
  for (const p of photos ?? []) {
    countByItem.set(p.item_id, (countByItem.get(p.item_id) ?? 0) + 1);
    const cur = coverByItem.get(p.item_id);
    if (!cur || p.sort < cur.sort) coverByItem.set(p.item_id, { url: p.url, sort: p.sort });
  }

  const bookingsByItem = new Map<string, number>();
  for (const bi of bookingItems ?? []) {
    bookingsByItem.set(bi.item_id, (bookingsByItem.get(bi.item_id) ?? 0) + 1);
  }

  return (items ?? []).map((item) => ({
    ...item,
    photoCount: countByItem.get(item.id) ?? 0,
    coverUrl: coverByItem.get(item.id)?.url ?? null,
    upcomingBookings: bookingsByItem.get(item.id) ?? 0,
  }));
}

export interface InventoryDetail {
  item: ItemRow;
  photos: ItemPhotoRow[];
  blockedDates: BlockedDateRow[];
}

export async function getInventoryDetail(id: string): Promise<InventoryDetail | null> {
  const admin = createAdminClient();
  const { data: item } = await admin.from("items").select("*").eq("id", id).single();
  if (!item) return null;

  const [{ data: photos }, { data: blockedDates }] = await Promise.all([
    admin.from("item_photos").select("*").eq("item_id", id).order("sort"),
    admin.from("blocked_dates").select("*").eq("item_id", id).order("start_date"),
  ]);

  return {
    item,
    photos: photos ?? [],
    blockedDates: blockedDates ?? [],
  };
}
