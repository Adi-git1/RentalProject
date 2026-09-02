import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/ui/primitives";
import { BookingStatusBadge, DepositStatusBadge } from "@/components/booking-status";
import { CancelButton } from "@/components/account/cancel-button";
import { requireUser } from "@/lib/auth";
import { getBookingDetail } from "@/lib/bookings";
import { getSettings } from "@/lib/data";
import { formatDateLong } from "@/lib/date";
import { formatUsd } from "@/lib/money";

export const metadata: Metadata = { title: "Booking details" };

const STEPS = ["confirmed", "picked_up", "returned"] as const;

export default async function BookingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { id } = await params;
  const { checkout } = await searchParams;
  const user = await requireUser(`/account/bookings/${id}`);
  const [booking, settings] = await Promise.all([getBookingDetail(id), getSettings()]);

  if (!booking || (booking.user_id !== user.id && user.role !== "admin")) notFound();

  const canCancel =
    ["pending", "confirmed"].includes(booking.status) &&
    booking.start_date > new Date().toISOString().slice(0, 10);
  const stepIndex = STEPS.indexOf(booking.status as (typeof STEPS)[number]);

  return (
    <Container className="max-w-2xl py-8">
      <Link href="/account" className="text-sm text-muted hover:text-ink">
        ← All bookings
      </Link>

      {checkout === "success" && (
        <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-900">
          Payment received — your booking is confirmed. A confirmation email is on its way.
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">Booking</h1>
        <div className="flex gap-2">
          <BookingStatusBadge status={booking.status} />
          <DepositStatusBadge status={booking.deposit_status} />
        </div>
      </div>
      <p className="text-xs text-muted">Ref {booking.id}</p>

      {booking.status !== "cancelled" && (
        <ol className="mt-6 flex items-center gap-2 text-xs">
          {STEPS.map((s, i) => (
            <li key={s} className="flex flex-1 items-center gap-2">
              <span
                className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-semibold ${
                  i <= stepIndex ? "bg-brand-600 text-white" : "bg-surface text-muted"
                }`}
              >
                {i + 1}
              </span>
              <span className={i <= stepIndex ? "text-ink" : "text-muted"}>
                {s === "confirmed" ? "Confirmed" : s === "picked_up" ? "Picked up" : "Returned"}
              </span>
              {i < STEPS.length - 1 && <span className="h-px flex-1 bg-line" />}
            </li>
          ))}
        </ol>
      )}

      <section className="mt-6 rounded-[var(--radius-card)] border border-line bg-white p-5">
        <h2 className="text-sm font-semibold text-ink">Rental period</h2>
        <p className="mt-1 text-sm text-muted">
          {formatDateLong(booking.start_date)} → {formatDateLong(booking.end_date)}
        </p>
        <h2 className="mt-4 text-sm font-semibold text-ink">
          {booking.fulfillment === "delivery" ? "Delivery" : "Pickup"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {booking.fulfillment === "delivery" && booking.delivery_address
            ? `${booking.delivery_address.line1}, ${booking.delivery_address.city}, ${booking.delivery_address.state} ${booking.delivery_address.postal_code}`
            : settings.pickup_address}
        </p>
      </section>

      <section className="mt-4 rounded-[var(--radius-card)] border border-line bg-white p-5">
        <h2 className="text-sm font-semibold text-ink">Items</h2>
        <ul className="mt-3 space-y-3">
          {booking.items.map((bi) => (
            <li key={bi.id} className="flex items-center gap-3">
              <div className="relative h-12 w-14 shrink-0 overflow-hidden rounded-lg bg-surface">
                {bi.item.photo && (
                  <Image src={bi.item.photo} alt="" fill sizes="56px" className="object-cover" />
                )}
              </div>
              <div className="flex-1 text-sm">
                <p className="font-medium text-ink">
                  {bi.item.slug ? (
                    <Link href={`/items/${bi.item.slug}`} className="hover:underline">
                      {bi.item.name}
                    </Link>
                  ) : (
                    bi.item.name
                  )}
                </p>
                <p className="text-xs text-muted">Qty {bi.qty}</p>
              </div>
              <span className="text-sm text-ink">{formatUsd(Number(bi.line_total))}</span>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-1 border-t border-line pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd>{formatUsd(Number(booking.subtotal))}</dd>
          </div>
          {Number(booking.delivery_fee) > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted">Delivery</dt>
              <dd>{formatUsd(Number(booking.delivery_fee))}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted">Sales tax</dt>
            <dd>{formatUsd(Number(booking.tax))}</dd>
          </div>
          <div className="flex justify-between font-semibold">
            <dt>Total paid</dt>
            <dd>{formatUsd(Number(booking.total))}</dd>
          </div>
          {Number(booking.amount_refunded) > 0 && (
            <div className="flex justify-between text-brand-700">
              <dt>Refunded</dt>
              <dd>−{formatUsd(Number(booking.amount_refunded))}</dd>
            </div>
          )}
          {Number(booking.deposit_total) > 0 && (
            <div className="flex justify-between text-muted">
              <dt>Security deposit (hold)</dt>
              <dd>{formatUsd(Number(booking.deposit_total))}</dd>
            </div>
          )}
        </dl>
      </section>

      <div className="mt-4 flex flex-wrap gap-3">
        <a
          href={`/api/bookings/${booking.id}/receipt`}
          className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-surface"
        >
          Download receipt (PDF)
        </a>
        <a
          href={`/api/bookings/${booking.id}/agreement`}
          className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-surface"
        >
          Rental agreement (PDF)
        </a>
      </div>

      <div className="mt-6">
        {canCancel ? (
          <CancelButton bookingId={booking.id} />
        ) : (
          <p className="text-xs text-muted">
            {booking.status === "cancelled"
              ? "This booking was cancelled."
              : "Online cancellation isn't available for this booking. All bookings are final once paid; contact us for exceptional cases."}
          </p>
        )}
      </div>
    </Container>
  );
}
