import Link from "next/link";
import { Container } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { ItemCard } from "@/components/item-card";
import { CategoryChips } from "@/components/store/category-chips";
import { getItems, getSettings } from "@/lib/data";

export default async function HomePage() {
  const [items, settings] = await Promise.all([
    getItems({ sort: "newest" }),
    getSettings(),
  ]);
  const featured = items.slice(0, 8);

  return (
    <>
      <section className="border-b border-line bg-surface">
        <Container className="py-14 sm:py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-brand-700">
              {settings.business_name} · Northern Virginia
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
              Everything you need to throw the party.
            </h1>
            <p className="mt-4 text-base text-muted sm:text-lg">
              Tables, chairs, tents, bounce houses, sound systems and concessions —
              pick your dates, pay online, and pick up or get delivery within{" "}
              {settings.delivery_radius_miles} miles of Brambleton.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href="/browse" size="lg">
                Browse rentals
              </ButtonLink>
              <ButtonLink href="/how-it-works" variant="secondary" size="lg">
                How it works
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>

      <Container className="py-10">
        <h2 className="text-lg font-semibold text-ink">Shop by category</h2>
        <div className="mt-4">
          <CategoryChips />
        </div>

        <div className="mt-10 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-ink">Popular right now</h2>
          <Link href="/browse" className="text-sm font-medium text-brand-700 hover:underline">
            See all
          </Link>
        </div>

        {featured.length === 0 ? (
          <p className="mt-6 rounded-[var(--radius-card)] border border-dashed border-line bg-surface p-8 text-center text-sm text-muted">
            No items yet. Run <code className="rounded bg-white px-1">npm run seed</code> to add sample inventory.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {featured.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
