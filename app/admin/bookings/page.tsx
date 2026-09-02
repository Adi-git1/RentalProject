import type { Metadata } from "next";
import Link from "next/link";
import { listBookings } from "@/lib/bookings";
import { BookingStatusBadge } from "@/components/booking-status";
import { BookingsCalendar } from "@/components/admin/bookings-calendar";
import { formatRange } from "@/lib/date";
import { formatUsd } from "@/lib/money";
import { BOOKING_STATUS_LABELS } from "@/lib/constants";
import type { BookingStatus } from "@/lib/database.types";

export const metadata: Metadata = { title: "Bookings · Admin" };

const FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "picked_up", label: "Out" },
  { key: "returned", label: "Returned" },
  { key: "cancelled", label: "Cancelled" },
];

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; view?: string }>;
}) {
  const { status = "all", view = "list" } = await searchParams;
  const statusFilter =
    status === "all" ? undefined : ([status] as BookingStatus[]);
  const bookings = await listBookings({ status: statusFilter });

  const calBookings = (await listBookings({ status: ["confirmed", "picked_up", "returned"] })).map(
    (b) => ({
      id: b.id,
      start_date: b.start_date,
      end_date: b.end_date,
      status: b.status,
      fulfillment: b.fulfillment,
      label: b.contact_name ?? b.items[0]?.item.name ?? "Booking",
    }),
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">Bookings</h1>
        <div className="flex gap-1 rounded-full bg-surface p-1 text-sm">
          <Link
            href="/admin/bookings?view=list"
            className={`rounded-full px-3 py-1 font-medium ${view === "list" ? "bg-white shadow-sm" : "text-muted"}`}
          >
            List
          </Link>
          <Link
            href="/admin/bookings?view=calendar"
            className={`rounded-full px-3 py-1 font-medium ${view === "calendar" ? "bg-white shadow-sm" : "text-muted"}`}
          >
            Calendar
          </Link>
        </div>
      </div>

      {view === "calendar" ? (
        <div className="mt-4">
          <BookingsCalendar bookings={calBookings} />
        </div>
      ) : (
        <>
          <div className="mt-4 flex gap-2 overflow-x-auto">
            {FILTERS.map((f) => (
              <Link
                key={f.key}
                href={`/admin/bookings?status=${f.key}`}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium ${
                  status === f.key
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-line bg-white text-ink hover:bg-surface"
                }`}
              >
                {f.label}
              </Link>
            ))}
          </div>

          <div className="mt-4 overflow-x-auto rounded-[var(--radius-card)] border border-line bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-line text-left text-xs text-muted">
                <tr>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Dates</th>
                  <th className="p-3">Items</th>
                  <th className="p-3">Fulfillment</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted">
                      No {status === "all" ? "" : BOOKING_STATUS_LABELS[status]?.toLowerCase()} bookings.
                    </td>
                  </tr>
                ) : (
                  bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-surface">
                      <td className="p-3">
                        <Link
                          href={`/admin/bookings/${b.id}`}
                          className="font-medium text-ink hover:underline"
                        >
                          {b.contact_name ?? "Customer"}
                        </Link>
                        <div className="text-xs text-muted">{b.contact_email}</div>
                      </td>
                      <td className="p-3 whitespace-nowrap text-muted">
                        {formatRange(b.start_date, b.end_date)}
                      </td>
                      <td className="p-3 text-muted">
                        {b.items.map((i) => `${i.item.name}×${i.qty}`).join(", ")}
                      </td>
                      <td className="p-3 capitalize text-muted">{b.fulfillment}</td>
                      <td className="p-3 whitespace-nowrap">{formatUsd(Number(b.total))}</td>
                      <td className="p-3">
                        <BookingStatusBadge status={b.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
