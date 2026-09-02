import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import { formatCents } from "@/lib/money";
import { formatDateLong } from "@/lib/date";
import type { BookingDetail } from "@/lib/bookings";
import type { SettingsRow } from "@/lib/database.types";

const BRAND = rgb(0.05, 0.58, 0.53);
const INK = rgb(0.06, 0.09, 0.16);
const MUTED = rgb(0.39, 0.45, 0.55);

interface Writer {
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  y: number;
}

function line(w: Writer, text: string, opts: { size?: number; color?: typeof INK; bold?: boolean; gap?: number } = {}) {
  const size = opts.size ?? 11;
  w.page.drawText(text, {
    x: 50,
    y: w.y,
    size,
    font: opts.bold ? w.bold : w.font,
    color: opts.color ?? INK,
  });
  w.y -= size + (opts.gap ?? 6);
}

function row(w: Writer, left: string, right: string, opts: { bold?: boolean } = {}) {
  const size = 11;
  const f = opts.bold ? w.bold : w.font;
  w.page.drawText(left, { x: 50, y: w.y, size, font: f, color: INK });
  const width = w.bold.widthOfTextAtSize(right, size);
  w.page.drawText(right, { x: 545 - width, y: w.y, size, font: f, color: INK });
  w.y -= size + 6;
}

function cents(n: number) {
  return formatCents(Math.round(n * 100));
}

async function newDoc(title: string, settings: SettingsRow) {
  const doc = await PDFDocument.create();
  doc.setTitle(title);
  const page = doc.addPage([595, 842]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const w: Writer = { page, font, bold, y: 792 };

  page.drawText(settings.business_name, { x: 50, y: w.y, size: 18, font: bold, color: BRAND });
  w.y -= 16;
  line(w, settings.pickup_address, { size: 9, color: MUTED, gap: 2 });
  if (settings.contact_email) line(w, settings.contact_email, { size: 9, color: MUTED, gap: 2 });
  w.y -= 8;
  line(w, title, { size: 14, bold: true, gap: 10 });
  return { doc, w };
}

function drawItems(w: Writer, booking: BookingDetail) {
  row(w, "Item", "Amount", { bold: true });
  for (const bi of booking.items) {
    row(w, `${bi.item.name}  x${bi.qty}`, cents(Number(bi.line_total)));
  }
  w.y -= 4;
  w.page.drawLine({ start: { x: 50, y: w.y + 6 }, end: { x: 545, y: w.y + 6 }, thickness: 0.5, color: MUTED });
  w.y -= 6;
  row(w, "Subtotal", cents(Number(booking.subtotal)));
  if (Number(booking.delivery_fee) > 0) row(w, "Delivery", cents(Number(booking.delivery_fee)));
  row(w, `Sales tax (${(Number(booking.tax_rate) * 100).toFixed(2).replace(/\.?0+$/, "")}%)`, cents(Number(booking.tax)));
  row(w, "Total paid", cents(Number(booking.total)), { bold: true });
  if (Number(booking.amount_refunded) > 0) row(w, "Refunded", `- ${cents(Number(booking.amount_refunded))}`);
  w.y -= 4;
  if (Number(booking.deposit_total) > 0) {
    row(w, "Security deposit (authorization hold, not charged)", cents(Number(booking.deposit_total)));
  }
}

export async function buildReceiptPdf(
  booking: BookingDetail,
  settings: SettingsRow,
): Promise<Uint8Array> {
  const { doc, w } = await newDoc("Rental Receipt", settings);

  line(w, `Receipt #: ${booking.id}`, { size: 10, color: MUTED, gap: 3 });
  line(w, `Issued: ${formatDateLong(new Date().toISOString().slice(0, 10))}`, { size: 10, color: MUTED, gap: 3 });
  line(w, `Status: ${booking.status}`, { size: 10, color: MUTED, gap: 12 });

  line(w, `Rental period: ${formatDateLong(booking.start_date)} to ${formatDateLong(booking.end_date)}`, { gap: 4 });
  line(
    w,
    booking.fulfillment === "delivery"
      ? `Delivery: ${booking.delivery_address ? `${booking.delivery_address.line1}, ${booking.delivery_address.city}, ${booking.delivery_address.state} ${booking.delivery_address.postal_code}` : "yes"}`
      : `Pickup: ${settings.pickup_address}`,
    { gap: 4 },
  );
  if (booking.contact_name) line(w, `Renter: ${booking.contact_name}`, { gap: 4 });
  if (booking.contact_email) line(w, `Email: ${booking.contact_email}`, { gap: 14 });

  drawItems(w, booking);

  w.y -= 20;
  line(w, "All rentals are final once paid. " + settings.cancellation_policy, { size: 8, color: MUTED, gap: 3 });
  line(w, "Thank you for renting with " + settings.business_name + ".", { size: 9, color: MUTED });

  return doc.save();
}

export async function buildAgreementPdf(
  booking: BookingDetail,
  settings: SettingsRow,
): Promise<Uint8Array> {
  const { doc, w } = await newDoc("Rental Agreement", settings);

  line(w, `Agreement #: ${booking.id}`, { size: 10, color: MUTED, gap: 3 });
  line(w, `Renter: ${booking.contact_name ?? "—"}  ·  ${booking.contact_email ?? "—"}`, { size: 10, color: MUTED, gap: 3 });
  line(w, `Rental period: ${formatDateLong(booking.start_date)} to ${formatDateLong(booking.end_date)}`, { size: 10, color: MUTED, gap: 12 });

  line(w, "Equipment", { bold: true, gap: 6 });
  for (const bi of booking.items) {
    line(w, `- ${bi.item.name} x${bi.qty} (declared value / deposit basis: ${cents(Number(bi.unit_price_snapshot))})`, { size: 10, gap: 4 });
  }
  w.y -= 8;

  line(w, "Terms", { bold: true, gap: 6 });
  const terms = wrap(settings.terms_text || "", 95);
  for (const t of terms) line(w, t, { size: 9, color: MUTED, gap: 3 });
  w.y -= 6;
  for (const t of wrap(`Cancellation: ${settings.cancellation_policy}`, 95)) line(w, t, { size: 9, color: MUTED, gap: 3 });
  w.y -= 4;
  for (const t of wrap(`Late fees: ${settings.late_fee_policy}`, 95)) line(w, t, { size: 9, color: MUTED, gap: 3 });

  w.y -= 24;
  line(w, `Accepted electronically on ${booking.terms_accepted_at ? formatDateLong(booking.terms_accepted_at.slice(0, 10)) : "—"} by ${booking.contact_email ?? "renter"}.`, { size: 9, color: MUTED, gap: 20 });
  w.page.drawLine({ start: { x: 50, y: w.y }, end: { x: 260, y: w.y }, thickness: 0.5, color: MUTED });
  w.y -= 12;
  line(w, "Renter signature (electronic)", { size: 8, color: MUTED });

  return doc.save();
}

function wrap(text: string, max: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    if ((cur + " " + word).trim().length > max) {
      if (cur) lines.push(cur.trim());
      cur = word;
    } else {
      cur += " " + word;
    }
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines;
}
