import "server-only";
import { requireStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BookingRow } from "@/lib/database.types";

/** Release (cancel) the deposit authorization hold. */
export async function releaseDeposit(booking: BookingRow): Promise<void> {
  if (booking.deposit_status !== "held" || !booking.deposit_payment_intent_id) return;
  const stripe = requireStripe();
  try {
    await stripe.paymentIntents.cancel(booking.deposit_payment_intent_id);
  } catch (err) {
    console.warn(`releaseDeposit: cancel failed for ${booking.id}`, err);
  }
  await createAdminClient()
    .from("bookings")
    .update({ deposit_status: "released" })
    .eq("id", booking.id);
}

/** Capture some or all of the deposit hold (e.g. for damage). amountCents optional = full. */
export async function captureDeposit(
  booking: BookingRow,
  amountCents?: number,
): Promise<{ ok: boolean; error?: string }> {
  if (booking.deposit_status !== "held" || !booking.deposit_payment_intent_id) {
    return { ok: false, error: "No active deposit hold." };
  }
  const stripe = requireStripe();
  try {
    await stripe.paymentIntents.capture(booking.deposit_payment_intent_id, {
      ...(amountCents ? { amount_to_capture: amountCents } : {}),
    });
    await createAdminClient()
      .from("bookings")
      .update({ deposit_status: "captured" })
      .eq("id", booking.id);
    return { ok: true };
  } catch (err) {
    console.error(`captureDeposit failed for ${booking.id}`, err);
    return { ok: false, error: err instanceof Error ? err.message : "Capture failed" };
  }
}

/** Charge the saved card off-session (late fees, extra damage beyond deposit). */
export async function chargeSavedCard(
  booking: BookingRow,
  amountCents: number,
  description: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!booking.stripe_customer_id) return { ok: false, error: "No saved customer." };
  const stripe = requireStripe();
  try {
    const methods = await stripe.paymentMethods.list({
      customer: booking.stripe_customer_id,
      type: "card",
      limit: 1,
    });
    const pm = methods.data[0]?.id;
    if (!pm) return { ok: false, error: "No saved card on file." };
    await stripe.paymentIntents.create({
      amount: amountCents,
      currency: booking.currency || "usd",
      customer: booking.stripe_customer_id,
      payment_method: pm,
      off_session: true,
      confirm: true,
      description,
      metadata: { bookingId: booking.id, kind: "surcharge" },
    });
    return { ok: true };
  } catch (err) {
    console.error(`chargeSavedCard failed for ${booking.id}`, err);
    return { ok: false, error: err instanceof Error ? err.message : "Charge failed" };
  }
}
