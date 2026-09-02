"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/primitives";
import { updateSettings } from "@/app/admin/settings/actions";
import type { SettingsRow } from "@/lib/database.types";

export function SettingsForm({ settings }: { settings: SettingsRow }) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateSettings(fd);
      if (res.error) setError(res.error);
      else setSaved(true);
    });
  }

  const ta = `${inputClass} h-auto py-2`;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <fieldset className="rounded-xl border border-line p-4">
        <legend className="px-1 text-sm font-medium text-ink">Business</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business name">
            <input name="business_name" defaultValue={settings.business_name} className={inputClass} required />
          </Field>
          <Field label="Logo URL" hint="Optional; paste a hosted image URL.">
            <input name="logo_url" defaultValue={settings.logo_url ?? ""} className={inputClass} />
          </Field>
          <Field label="Contact email">
            <input name="contact_email" type="email" defaultValue={settings.contact_email ?? ""} className={inputClass} />
          </Field>
          <Field label="Contact phone">
            <input name="contact_phone" defaultValue={settings.contact_phone ?? ""} className={inputClass} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Pickup address">
              <input name="pickup_address" defaultValue={settings.pickup_address} className={inputClass} required />
            </Field>
          </div>
        </div>
      </fieldset>

      <fieldset className="rounded-xl border border-line p-4">
        <legend className="px-1 text-sm font-medium text-ink">Delivery, tax &amp; rules</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Delivery radius (miles)">
            <input name="delivery_radius_miles" type="number" step="0.1" defaultValue={settings.delivery_radius_miles} className={inputClass} />
          </Field>
          <Field label="Delivery fee ($)">
            <input name="delivery_fee" type="number" step="0.01" defaultValue={settings.delivery_fee} className={inputClass} />
          </Field>
          <Field label="Free delivery over ($)">
            <input name="free_delivery_threshold" type="number" step="0.01" defaultValue={settings.free_delivery_threshold} className={inputClass} />
          </Field>
          <Field label="Minimum rental (days)">
            <input name="min_rental_days" type="number" min={1} defaultValue={settings.min_rental_days} className={inputClass} />
          </Field>
          <Field label="Sales tax rate (%)" hint="e.g. 6 for Loudoun County">
            <input
              name="tax_rate_percent"
              type="number"
              step="0.01"
              defaultValue={(settings.tax_rate * 100).toString()}
              className={inputClass}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="rounded-xl border border-line p-4">
        <legend className="px-1 text-sm font-medium text-ink">Policy text</legend>
        <div className="space-y-4">
          <Field label="Cancellation policy">
            <textarea name="cancellation_policy" rows={2} defaultValue={settings.cancellation_policy} className={ta} />
          </Field>
          <Field label="Late fee policy">
            <textarea name="late_fee_policy" rows={2} defaultValue={settings.late_fee_policy} className={ta} />
          </Field>
          <Field label="Full rental terms" hint="Shown on /terms and in the terms checkbox.">
            <textarea name="terms_text" rows={5} defaultValue={settings.terms_text} className={ta} />
          </Field>
        </div>
      </fieldset>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {saved && <p className="text-sm text-brand-700">Settings saved.</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
