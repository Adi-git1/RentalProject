import { cn } from "@/lib/cn";

export function RatingStars({
  rating,
  count,
  className,
}: {
  rating: number | null;
  count?: number;
  className?: string;
}) {
  if (rating == null) {
    return count === 0 ? (
      <span className={cn("text-xs text-muted", className)}>No reviews yet</span>
    ) : null;
  }
  const rounded = Math.round(rating * 2) / 2;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs text-muted", className)}>
      <span className="flex" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <svg
            key={i}
            width="13"
            height="13"
            viewBox="0 0 24 24"
            className={i <= rounded ? "fill-amber-400" : "fill-line"}
          >
            <path d="M12 2l3 6.5 7 .9-5 4.8 1.2 7L12 18l-6.4 3.2L6.8 14 1.8 9.4l7-.9z" />
          </svg>
        ))}
      </span>
      <span className="font-medium text-ink">{rating.toFixed(1)}</span>
      {count != null && <span>({count})</span>}
    </span>
  );
}
