import type { Metadata } from "next";
import { Container } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { getSettings } from "@/lib/data";

export const metadata: Metadata = { title: "How it works" };

export default async function HowItWorksPage() {
  const settings = await getSettings();
  const steps = [
    {
      title: "Pick your items and dates",
      body: "Browse the catalog, choose a rental window, and add what you need to your cart. Prices update live — you always see day, weekend, and weekly rates.",
    },
    {
      title: "Choose pickup or delivery",
      body: `Pick up free at ${settings.pickup_address}, or have it delivered within ${settings.delivery_radius_miles} miles for a $${Number(settings.delivery_fee).toFixed(0)} flat fee (free over $${Number(settings.free_delivery_threshold).toFixed(0)}).`,
    },
    {
      title: "Pay securely",
      body: "Checkout with any card via Stripe. Rental total plus Virginia sales tax is charged now. A refundable security deposit is placed as a hold — not a charge.",
    },
    {
      title: "Enjoy, then return",
      body: `Use the gear for your event. Return it on time and in good shape and the deposit hold is released. ${settings.late_fee_policy}`,
    },
  ];

  return (
    <Container className="max-w-2xl py-12">
      <h1 className="text-2xl font-semibold text-ink">How it works</h1>
      <ol className="mt-8 space-y-6">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-4">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-semibold text-white">
              {i + 1}
            </span>
            <div>
              <h2 className="font-semibold text-ink">{s.title}</h2>
              <p className="mt-1 text-sm text-muted">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-10">
        <ButtonLink href="/browse" size="lg">
          Start browsing
        </ButtonLink>
      </div>
    </Container>
  );
}
