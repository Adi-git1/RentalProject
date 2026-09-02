import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/primitives";
import { RatingStars } from "@/components/rating-stars";
import { formatUsd } from "@/lib/money";
import type { ItemCard as ItemCardData } from "@/lib/data";

export function ItemCard({
  item,
  availableQty,
}: {
  item: ItemCardData;
  availableQty?: number | null;
}) {
  const soldOut = availableQty != null && availableQty <= 0;

  return (
    <Link
      href={`/items/${item.slug}`}
      className="group flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-white transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface">
        {item.photo ? (
          <Image
            src={item.photo}
            alt={item.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center text-muted">No photo</div>
        )}
        <div className="absolute left-2 top-2 flex gap-1.5">
          <Badge className="bg-white/95 text-ink shadow-sm">{item.category}</Badge>
        </div>
        {soldOut && (
          <div className="absolute inset-0 grid place-items-center bg-white/70">
            <Badge className="bg-rose-600 text-white">Unavailable for these dates</Badge>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-semibold text-ink">{item.name}</h3>
        </div>
        <RatingStars rating={item.rating} count={item.reviewCount} />
        <div className="mt-auto pt-2">
          <span className="text-base font-semibold text-ink">
            {formatUsd(Number(item.price_day))}
          </span>
          <span className="text-sm text-muted"> / day</span>
          {availableQty != null && !soldOut && (
            <span className="ml-2 text-xs text-brand-700">{availableQty} available</span>
          )}
        </div>
      </div>
    </Link>
  );
}
