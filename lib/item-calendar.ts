import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDaysISO, todayISO } from "@/lib/date";
import { BLOCKING_STATUSES } from "@/lib/availability";

/**
 * Per-day unavailability for an item over the next `horizonDays` days.
 * A date is "full" when booked (confirmed/picked_up) + blocked >= quantity.
 * Returned as ISO date strings the client turns into disabled calendar days.
 */
export async function getItemFullyBookedDates(
  itemId: string,
  quantity: number,
  horizonDays = 365,
): Promise<string[]> {
  const admin = createAdminClient();
  const start = todayISO();
  const end = addDaysISO(start, horizonDays);

  const [{ data: bookingItems }, { data: blocks }] = await Promise.all([
    admin
      .from("booking_items")
      .select("qty, bookings!inner(status, start_date, end_date)")
      .eq("item_id", itemId)
      .lte("bookings.start_date", end)
      .gte("bookings.end_date", start),
    admin
      .from("blocked_dates")
      .select("start_date, end_date")
      .eq("item_id", itemId)
      .lte("start_date", end)
      .gte("end_date", start),
  ]);

  // running count of consumed units per ISO day
  const consumed = new Map<string, number>();
  const bump = (from: string, to: string, by: number) => {
    let d = from < start ? start : from;
    const last = to > end ? end : to;
    while (d <= last) {
      consumed.set(d, (consumed.get(d) ?? 0) + by);
      d = addDaysISO(d, 1);
    }
  };

  type Joined = {
    qty: number;
    bookings:
      | { status: string; start_date: string; end_date: string }
      | { status: string; start_date: string; end_date: string }[];
  };
  for (const row of (bookingItems ?? []) as Joined[]) {
    const b = Array.isArray(row.bookings) ? row.bookings[0] : row.bookings;
    if (!b) continue;
    if (!BLOCKING_STATUSES.includes(b.status as (typeof BLOCKING_STATUSES)[number])) continue;
    bump(b.start_date, b.end_date, row.qty);
  }
  for (const b of blocks ?? []) {
    bump(b.start_date, b.end_date, quantity); // a block removes the whole item
  }

  const full: string[] = [];
  for (const [day, count] of consumed) {
    if (count >= quantity) full.push(day);
  }
  return full.sort();
}
