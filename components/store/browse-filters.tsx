"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { CATEGORIES } from "@/lib/constants";
import { inputClass, selectClass } from "@/components/ui/primitives";
import { todayISO } from "@/lib/date";

export function BrowseFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const [q, setQ] = useState(params.get("q") ?? "");

  const update = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      startTransition(() => router.push(`/browse?${next.toString()}`, { scroll: false }));
    },
    [params, router],
  );

  const start = params.get("start") ?? "";
  const end = params.get("end") ?? "";

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          update({ q: q.trim() || null });
        }}
        className="flex gap-2"
      >
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search tables, tents, speakers…"
          className={inputClass}
          aria-label="Search items"
        />
        <button
          type="submit"
          className="h-11 shrink-0 rounded-xl bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
        >
          Search
        </button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-medium text-muted">
          Category
          <select
            className={`${selectClass} mt-1`}
            value={params.get("category") ?? ""}
            onChange={(e) => update({ category: e.target.value || null })}
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-medium text-muted">
          Sort
          <select
            className={`${selectClass} mt-1`}
            value={params.get("sort") ?? "newest"}
            onChange={(e) => update({ sort: e.target.value === "newest" ? null : e.target.value })}
          >
            <option value="newest">Newest</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
        </label>

        <div className="text-xs font-medium text-muted">
          Price / day
          <div className="mt-1 flex items-center gap-2">
            <input
              type="number"
              min={0}
              placeholder="Min"
              defaultValue={params.get("min") ?? ""}
              onBlur={(e) => update({ min: e.target.value || null })}
              className={inputClass}
            />
            <span className="text-muted">–</span>
            <input
              type="number"
              min={0}
              placeholder="Max"
              defaultValue={params.get("max") ?? ""}
              onBlur={(e) => update({ max: e.target.value || null })}
              className={inputClass}
            />
          </div>
        </div>

        <div className="text-xs font-medium text-muted">
          Available for dates
          <div className="mt-1 flex items-center gap-2">
            <input
              type="date"
              min={todayISO()}
              value={start}
              onChange={(e) => update({ start: e.target.value || null })}
              className={inputClass}
              aria-label="Start date"
            />
            <input
              type="date"
              min={start || todayISO()}
              value={end}
              onChange={(e) => update({ end: e.target.value || null })}
              className={inputClass}
              aria-label="End date"
            />
          </div>
        </div>
      </div>

      {(params.toString().length > 0) && (
        <button
          type="button"
          onClick={() => startTransition(() => router.push("/browse", { scroll: false }))}
          className="text-xs font-medium text-brand-700 hover:underline"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}
