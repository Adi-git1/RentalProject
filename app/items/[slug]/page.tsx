import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Container, Badge } from "@/components/ui/primitives";
import { RatingStars } from "@/components/rating-stars";
import { Gallery } from "@/components/item/gallery";
import { RentPanel } from "@/components/item/rent-panel";
import { getItemBySlug, getSettings } from "@/lib/data";
import { getItemFullyBookedDates } from "@/lib/item-calendar";
import { formatDateLong } from "@/lib/date";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = await getItemBySlug(slug);
  if (!item) return { title: "Item not found" };
  return {
    title: item.name,
    description: item.description.slice(0, 155),
    openGraph: { images: item.photos[0]?.url ? [item.photos[0].url] : [] },
  };
}

export default async function ItemPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [item, settings] = await Promise.all([getItemBySlug(slug), getSettings()]);
  if (!item || !item.active) notFound();

  const fullyBookedDates = await getItemFullyBookedDates(item.id, item.quantity);
  const specs = Object.entries(item.specs ?? {});

  return (
    <Container className="py-8">
      <nav className="mb-4 text-sm text-muted">
        <Link href="/browse" className="hover:text-ink">
          Browse
        </Link>{" "}
        /{" "}
        <Link
          href={`/browse?category=${encodeURIComponent(item.category)}`}
          className="hover:text-ink"
        >
          {item.category}
        </Link>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          <Gallery photos={item.photos} alt={item.name} />

          <div className="mt-6">
            <div className="flex items-center gap-2">
              <Badge className="bg-brand-50 text-brand-800">{item.category}</Badge>
              <RatingStars rating={item.rating} count={item.reviews.length} />
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-ink">{item.name}</h1>
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted">
              {item.description}
            </p>
          </div>

          {(specs.length > 0 || item.dimensions || item.weight) && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-ink">Specifications</h2>
              <dl className="mt-2 grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2">
                {item.dimensions && (
                  <div className="flex justify-between border-b border-line py-1.5 text-sm">
                    <dt className="text-muted">Dimensions</dt>
                    <dd className="text-ink">{item.dimensions}</dd>
                  </div>
                )}
                {item.weight && (
                  <div className="flex justify-between border-b border-line py-1.5 text-sm">
                    <dt className="text-muted">Weight</dt>
                    <dd className="text-ink">{item.weight}</dd>
                  </div>
                )}
                {specs.map(([k, v]) => (
                  <div
                    key={k}
                    className="flex justify-between border-b border-line py-1.5 text-sm"
                  >
                    <dt className="text-muted">{k}</dt>
                    <dd className="text-ink">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="mt-8">
            <h2 className="text-sm font-semibold text-ink">
              Reviews {item.reviews.length > 0 && `(${item.reviews.length})`}
            </h2>
            {item.reviews.length === 0 ? (
              <p className="mt-2 text-sm text-muted">
                No reviews yet. Reviews can be left after a rental is returned.
              </p>
            ) : (
              <ul className="mt-3 space-y-4">
                {item.reviews.map((r) => (
                  <li key={r.id} className="rounded-xl border border-line p-4">
                    <div className="flex items-center justify-between">
                      <RatingStars rating={r.rating} />
                      <span className="text-xs text-muted">
                        {formatDateLong(r.created_at.slice(0, 10))}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-ink">
                      {r.userName ?? "Verified renter"}
                    </p>
                    {r.text && <p className="mt-1 text-sm text-muted">{r.text}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <RentPanel
            item={{
              id: item.id,
              slug: item.slug,
              name: item.name,
              photo: item.photos[0]?.url ?? null,
              priceDay: Number(item.price_day),
              priceWeekend: item.price_weekend != null ? Number(item.price_weekend) : null,
              priceWeek: item.price_week != null ? Number(item.price_week) : null,
              deposit: Number(item.deposit),
              quantity: item.quantity,
            }}
            settings={{
              deliveryFee: settings.delivery_fee,
              freeDeliveryThreshold: settings.free_delivery_threshold,
              taxRate: settings.tax_rate,
              minRentalDays: settings.min_rental_days,
            }}
            fullyBookedDates={fullyBookedDates}
            cancellationPolicy={settings.cancellation_policy}
          />
        </aside>
      </div>
    </Container>
  );
}
