"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";

export function Gallery({
  photos,
  alt,
}: {
  photos: { url: string }[];
  alt: string;
}) {
  const [active, setActive] = useState(0);
  if (photos.length === 0) {
    return (
      <div className="grid aspect-[4/3] w-full place-items-center rounded-[var(--radius-card)] border border-line bg-surface text-muted">
        No photos
      </div>
    );
  }

  return (
    <div>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
        <Image
          src={photos[active].url}
          alt={`${alt} — photo ${active + 1}`}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 640px"
          className="object-cover"
        />
      </div>
      {photos.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {photos.map((p, i) => (
            <button
              key={p.url}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View photo ${i + 1}`}
              aria-current={i === active}
              className={cn(
                "relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2",
                i === active ? "border-brand-600" : "border-transparent",
              )}
            >
              <Image src={p.url} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
