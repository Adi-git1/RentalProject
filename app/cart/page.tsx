import type { Metadata } from "next";
import { Container } from "@/components/ui/primitives";
import { CartView } from "@/components/cart/cart-view";
import { getSettings } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Your cart" };

export default async function CartPage() {
  const [settings, user] = await Promise.all([getSettings(), getCurrentUser()]);

  return (
    <Container className="py-8">
      <h1 className="text-2xl font-semibold text-ink">Your cart</h1>
      <p className="mt-1 text-sm text-muted">Review your items, pick dates, and check out.</p>
      <div className="mt-6">
        <CartView
          isAuthed={!!user}
          settings={{
            deliveryFee: Number(settings.delivery_fee),
            freeDeliveryThreshold: Number(settings.free_delivery_threshold),
            taxRate: Number(settings.tax_rate),
            minRentalDays: settings.min_rental_days,
            cancellationPolicy: settings.cancellation_policy,
            termsText: settings.terms_text,
            pickupAddress: settings.pickup_address,
            deliveryRadiusMiles: Number(settings.delivery_radius_miles),
          }}
        />
      </div>
    </Container>
  );
}
