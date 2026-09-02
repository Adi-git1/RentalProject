import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/ui/primitives";
import { BookingStatusBadge, DepositStatusBadge } from "@/components/booking-status";
import { BookingAdminActions } from "@/components/admin/booking-actions";
import { getBookingDetail } from "@/lib/bookings";
import { getSettings } from "@/lib/data";
import { formatDateLong } from "@/lib/date";
import { formatUsd } from "@/lib/money";

export const metadata: Metadata = { title: "Booking · Admin" };

export default async function AdminBookingDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [booking, settings] = await Promise.all([getBookingDetail(id), getSettings()]);
  if (!booking) notFound();

  return (
    <Container className="px-0 py-0">
      <Link href="/admin/bookings" className="text-sm text-muted hover:text-ink">
        ← All bookings
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold text-ink">
          {booking.contact_name ?? "Customer"}
        </h1>
        <BookingStatusBadge status={booking.status} />
        <DepositStatusBadge status={booking.deposit_status} />
      </div>
      <p className="text-xs text-muted">
        Ref {booking.id} · placed {formatDateLong(booking.created_at.slice(0, 10))}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <section className="rounded-[var(--radius-card)] border border-line bg-white p-4 text-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              <Info label="Rental period">
                {formatDateLong(booking.start_date)} → {formatDateLong(booking.end_date)}
              </Info>
              <Info label="Contact">
                {booking.contact_email}
                <br />
                {booking.contact_phone ?? "no phone"}
              </Info>
              <Info label="Fulfillment">
                <span className="capitalize">{booking.fulfillment}</span>
                {booking.fulfillment === "delivery" && booking.delivery_address && (
                  <>
                    <br />
                    {booking.delivery_address.line1}, {booking.delivery_address.city},{" "}
                    {booking.delivery_address.state} {booking.delivery_address.postal_code}
                    {booking.delivery_distance_miles != null && (
                      <span className="text-muted"> · {booking.delivery_distance_miles} mi</span>
                    )}
                  </>
                )}
                {booking.fulfillment === "pickup" && (
                  <>
                    <br />
                    <span className="text-muted">{settings.pickup_address}</span>
                  </>
                )}
              </Info>
              <Info label="Terms accepted">
                {booking.terms_accepted_at
                  ? formatDateLong(booking.terms_accepted_at.slice(0, 10))
                  : "—"}
              </Info>
            </div>
          </section>

          <section className="rounded-[var(--radius-card)] border border-line bg-white p-4">
            <h2 className="text-sm font-semibold text-ink">Items</h2>
            <table className="mt-2 w-full text-sm">
              <tbody>
                {booking.items.map((bi) => (
                  <tr key={bi.id} className="border-b border-line last:border-0">
                    <td className="py-2">
                      {bi.item.name} <span className="text-muted">× {bi.qty}</span>
                    </td>
                    <td className="py-2 text-right">{formatUsd(Number(bi.line_total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
              <Line label="Subtotal" value={formatUsd(Number(booking.subtotal))} />
              {Number(booking.delivery_fee) > 0 && (
                <Line label="Delivery" value={formatUsd(Number(booking.delivery_fee))} />
              )}
              <Line label={`Sales tax (${(Number(booking.tax_rate) * 100).toFixed(2).replace(/\.?0+$/, "")}%)`} value={formatUsd(Number(booking.tax))} />
              <Line label="Total paid" value={formatUsd(Number(booking.total))} bold />
              {Number(booking.amount_refunded) > 0 && (
                <Line label="Refunded" value={`−${formatUsd(Number(booking.amount_refunded))}`} />
              )}
              {Number(booking.deposit_total) > 0 && (
                <Line
                  label={`Security deposit (${booking.deposit_status})`}
                  value={formatUsd(Number(booking.deposit_total))}
                />
              )}
            </dl>
            {booking.notes && (
              <p className="mt-3 whitespace-pre-line rounded-lg bg-surface p-2 text-xs text-muted">
                {booking.notes}
              </p>
            )}
          </section>
        </div>

        <aside className="rounded-[var(--radius-card)] border border-line bg-white p-4">
          <BookingAdminActions
            bookingId={booking.id}
            status={booking.status}
            depositStatus={booking.deposit_status}
            depositTotal={Number(booking.deposit_total)}
            total={Number(booking.total)}
            amountRefunded={Number(booking.amount_refunded)}
            notes={booking.notes ?? ""}
            hasPaymentIntent={!!booking.stripe_payment_intent_id}
          />
        </aside>
      </div>
    </Container>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-ink">{children}</dd>
    </div>
  );
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}>
      <dt className={bold ? "" : "text-muted"}>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
