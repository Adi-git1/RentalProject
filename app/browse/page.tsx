import type { Metadata } from "next";
import { Suspense } from "react";
import { Container, EmptyState, Skeleton } from "@/components/ui/primitives";
import { ItemCard } from "@/components/item-card";
import { CategoryChips } from "@/components/store/category-chips";
import { BrowseFilters } from "@/components/store/browse-filters";
import { getItems, type ItemListFilters } from "@/lib/data";
import { getAvailability } from "@/lib/availability";
import { isISODate, validateRange, formatRange } from "@/lib/date";

export const metadata: Metadata = { title: "Browse rentals" };

type SP = Record<string, string | string[] | undefined>;

function str(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const category = str(sp.category);
  const q = str(sp.q);
  const min = str(sp.min);
  const max = str(sp.max);
  const sort = str(sp.sort) as ItemListFilters["sort"];
  const start = str(sp.start);
  const end = str(sp.end);

  const filters: ItemListFilters = {
    category,
    q,
    minPrice: min ? Number(min) : undefined,
    maxPrice: max ? Number(max) : undefined,
    sort,
  };

  const items = await getItems(filters);

  const datesValid =
    isISODate(start) && isISODate(end) && !validateRange(start!, end!, 1);
  const availability = datesValid
    ? await getAvailability(
        items.map((i) => i.id),
        start!,
        end!,
      )
    : null;

  const visible = availability
    ? items.filter((i) => (availability.get(i.id)?.availableQty ?? 0) > 0)
    : items;

  return (
    <Container className="py-8">
      <h1 className="text-2xl font-semibold text-ink">Browse rentals</h1>
      <p className="mt-1 text-sm text-muted">
        {datesValid
          ? `Showing what's available ${formatRange(start!, end!)}`
          : "Tables, tents, bounce houses, sound, concessions and more."}
      </p>

      <div className="mt-5">
        <CategoryChips active={category} />
      </div>

      <div className="mt-5 rounded-[var(--radius-card)] border border-line bg-surface p-4">
        <Suspense fallback={<Skeleton className="h-40 w-full" />}>
          <BrowseFilters />
        </Suspense>
      </div>

      <p className="mt-6 text-sm text-muted">
        {visible.length} item{visible.length === 1 ? "" : "s"}
      </p>

      {visible.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="Nothing matches those filters"
            message="Try widening your price range or clearing the date filter."
          />
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {visible.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              availableQty={availability?.get(item.id)?.availableQty ?? null}
            />
          ))}
        </div>
      )}
    </Container>
  );
}
