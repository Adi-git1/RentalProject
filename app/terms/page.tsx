import type { Metadata } from "next";
import { Container } from "@/components/ui/primitives";
import { getSettings } from "@/lib/data";

export const metadata: Metadata = { title: "Rental terms" };

export default async function TermsPage() {
  const settings = await getSettings();
  return (
    <Container className="prose-slate max-w-2xl py-12">
      <h1 className="text-2xl font-semibold text-ink">Rental terms</h1>

      <section className="mt-6 space-y-2">
        <h2 className="text-lg font-semibold text-ink">Cancellations &amp; refunds</h2>
        <p className="text-sm text-muted">{settings.cancellation_policy}</p>
      </section>

      <section className="mt-6 space-y-2">
        <h2 className="text-lg font-semibold text-ink">Late returns</h2>
        <p className="text-sm text-muted">{settings.late_fee_policy}</p>
      </section>

      <section className="mt-6 space-y-2">
        <h2 className="text-lg font-semibold text-ink">Security deposit</h2>
        <p className="text-sm text-muted">
          Your deposit is placed as a temporary authorization hold on your card at
          checkout — it is not a charge. It is released after the equipment is
          returned on time and undamaged. Damage or loss may be charged against the
          hold.
        </p>
      </section>

      <section className="mt-6 space-y-2">
        <h2 className="text-lg font-semibold text-ink">Delivery</h2>
        <p className="text-sm text-muted">
          Delivery is available within {settings.delivery_radius_miles} miles of{" "}
          {settings.pickup_address} for a ${Number(settings.delivery_fee).toFixed(0)}{" "}
          flat fee, free on orders over ${Number(settings.free_delivery_threshold).toFixed(0)}.
          Addresses outside the range are pickup only.
        </p>
      </section>

      <section className="mt-6 space-y-2">
        <h2 className="text-lg font-semibold text-ink">Full terms</h2>
        <p className="whitespace-pre-line text-sm text-muted">{settings.terms_text}</p>
      </section>
    </Container>
  );
}
