/**
 * Hand-maintained database types (kept in sync with supabase/migrations).
 * Regenerate with `npx supabase gen types typescript` once the CLI is linked.
 */

export type UserRole = "customer" | "admin";
export type BookingStatus =
  | "pending"
  | "confirmed"
  | "picked_up"
  | "returned"
  | "cancelled";
export type FulfillmentType = "pickup" | "delivery";
export type DepositStatus = "none" | "held" | "released" | "captured";

export type DeliveryAddress = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  formatted?: string;
}

export type UserRow = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export type ItemRow = {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  specs: Record<string, string>;
  dimensions: string | null;
  weight: string | null;
  price_day: number;
  price_weekend: number | null;
  price_week: number | null;
  deposit: number;
  quantity: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type ItemPhotoRow = {
  id: string;
  item_id: string;
  url: string;
  sort: number;
  created_at: string;
}

export type BlockedDateRow = {
  id: string;
  item_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  created_at: string;
}

export type BookingRow = {
  id: string;
  user_id: string | null;
  status: BookingStatus;
  start_date: string;
  end_date: string;
  fulfillment: FulfillmentType;
  delivery_address: DeliveryAddress | null;
  delivery_distance_miles: number | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  subtotal: number;
  delivery_fee: number;
  tax_rate: number;
  tax: number;
  deposit_total: number;
  total: number;
  currency: string;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  deposit_payment_intent_id: string | null;
  deposit_status: DepositStatus;
  amount_refunded: number;
  terms_accepted_at: string | null;
  notes: string | null;
  reminder_pickup_sent_at: string | null;
  reminder_return_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export type BookingItemRow = {
  id: string;
  booking_id: string;
  item_id: string;
  qty: number;
  unit_price_snapshot: number;
  line_total: number;
  created_at: string;
}

export type SettingsRow = {
  id: number;
  business_name: string;
  logo_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  pickup_address: string;
  hours: Record<string, string>;
  delivery_radius_miles: number;
  delivery_fee: number;
  free_delivery_threshold: number;
  min_rental_days: number;
  tax_rate: number;
  cancellation_policy: string;
  late_fee_policy: string;
  terms_text: string;
  updated_at: string;
}

export type ReviewRow = {
  id: string;
  item_id: string;
  user_id: string;
  booking_id: string | null;
  rating: number;
  text: string;
  created_at: string;
}

type Tbl<Row, Rels extends readonly unknown[] = []> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: Rels;
};

type Rel<Col extends string, Ref extends string, OneToOne extends boolean = false> = {
  foreignKeyName: string;
  columns: [Col];
  isOneToOne: OneToOne;
  referencedRelation: Ref;
  referencedColumns: ["id"];
};

/** Shape compatible with @supabase/supabase-js's GenericSchema. */
export type Database = {
  public: {
    Tables: {
      users: Tbl<UserRow>;
      items: Tbl<ItemRow>;
      item_photos: Tbl<ItemPhotoRow, [Rel<"item_id", "items">]>;
      blocked_dates: Tbl<BlockedDateRow, [Rel<"item_id", "items">]>;
      bookings: Tbl<BookingRow, [Rel<"user_id", "users">]>;
      booking_items: Tbl<
        BookingItemRow,
        [Rel<"booking_id", "bookings">, Rel<"item_id", "items">]
      >;
      settings: Tbl<SettingsRow>;
      reviews: Tbl<
        ReviewRow,
        [Rel<"item_id", "items">, Rel<"user_id", "users">, Rel<"booking_id", "bookings">]
      >;
      admin_allowlist: Tbl<{ email: string }>;
    };
    Views: Record<string, never>;
    Functions: {
      item_available_qty: {
        Args: { p_item_id: string; p_start: string; p_end: string };
        Returns: number;
      };
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: {
      user_role: UserRole;
      booking_status: BookingStatus;
      fulfillment_type: FulfillmentType;
      deposit_status: DepositStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
