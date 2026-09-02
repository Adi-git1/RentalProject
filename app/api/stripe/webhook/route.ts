import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { requireStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAvailability } from "@/lib/availability";
import { getBookingDetail } from "@/lib/bookings";
import {
  sendBookingConfirmation,
  sendBookingCancelled,
} from "@/lib/email/notifications";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET not configured" },
      { status: 500 },
    );
  }

  const stripe = requireStripe();
  const payload = await request.text();
  const sig = request.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig, secret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;
      case "checkout.session.expired":
        await handleCheckoutExpired(event.data.object);
        break;
      default:
        break;
    }
  } catch (err) {
    console.error(`Error handling ${event.type}:`, err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const bookingId = session.metadata?.bookingId ?? session.client_reference_id;
  if (!bookingId) return;
  if (session.payment_status !== "paid") return;

  const stripe = requireStripe();
  const admin = createAdminClient();

  const { data: booking } = await admin
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();
  if (!booking || booking.status === "confirmed" || booking.status === "cancelled") {
    return; // idempotent
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;
  const pi = paymentIntentId
    ? await stripe.paymentIntents.retrieve(paymentIntentId)
    : null;

  // Final overbooking guard.
  const { data: bookingItems } = await admin
    .from("booking_items")
    .select("item_id, qty")
    .eq("booking_id", bookingId);

  const availability = await getAvailability(
    (bookingItems ?? []).map((b) => b.item_id),
    booking.start_date,
    booking.end_date,
    { excludeBookingId: bookingId },
  );
  const overbooked = (bookingItems ?? []).some((bi) => {
    const avail = availability.get(bi.item_id)?.availableQty ?? 0;
    return bi.qty > avail;
  });

  if (overbooked) {
    if (pi) {
      await stripe.refunds.create({ payment_intent: pi.id, reason: "requested_by_customer" });
    }
    await admin
      .from("bookings")
      .update({
        status: "cancelled",
        stripe_payment_intent_id: pi?.id ?? null,
        amount_refunded: booking.total,
        notes: [booking.notes, "Auto-cancelled + refunded: items became unavailable before payment cleared."]
          .filter(Boolean)
          .join("\n"),
      })
      .eq("id", bookingId);
    await sendBookingCancelled(bookingId, {
      refundedCents: Math.round(Number(booking.total) * 100),
      reason: "Unfortunately those items were booked by someone else before your payment completed, so we've cancelled and fully refunded this order.",
    });
    return;
  }

  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id ?? booking.stripe_customer_id;

  await admin
    .from("bookings")
    .update({
      status: "confirmed",
      stripe_payment_intent_id: pi?.id ?? null,
      stripe_customer_id: customerId ?? null,
    })
    .eq("id", bookingId);

  // Place the security deposit as a manual-capture authorization hold.
  if (Number(booking.deposit_total) > 0 && pi && customerId) {
    const paymentMethod =
      typeof pi.payment_method === "string" ? pi.payment_method : pi.payment_method?.id;
    if (paymentMethod) {
      try {
        const depositPi = await stripe.paymentIntents.create({
          amount: Math.round(Number(booking.deposit_total) * 100),
          currency: booking.currency || "usd",
          customer: customerId,
          payment_method: paymentMethod,
          capture_method: "manual",
          confirm: true,
          off_session: true,
          description: `Security deposit hold — booking ${bookingId}`,
          metadata: { bookingId, kind: "deposit" },
        });
        await admin
          .from("bookings")
          .update({
            deposit_payment_intent_id: depositPi.id,
            deposit_status: depositPi.status === "requires_capture" ? "held" : "none",
          })
          .eq("id", bookingId);
      } catch (err) {
        console.warn(`Deposit hold failed for booking ${bookingId}:`, err);
        await admin
          .from("bookings")
          .update({
            notes: [booking.notes, "Deposit hold could not be placed automatically — collect manually."]
              .filter(Boolean)
              .join("\n"),
          })
          .eq("id", bookingId);
      }
    }
  }

  await sendBookingConfirmation(bookingId);
  // Warm the detail cache / no-op if missing
  await getBookingDetail(bookingId);
}

async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  const bookingId = session.metadata?.bookingId ?? session.client_reference_id;
  if (!bookingId) return;
  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("bookings")
    .select("status")
    .eq("id", bookingId)
    .single();
  if (booking?.status === "pending") {
    await admin.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);
  }
}
