import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  BookingItemRow,
  BookingRow,
  BookingStatus,
  ItemPhotoRow,
} from "@/lib/database.types";

export interface BookingItemDetail extends BookingItemRow {
  item: {
    id: string;
    name: string;
    slug: string;
    photo: string | null;
  };
}

export interface BookingDetail extends BookingRow {
  items: BookingItemDetail[];
}

export async function getBookingDetail(id: string): Promise<BookingDetail | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("bookings")
    .select("*, booking_items(*, items(id, name, slug, item_photos(url, sort)))")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return assemble(data);
}

function assemble(row: unknown): BookingDetail {
  type Raw = BookingRow & {
    booking_items: (BookingItemRow & {
      items: {
        id: string;
        name: string;
        slug: string;
        item_photos: Pick<ItemPhotoRow, "url" | "sort">[];
      } | null;
    })[];
  };
  const r = row as Raw;
  const items: BookingItemDetail[] = (r.booking_items ?? []).map((bi) => {
    const photos = [...(bi.items?.item_photos ?? [])].sort((a, b) => a.sort - b.sort);
    return {
      ...bi,
      item: {
        id: bi.items?.id ?? bi.item_id,
        name: bi.items?.name ?? "Item",
        slug: bi.items?.slug ?? "",
        photo: photos[0]?.url ?? null,
      },
    };
  });
  const { booking_items, ...booking } = r;
  void booking_items;
  return { ...booking, items };
}

export async function listBookings(opts: {
  status?: BookingStatus[];
  limit?: number;
} = {}): Promise<BookingDetail[]> {
  const admin = createAdminClient();
  let query = admin
    .from("bookings")
    .select("*, booking_items(*, items(id, name, slug, item_photos(url, sort)))")
    .order("start_date", { ascending: false })
    .limit(opts.limit ?? 200);
  if (opts.status?.length) query = query.in("status", opts.status);
  const { data } = await query;
  return (data ?? []).map(assemble);
}

export async function listUserBookings(userId: string): Promise<BookingDetail[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("bookings")
    .select("*, booking_items(*, items(id, name, slug, item_photos(url, sort)))")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []).map(assemble);
}
