"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { addPhoto, deletePhoto, movePhoto } from "@/app/admin/inventory/actions";

interface Photo {
  id: string;
  url: string;
}

export function PhotoUploader({
  itemId,
  photos,
}: {
  itemId: string;
  photos: Photo[];
}) {
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function handleFiles(files: FileList) {
    setError(null);
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        if (file.size > 8 * 1024 * 1024) {
          setError(`${file.name} is over 8MB.`);
          continue;
        }
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${itemId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("item-photos")
          .upload(path, file, { cacheControl: "3600", upsert: false });
        if (upErr) {
          setError(upErr.message);
          continue;
        }
        const { data } = supabase.storage.from("item-photos").getPublicUrl(path);
        const res = await addPhoto(itemId, data.publicUrl);
        if (res.error) setError(res.error);
      }
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {photos.map((p, i) => (
          <div key={p.id} className="group relative aspect-square overflow-hidden rounded-lg border border-line bg-surface">
            <Image src={p.url} alt="" fill sizes="150px" className="object-cover" />
            {i === 0 && (
              <span className="absolute left-1 top-1 rounded bg-brand-600 px-1 text-[10px] font-medium text-white">
                Cover
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/40 p-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                aria-label="Move left"
                className="text-white disabled:opacity-30"
                disabled={i === 0}
                onClick={() => startTransition(() => void movePhoto(p.id, itemId, "up"))}
              >
                ◀
              </button>
              <button
                type="button"
                aria-label="Delete photo"
                className="text-white"
                onClick={() => startTransition(() => void deletePhoto(p.id, itemId))}
              >
                ✕
              </button>
              <button
                type="button"
                aria-label="Move right"
                className="text-white disabled:opacity-30"
                disabled={i === photos.length - 1}
                onClick={() => startTransition(() => void movePhoto(p.id, itemId, "down"))}
              >
                ▶
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="grid aspect-square place-items-center rounded-lg border-2 border-dashed border-line text-xs text-muted hover:border-brand-400 hover:text-brand-700"
        >
          {busy ? "Uploading…" : "+ Add photos"}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
      <p className="mt-2 text-xs text-muted">
        First photo is the cover. JPG/PNG/WebP up to 8MB each.
      </p>
    </div>
  );
}
