import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDaysISO, todayISO } from "@/lib/date";
import type { BookingRow } from "@/lib/database.types";

export interface DashboardData {
  today: string;
  pickupsToday: BookingSummary[];
  returnsToday: BookingSummary[];
  pickupsThisWeek: BookingSummary[];
  returnsThisWeek: BookingSummary[];
  revenueThisMonthCents: number;
  refundsThisMonthCents: number;
  pendingCount: number;
  confirmedCount: number;
  outCount: number;
  heldDepositsCents: number;
}

export interface BookingSummary {
  id: string;
  status: string;
  start_date: string;
  end_date: string;
  fulfillment: string;
  contact_name: string | null;
  total: number;
  itemsLabel: string;
}

async function summarize(rows: BookingRow[]): Promise<BookingSummary[]> {
  if (rows.length === 0) return [];
  const admin = createAdminClient();
  const { data: items } = await admin
    .from("booking_items")
    .select("booking_id, qty, items(name)")
    .in(
      "booking_id",
      rows.map((r) => r.id),
    );
  const byBooking = new Map<string, string[]>();
  type Row = { booking_id: string; qty: number; items: { name: string } | null };
  for (const bi of (items ?? []) as Row[]) {
    const arr = byBooking.get(bi.booking_id) ?? [];
    arr.push(`${bi.items?.name ?? "Item"}${bi.qty > 1 ? ` ×${bi.qty}` : ""}`);
    byBooking.set(bi.booking_id, arr);
  }
  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    start_date: r.start_date,
    end_date: r.end_date,
    fulfillment: r.fulfillment,
    contact_name: r.contact_name,
    total: Number(r.total),
    itemsLabel: (byBooking.get(r.id) ?? []).join(", "),
  }));
}

export async function getDashboard(): Promise<DashboardData> {
  const admin = createAdminClient();
  const today = todayISO();
  const weekEnd = addDaysISO(today, 7);
  const monthStart = today.slice(0, 8) + "01";

  const [
    { data: pickupsToday },
    { data: returnsToday },
    { data: pickupsWeek },
    { data: returnsWeek },
    { data: monthBookings },
    { data: pendingRows },
    { data: confirmedRows },
    { data: outRows },
    { data: heldRows },
  ] = await Promise.all([
    admin.from("bookings").select("*").eq("status", "confirmed").eq("start_date", today),
    admin
      .from("bookings")
      .select("*")
      .in("status", ["confirmed", "picked_up"])
      .eq("end_date", today),
    admin
      .from("bookings")
      .select("*")
      .eq("status", "confirmed")
      .gt("start_date", today)
      .lte("start_date", weekEnd),
    admin
      .from("bookings")
      .select("*")
      .in("status", ["confirmed", "picked_up"])
      .gt("end_date", today)
      .lte("end_date", weekEnd),
    admin
      .from("bookings")
      .select("total, amount_refunded, created_at, status")
      .gte("created_at", monthStart)
      .in("status", ["confirmed", "picked_up", "returned"]),
    admin.from("bookings").select("id").eq("status", "pending"),
    admin.from("bookings").select("id").eq("status", "confirmed"),
    admin.from("bookings").select("id").eq("status", "picked_up"),
    admin.from("bookings").select("deposit_total").eq("deposit_status", "held"),
  ]);

  const revenueThisMonthCents = (monthBookings ?? []).reduce(
    (s, b) => s + Math.round(Number(b.total) * 100),
    0,
  );
  const refundsThisMonthCents = (monthBookings ?? []).reduce(
    (s, b) => s + Math.round(Number(b.amount_refunded) * 100),
    0,
  );
  const heldDepositsCents = (heldRows ?? []).reduce(
    (s, b) => s + Math.round(Number(b.deposit_total) * 100),
    0,
  );

  return {
    today,
    pickupsToday: await summarize(pickupsToday ?? []),
    returnsToday: await summarize(returnsToday ?? []),
    pickupsThisWeek: await summarize(pickupsWeek ?? []),
    returnsThisWeek: await summarize(returnsWeek ?? []),
    revenueThisMonthCents,
    refundsThisMonthCents,
    pendingCount: (pendingRows ?? []).length,
    confirmedCount: (confirmedRows ?? []).length,
    outCount: (outRows ?? []).length,
    heldDepositsCents,
  };
}
