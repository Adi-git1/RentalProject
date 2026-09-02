import "server-only";
import { sendEmail } from "@/lib/email/resend";
import { getBookingDetail, type BookingDetail } from "@/lib/bookings";
import { getSettings } from "@/lib/data";
import * as t from "@/lib/email/templates";

async function recipientFor(booking: BookingDetail): Promise<string | null> {
  return booking.contact_email ?? null;
}

async function load(bookingId: string) {
  const [booking, settings] = await Promise.all([
    getBookingDetail(bookingId),
    getSettings(),
  ]);
  return { booking, settings };
}

export async function sendBookingConfirmation(bookingId: string) {
  const { booking, settings } = await load(bookingId);
  if (!booking) return;
  const to = await recipientFor(booking);
  if (!to) return;
  const { subject, html } = t.bookingConfirmationEmail(booking, settings);
  await sendEmail({ to, subject, html, replyTo: settings.contact_email ?? undefined });
}

export async function sendPickupReminder(bookingId: string) {
  const { booking, settings } = await load(bookingId);
  if (!booking) return;
  const to = await recipientFor(booking);
  if (!to) return;
  const { subject, html } = t.pickupReminderEmail(booking, settings);
  await sendEmail({ to, subject, html, replyTo: settings.contact_email ?? undefined });
}

export async function sendReturnReminder(bookingId: string) {
  const { booking, settings } = await load(bookingId);
  if (!booking) return;
  const to = await recipientFor(booking);
  if (!to) return;
  const { subject, html } = t.returnReminderEmail(booking, settings);
  await sendEmail({ to, subject, html, replyTo: settings.contact_email ?? undefined });
}

export async function sendDepositReleased(bookingId: string) {
  const { booking, settings } = await load(bookingId);
  if (!booking) return;
  const to = await recipientFor(booking);
  if (!to) return;
  const { subject, html } = t.depositReleasedEmail(booking, settings);
  await sendEmail({ to, subject, html, replyTo: settings.contact_email ?? undefined });
}

export async function sendBookingCancelled(
  bookingId: string,
  opts: { refundedCents?: number; reason?: string } = {},
) {
  const { booking, settings } = await load(bookingId);
  if (!booking) return;
  const to = await recipientFor(booking);
  if (!to) return;
  const { subject, html } = t.bookingCancelledEmail(booking, settings, opts);
  await sendEmail({ to, subject, html, replyTo: settings.contact_email ?? undefined });
}
