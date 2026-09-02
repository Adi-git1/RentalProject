import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStripe } from "@/lib/stripe";
import { buildServerQuote } from "@/lib/checkout";
import { checkoutSchema } from "@/lib/validation";
import { getSettings } from "@/lib/data";
import { formatRange } from "@/lib/date";
import { SITE_URL } from "@/lib/constants";
import type { DeliveryAddress } from "@/lib/database.types";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Please sign in to check out.", needsAuth: true },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(" ") },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const stripe = requireStripe();
  const admin = createAdminClient();
  const settings = await getSettings();

  const result = await buildServerQuote({
    lines: input.lines,
    startISO: input.startISO,
    endISO: input.endISO,
    fulfillment: input.fulfillment,
    deliveryAddress: input.deliveryAddress as DeliveryAddress | undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error, field: result.field }, { status: 400 });
  }
  const { quote } = result;

  // Reuse or create a Stripe customer for this user.
  let customerId = user.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name ?? undefined,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await admin.from("users").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }

  // Create the pending booking + items.
  const { data: booking, error: bookingError } = await admin
    .from("bookings")
    .insert({
      user_id: user.id,
      status: "pending",
      start_date: input.startISO,
      end_date: input.endISO,
      fulfillment: input.fulfillment,
      delivery_address:
        input.fulfillment === "delivery"
          ? ({ ...input.deliveryAddress, formatted: result.formattedAddress ?? undefined } as DeliveryAddress)
          : null,
      delivery_distance_miles: result.deliveryDistanceMiles,
      contact_name: user.name,
      contact_email: user.email,
      contact_phone: user.phone,
      subtotal: quote.subtotalCents / 100,
      delivery_fee: quote.deliveryFeeCents / 100,
      tax_rate: quote.taxRate,
      tax: quote.taxCents / 100,
      deposit_total: quote.depositTotalCents / 100,
      total: quote.totalCents / 100,
      currency: "usd",
      stripe_customer_id: customerId,
      terms_accepted_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (bookingError || !booking) {
    console.error("booking insert failed", bookingError);
    return NextResponse.json({ error: "Could not start checkout." }, { status: 500 });
  }

  const { error: itemsError } = await admin.from("booking_items").insert(
    quote.lines.map((l) => ({
      booking_id: booking.id,
      item_id: l.itemId,
      qty: l.qty,
      unit_price_snapshot: l.unitCents / 100,
      line_total: l.lineCents / 100,
    })),
  );
  if (itemsError) {
    console.error("booking_items insert failed", itemsError);
    await admin.from("bookings").delete().eq("id", booking.id);
    return NextResponse.json({ error: "Could not start checkout." }, { status: 500 });
  }

  const rangeLabel = formatRange(input.startISO, input.endISO);
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    ...quote.lines.map((l) => ({
      quantity: l.qty,
      price_data: {
        currency: "usd",
        unit_amount: l.unitCents,
        product_data: {
          name: l.name,
          description: `${rangeLabel} · ${l.methodLabel}`,
        },
      },
    })),
  ];
  if (quote.deliveryFeeCents > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: quote.deliveryFeeCents,
        product_data: { name: "Delivery", description: result.formattedAddress ?? undefined },
      },
    });
  }
  if (quote.taxCents > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: quote.taxCents,
        product_data: {
          name: `Sales tax (${(quote.taxRate * 100).toFixed(2).replace(/\.?0+$/, "")}%)`,
        },
      },
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    client_reference_id: booking.id,
    line_items: lineItems,
    payment_intent_data: {
      setup_future_usage: "off_session",
      description: `${settings.business_name} rental ${rangeLabel}`,
      metadata: { bookingId: booking.id, userId: user.id, kind: "rental" },
    },
    metadata: { bookingId: booking.id, userId: user.id },
    success_url: `${SITE_URL}/account/bookings/${booking.id}?checkout=success`,
    cancel_url: `${SITE_URL}/cart?checkout=cancelled`,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
  });

  await admin
    .from("bookings")
    .update({ stripe_session_id: session.id })
    .eq("id", booking.id);

  return NextResponse.json({ url: session.url });
}
