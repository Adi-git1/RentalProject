import { formatCents } from "@/lib/money";
import { formatDateLong } from "@/lib/date";
import type { BookingDetail } from "@/lib/bookings";
import type { SettingsRow } from "@/lib/database.types";
import { SITE_URL } from "@/lib/constants";

const BRAND = "#0d9488";

function shell(title: string, body: string, settings: SettingsRow): string {
  return `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="font-weight:700;font-size:18px;color:${BRAND};margin-bottom:16px">${settings.business_name}</div>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:24px">
      <h1 style="margin:0 0 12px;font-size:20px">${title}</h1>
      ${body}
    </div>
    <p style="color:#64748b;font-size:12px;margin-top:16px">
      ${settings.business_name} · ${settings.pickup_address}<br/>
      All rentals are final once paid. See the rental terms at ${SITE_URL}/terms.
    </p>
  </div></body></html>`;
}

function itemRows(booking: BookingDetail): string {
  return booking.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0;color:#334155">${i.item.name} × ${i.qty}</td>
         <td style="padding:6px 0;text-align:right;color:#334155">${formatCents(Math.round(Number(i.line_total) * 100))}</td></tr>`,
    )
    .join("");
}

function summaryBlock(booking: BookingDetail): string {
  const c = (n: number) => formatCents(Math.round(n * 100));
  return `
  <table style="width:100%;border-collapse:collapse;font-size:14px;margin:12px 0">
    ${itemRows(booking)}
    <tr><td style="padding-top:10px;border-top:1px solid #e2e8f0;color:#64748b">Subtotal</td><td style="padding-top:10px;border-top:1px solid #e2e8f0;text-align:right">${c(Number(booking.subtotal))}</td></tr>
    ${Number(booking.delivery_fee) > 0 ? `<tr><td style="color:#64748b">Delivery</td><td style="text-align:right">${c(Number(booking.delivery_fee))}</td></tr>` : ""}
    <tr><td style="color:#64748b">Sales tax</td><td style="text-align:right">${c(Number(booking.tax))}</td></tr>
    <tr><td style="font-weight:700;padding-top:6px">Total paid</td><td style="font-weight:700;text-align:right;padding-top:6px">${c(Number(booking.total))}</td></tr>
    ${Number(booking.deposit_total) > 0 ? `<tr><td style="color:#64748b;padding-top:6px">Security deposit (hold, not charged)</td><td style="text-align:right;padding-top:6px">${c(Number(booking.deposit_total))}</td></tr>` : ""}
  </table>`;
}

function fulfillmentLine(booking: BookingDetail, settings: SettingsRow): string {
  if (booking.fulfillment === "delivery") {
    const a = booking.delivery_address;
    return `<p style="margin:4px 0"><strong>Delivery to:</strong> ${
      a ? `${a.line1}, ${a.city}, ${a.state} ${a.postal_code}` : "your address"
    }</p>`;
  }
  return `<p style="margin:4px 0"><strong>Pickup at:</strong> ${settings.pickup_address}</p>`;
}

export function bookingConfirmationEmail(booking: BookingDetail, settings: SettingsRow) {
  const body = `
    <p style="margin:0 0 4px;color:#334155">Your rental is confirmed. Here are the details:</p>
    <p style="margin:12px 0 4px"><strong>Rental dates:</strong> ${formatDateLong(booking.start_date)} → ${formatDateLong(booking.end_date)}</p>
    ${fulfillmentLine(booking, settings)}
    ${summaryBlock(booking)}
    <p style="margin:12px 0 0"><a href="${SITE_URL}/account/bookings/${booking.id}" style="background:${BRAND};color:#fff;text-decoration:none;padding:10px 16px;border-radius:999px;display:inline-block">View booking &amp; receipt</a></p>
    <p style="color:#64748b;font-size:13px;margin-top:16px">Reminder: all bookings are final once paid. ${settings.late_fee_policy}</p>`;
  return {
    subject: `Booking confirmed — ${formatDateLong(booking.start_date)}`,
    html: shell("You're all set 🎉", body, settings),
  };
}

export function pickupReminderEmail(booking: BookingDetail, settings: SettingsRow) {
  const where =
    booking.fulfillment === "delivery"
      ? "We'll deliver your items"
      : `Pick up your items at ${settings.pickup_address}`;
  const body = `
    <p style="color:#334155">${where} on <strong>${formatDateLong(booking.start_date)}</strong>.</p>
    ${summaryBlock(booking)}
    <p style="margin:12px 0 0"><a href="${SITE_URL}/account/bookings/${booking.id}" style="background:${BRAND};color:#fff;text-decoration:none;padding:10px 16px;border-radius:999px;display:inline-block">View booking</a></p>`;
  return {
    subject: `Reminder: your rental starts tomorrow`,
    html: shell("Your rental starts tomorrow", body, settings),
  };
}

export function returnReminderEmail(booking: BookingDetail, settings: SettingsRow) {
  const body = `
    <p style="color:#334155">Your rental is due back on <strong>${formatDateLong(booking.end_date)}</strong>.</p>
    <p style="color:#334155">${settings.late_fee_policy}</p>
    <p style="color:#334155">Once everything is returned undamaged, your ${formatCents(Math.round(Number(booking.deposit_total) * 100))} deposit hold is released.</p>
    <p style="margin:12px 0 0"><a href="${SITE_URL}/account/bookings/${booking.id}" style="background:${BRAND};color:#fff;text-decoration:none;padding:10px 16px;border-radius:999px;display:inline-block">View booking</a></p>`;
  return {
    subject: `Reminder: return your rental tomorrow`,
    html: shell("Return due tomorrow", body, settings),
  };
}

export function depositReleasedEmail(booking: BookingDetail, settings: SettingsRow) {
  const body = `
    <p style="color:#334155">Thanks for returning everything! We've released the ${formatCents(Math.round(Number(booking.deposit_total) * 100))} security deposit hold on your card. Depending on your bank it may take a few business days to disappear from your statement.</p>
    <p style="color:#334155">We hope your event went great. We'd love a review.</p>`;
  return {
    subject: `Your deposit hold has been released`,
    html: shell("Deposit released ✅", body, settings),
  };
}

export function bookingCancelledEmail(
  booking: BookingDetail,
  settings: SettingsRow,
  opts: { refundedCents?: number; reason?: string },
) {
  const body = `
    <p style="color:#334155">${opts.reason ?? "Your booking has been cancelled."}</p>
    ${
      opts.refundedCents
        ? `<p style="color:#334155">A refund of ${formatCents(opts.refundedCents)} has been issued to your original payment method.</p>`
        : ""
    }
    <p style="color:#64748b;font-size:13px">Booking ${booking.id}</p>`;
  return {
    subject: `Your booking has been cancelled`,
    html: shell("Booking cancelled", body, settings),
  };
}
