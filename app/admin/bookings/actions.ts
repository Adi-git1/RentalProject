"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStripe } from "@/lib/stripe";
import {
  releaseDeposit,
  captureDeposit,
  chargeSavedCard,
} from "@/lib/deposit";
import { sendDepositReleased, sendBookingCancelled } from "@/lib/email/notifications";
import type { BookingStatus } from "@/lib/database.types";

type Result = { ok?: boolean; error?: string };

function refresh(id: string) {
  revalidatePath(`/admin/bookings/${id}`);
  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
  revalidatePath(`/account/bookings/${id}`);
}

async function getBooking(id: string) {
  const { data } = await createAdminClient().from("bookings").select("*").eq("id", id).single();
  return data;
}

export async function setBookingStatus(id: string, status: BookingStatus): Promise<Result> {
  await requireAdmin();
  const admin = createAdminClient();
  const booking = await getBooking(id);
  if (!booking) return { error: "Booking not found." };

  await admin.from("bookings").update({ status }).eq("id", id);

  if (status === "returned" && booking.deposit_status === "held") {
    await releaseDeposit(booking);
    await sendDepositReleased(id);
  }
  refresh(id);
  return { ok: true };
}

export async function releaseDepositAction(id: string): Promise<Result> {
  await requireAdmin();
  const booking = await getBooking(id);
  if (!booking) return { error: "Booking not found." };
  await releaseDeposit(booking);
  await sendDepositReleased(id);
  refresh(id);
  return { ok: true };
}

export async function captureDepositAction(id: string, amountDollars?: number): Promise<Result> {
  await requireAdmin();
  const booking = await getBooking(id);
  if (!booking) return { error: "Booking not found." };
  const res = await captureDeposit(
    booking,
    amountDollars != null ? Math.round(amountDollars * 100) : undefined,
  );
  refresh(id);
  return res.ok ? { ok: true } : { error: res.error };
}

export async function chargeLateFeeAction(
  id: string,
  amountDollars: number,
  description: string,
): Promise<Result> {
  await requireAdmin();
  const booking = await getBooking(id);
  if (!booking) return { error: "Booking not found." };
  if (!(amountDollars > 0)) return { error: "Enter an amount." };
  const res = await chargeSavedCard(
    booking,
    Math.round(amountDollars * 100),
    description || `Late/damage fee — booking ${id}`,
  );
  if (res.ok) {
    await createAdminClient()
      .from("bookings")
      .update({
        notes: [booking.notes, `Charged $${amountDollars.toFixed(2)} to card on file: ${description}`]
          .filter(Boolean)
          .join("\n"),
      })
      .eq("id", id);
  }
  refresh(id);
  return res.ok ? { ok: true } : { error: res.error };
}

export async function refundAction(id: string, amountDollars?: number): Promise<Result> {
  await requireAdmin();
  const admin = createAdminClient();
  const booking = await getBooking(id);
  if (!booking) return { error: "Booking not found." };
  if (!booking.stripe_payment_intent_id) return { error: "No payment to refund." };

  const stripe = requireStripe();
  const already = Number(booking.amount_refunded);
  const maxRefund = Number(booking.total) - already;
  const amount = amountDollars != null ? amountDollars : maxRefund;
  if (amount <= 0 || amount > maxRefund + 0.001) {
    return { error: `Refund must be between $0 and $${maxRefund.toFixed(2)}.` };
  }

  try {
    await stripe.refunds.create({
      payment_intent: booking.stripe_payment_intent_id,
      amount: Math.round(amount * 100),
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Refund failed." };
  }

  const newRefunded = already + amount;
  const fullyRefunded = newRefunded >= Number(booking.total) - 0.001;
  await admin
    .from("bookings")
    .update({
      amount_refunded: newRefunded,
      ...(fullyRefunded ? { status: "cancelled" as BookingStatus } : {}),
    })
    .eq("id", id);

  if (fullyRefunded && booking.deposit_status === "held") {
    await releaseDeposit(booking);
  }
  await sendBookingCancelled(id, {
    refundedCents: Math.round(amount * 100),
    reason: fullyRefunded
      ? "The owner has cancelled and fully refunded this booking."
      : "The owner has issued a partial refund on this booking.",
  });

  refresh(id);
  return { ok: true };
}

export async function saveNotesAction(id: string, notes: string): Promise<Result> {
  await requireAdmin();
  await createAdminClient().from("bookings").update({ notes }).eq("id", id);
  refresh(id);
  return { ok: true };
}
