import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  ItemPhotoRow,
  ItemRow,
  ReviewRow,
  SettingsRow,
} from "@/lib/database.types";

export const DEFAULT_SETTINGS: SettingsRow = {
  id: 1,
  business_name: "AnyTimeRental",
  logo_url: null,
  contact_email: null,
  contact_phone: null,
  pickup_address: "22859 Trailing Rose Ct, Brambleton, VA 20148",
  hours: {},
  delivery_radius_miles: 30,
  delivery_fee: 50,
  free_delivery_threshold: 300,
  min_rental_days: 1,
  tax_rate: 0.06,
  cancellation_policy:
    "No refunds. All bookings are final once paid. In exceptional cases the owner may issue a manual refund.",
  late_fee_policy:
    "Late returns are charged one full day's rental rate per item for each day late, billed to the card on file.",
  terms_text:
    "By booking you agree to the rental terms: all sales are final (no refunds); you are responsible for the equipment while in your possession; late returns incur one full day's rate per item per day; the security deposit is held as a card authorization and released after the items are returned undamaged.",
  updated_at: new Date().toISOString(),
};

export const getSettings = cache(async (): Promise<SettingsRow> => {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("settings").select("*").eq("id", 1).single();
    return data ?? DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
});

export interface ItemListFilters {
  category?: string;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: "newest" | "price-asc" | "price-desc";
}

export interface ItemCard extends ItemRow {
  photo: string | null;
  rating: number | null;
  reviewCount: number;
}

export const getItems = cache(
  async (filters: ItemListFilters = {}): Promise<ItemCard[]> => {
    const supabase = await createClient();
    let query = supabase
      .from("items")
      .select("*, item_photos(url, sort), reviews(rating)")
      .eq("active", true);

    if (filters.category) query = query.eq("category", filters.category);
    if (filters.q) query = query.ilike("name", `%${filters.q}%`);
    if (filters.minPrice != null) query = query.gte("price_day", filters.minPrice);
    if (filters.maxPrice != null) query = query.lte("price_day", filters.maxPrice);

    switch (filters.sort) {
      case "price-asc":
        query = query.order("price_day", { ascending: true });
        break;
      case "price-desc":
        query = query.order("price_day", { ascending: false });
        break;
      default:
        query = query.order("created_at", { ascending: false });
    }

    const { data, error } = await query;
    if (error || !data) return [];

    type Raw = ItemRow & {
      item_photos: Pick<ItemPhotoRow, "url" | "sort">[];
      reviews: Pick<ReviewRow, "rating">[];
    };

    return (data as Raw[]).map((row) => {
      const photos = [...(row.item_photos ?? [])].sort((a, b) => a.sort - b.sort);
      const ratings = row.reviews ?? [];
      const rating =
        ratings.length > 0
          ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length
          : null;
      const { item_photos, reviews, ...item } = row;
      void item_photos;
      void reviews;
      return {
        ...item,
        photo: photos[0]?.url ?? null,
        rating,
        reviewCount: ratings.length,
      };
    });
  },
);

export interface ItemDetail extends ItemRow {
  photos: ItemPhotoRow[];
  reviews: (ReviewRow & { userName: string | null })[];
  rating: number | null;
}

export async function getItemBySlug(slug: string): Promise<ItemDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("items")
    .select("*, item_photos(*), reviews(*, users(name))")
    .eq("slug", slug)
    .single();

  if (error || !data) return null;

  type Raw = ItemRow & {
    item_photos: ItemPhotoRow[];
    reviews: (ReviewRow & { users: { name: string | null } | null })[];
  };
  const row = data as Raw;
  const photos = [...(row.item_photos ?? [])].sort((a, b) => a.sort - b.sort);
  const reviews = (row.reviews ?? []).map((r) => ({
    ...r,
    userName: r.users?.name ?? null,
  }));
  const rating =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : null;

  const { item_photos, reviews: _reviews, ...item } = row;
  void item_photos;
  void _reviews;
  return { ...item, photos, reviews, rating };
}

export async function getAllItemSlugs(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("items").select("slug").eq("active", true);
  return (data ?? []).map((r) => r.slug);
}
