import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  BookingItemRow,
  BookingRow,
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
  const row = data as Raw;

  const items: BookingItemDetail[] = (row.booking_items ?? []).map((bi) => {
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

  const { booking_items, ...booking } = row;
  void booking_items;
  return { ...booking, items };
}

export async function listUserBookings(userId: string): Promise<BookingDetail[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("bookings")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const ids = (data ?? []).map((b) => b.id);
  const details = await Promise.all(ids.map((id) => getBookingDetail(id)));
  return details.filter((b): b is BookingDetail => b !== null);
}
