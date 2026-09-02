import Link from "next/link";
import Image from "next/image";
import { BookingStatusBadge } from "@/components/booking-status";
import { formatRange } from "@/lib/date";
import { formatUsd } from "@/lib/money";
import type { BookingDetail } from "@/lib/bookings";

export function BookingCard({ booking }: { booking: BookingDetail }) {
  const photos = booking.items.map((i) => i.item.photo).filter(Boolean).slice(0, 3) as string[];

  return (
    <Link
      href={`/account/bookings/${booking.id}`}
      className="flex items-center gap-4 rounded-[var(--radius-card)] border border-line bg-white p-4 transition-shadow hover:shadow-sm"
    >
      <div className="flex -space-x-3">
        {photos.length > 0 ? (
          photos.map((p, i) => (
            <div
              key={i}
              className="relative h-12 w-12 overflow-hidden rounded-full border-2 border-white bg-surface"
            >
              <Image src={p} alt="" fill sizes="48px" className="object-cover" />
            </div>
          ))
        ) : (
          <div className="h-12 w-12 rounded-full bg-surface" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <BookingStatusBadge status={booking.status} />
          <span className="text-xs text-muted">
            {booking.items.reduce((n, i) => n + i.qty, 0)} item
            {booking.items.reduce((n, i) => n + i.qty, 0) === 1 ? "" : "s"}
          </span>
        </div>
        <p className="mt-1 truncate text-sm font-medium text-ink">
          {booking.items.map((i) => i.item.name).join(", ")}
        </p>
        <p className="text-xs text-muted">
          {formatRange(booking.start_date, booking.end_date)} ·{" "}
          {booking.fulfillment === "delivery" ? "Delivery" : "Pickup"}
        </p>
      </div>
      <div className="text-right text-sm font-semibold text-ink">
        {formatUsd(Number(booking.total))}
      </div>
    </Link>
  );
}
