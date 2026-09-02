import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ItemForm } from "@/components/admin/item-form";
import { PhotoUploader } from "@/components/admin/photo-uploader";
import { DeleteItemButton } from "@/components/admin/delete-item-button";
import { Field, inputClass } from "@/components/ui/primitives";
import { getInventoryDetail } from "@/lib/admin-inventory";
import {
  updateItem,
  addBlockedDate,
  deleteBlockedDate,
} from "@/app/admin/inventory/actions";
import { formatRange, todayISO } from "@/lib/date";

export const metadata: Metadata = { title: "Edit item · Admin" };

export default async function EditItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;
  const detail = await getInventoryDetail(id);
  if (!detail) notFound();
  const { item, photos, blockedDates } = detail;

  return (
    <div className="max-w-2xl">
      <Link href="/admin/inventory" className="text-sm text-muted hover:text-ink">
        ← Inventory
      </Link>
      <div className="mt-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">{item.name}</h1>
        <Link
          href={`/items/${item.slug}`}
          target="_blank"
          className="text-sm text-brand-700 hover:underline"
        >
          View in store ↗
        </Link>
      </div>
      {created && (
        <p className="mt-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-900">
          Item created. Add photos and blocked dates below.
        </p>
      )}

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-ink">Photos</h2>
        <div className="mt-2">
          <PhotoUploader itemId={item.id} photos={photos.map((p) => ({ id: p.id, url: p.url }))} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-ink">Details</h2>
        <div className="mt-3">
          <ItemForm item={item} action={updateItem.bind(null, item.id)} submitLabel="Save changes" />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-ink">Blocked dates</h2>
        <p className="text-xs text-muted">
          Dates the whole item is unavailable (maintenance, personal use, etc.).
        </p>
        <ul className="mt-2 space-y-1">
          {blockedDates.map((bd) => (
            <li
              key={bd.id}
              className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm"
            >
              <span>
                {formatRange(bd.start_date, bd.end_date)}
                {bd.reason && <span className="text-muted"> — {bd.reason}</span>}
              </span>
              <form
                action={async () => {
                  "use server";
                  await deleteBlockedDate(bd.id, item.id);
                }}
              >
                <button className="text-xs text-rose-600 hover:underline">Remove</button>
              </form>
            </li>
          ))}
          {blockedDates.length === 0 && (
            <li className="text-sm text-muted">None.</li>
          )}
        </ul>

        <form
          action={async (fd: FormData) => {
            "use server";
            await addBlockedDate(fd);
          }}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <input type="hidden" name="item_id" value={item.id} />
          <Field label="From">
            <input type="date" name="start_date" min={todayISO()} required className={inputClass} />
          </Field>
          <Field label="To">
            <input type="date" name="end_date" min={todayISO()} required className={inputClass} />
          </Field>
          <Field label="Reason (optional)">
            <input name="reason" className={inputClass} />
          </Field>
          <button className="h-11 rounded-xl bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700">
            Block
          </button>
        </form>
      </section>

      <section className="mt-10 border-t border-line pt-6">
        <h2 className="text-sm font-semibold text-rose-700">Danger zone</h2>
        <div className="mt-2">
          <DeleteItemButton itemId={item.id} />
        </div>
      </section>
    </div>
  );
}
