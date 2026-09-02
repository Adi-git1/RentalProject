"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/primitives";
import { CATEGORIES } from "@/lib/constants";
import type { ItemRow } from "@/lib/database.types";

type SpecRow = { key: string; value: string };

export function ItemForm({
  item,
  action,
  submitLabel,
}: {
  item?: ItemRow;
  action: (formData: FormData) => Promise<{ error?: string; ok?: boolean }>;
  submitLabel: string;
}) {
  const [specs, setSpecs] = useState<SpecRow[]>(
    item ? Object.entries(item.specs ?? {}).map(([key, value]) => ({ key, value })) : [],
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await action(fd);
      if (res?.error) setError(res.error);
      else if (res?.ok) setSaved(true);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Name">
            <input name="name" required defaultValue={item?.name} className={inputClass} />
          </Field>
        </div>
        <Field label="Category">
          <select
            name="category"
            defaultValue={item?.category ?? CATEGORIES[0]}
            className={inputClass}
          >
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Quantity in inventory">
          <input
            name="quantity"
            type="number"
            min={0}
            required
            defaultValue={item?.quantity ?? 1}
            className={inputClass}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Description">
            <textarea
              name="description"
              rows={4}
              defaultValue={item?.description}
              className={`${inputClass} h-auto py-2`}
            />
          </Field>
        </div>
        <Field label="Dimensions" hint="e.g. 72&quot; x 30&quot; x 29&quot;">
          <input name="dimensions" defaultValue={item?.dimensions ?? ""} className={inputClass} />
        </Field>
        <Field label="Weight" hint="e.g. 32 lb">
          <input name="weight" defaultValue={item?.weight ?? ""} className={inputClass} />
        </Field>
      </div>

      <fieldset className="rounded-xl border border-line p-4">
        <legend className="px-1 text-sm font-medium text-ink">Pricing (USD)</legend>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Per day">
            <input
              name="price_day"
              type="number"
              step="0.01"
              min={0}
              required
              defaultValue={item?.price_day}
              className={inputClass}
            />
          </Field>
          <Field label="Weekend (Fri–Sun)" hint="optional">
            <input
              name="price_weekend"
              type="number"
              step="0.01"
              min={0}
              defaultValue={item?.price_weekend ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Per week" hint="optional">
            <input
              name="price_week"
              type="number"
              step="0.01"
              min={0}
              defaultValue={item?.price_week ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Security deposit">
            <input
              name="deposit"
              type="number"
              step="0.01"
              min={0}
              required
              defaultValue={item?.deposit ?? 0}
              className={inputClass}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="rounded-xl border border-line p-4">
        <legend className="px-1 text-sm font-medium text-ink">Specs</legend>
        <div className="space-y-2">
          {specs.map((s, i) => (
            <div key={i} className="flex gap-2">
              <input
                name="spec_key"
                value={s.key}
                onChange={(e) =>
                  setSpecs((rows) => rows.map((r, j) => (j === i ? { ...r, key: e.target.value } : r)))
                }
                placeholder="Label"
                className={inputClass}
              />
              <input
                name="spec_value"
                value={s.value}
                onChange={(e) =>
                  setSpecs((rows) => rows.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)))
                }
                placeholder="Value"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setSpecs((rows) => rows.filter((_, j) => j !== i))}
                className="shrink-0 px-2 text-muted hover:text-rose-600"
                aria-label="Remove spec"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setSpecs((rows) => [...rows, { key: "", value: "" }])}
            className="text-sm font-medium text-brand-700 hover:underline"
          >
            + Add spec
          </button>
        </div>
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="active"
          defaultChecked={item ? item.active : true}
        />
        Active — visible in the store
      </label>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {saved && <p className="text-sm text-brand-700">Saved.</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
