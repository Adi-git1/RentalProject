import Link from "next/link";
import { CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/cn";

export function CategoryChips({ active }: { active?: string }) {
  const chip =
    "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors";
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
      <Link
        href="/browse"
        className={cn(
          chip,
          !active
            ? "border-brand-600 bg-brand-600 text-white"
            : "border-line bg-white text-ink hover:bg-surface",
        )}
      >
        All
      </Link>
      {CATEGORIES.map((c) => (
        <Link
          key={c}
          href={`/browse?category=${encodeURIComponent(c)}`}
          className={cn(
            chip,
            active === c
              ? "border-brand-600 bg-brand-600 text-white"
              : "border-line bg-white text-ink hover:bg-surface",
          )}
        >
          {c}
        </Link>
      ))}
    </div>
  );
}
