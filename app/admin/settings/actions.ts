"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { settingsSchema } from "@/lib/validation";

export async function updateSettings(
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  await requireAdmin();

  const taxPercent = formData.get("tax_rate_percent");
  const parsed = settingsSchema.safeParse({
    business_name: formData.get("business_name"),
    contact_email: formData.get("contact_email") ?? "",
    contact_phone: formData.get("contact_phone") ?? "",
    pickup_address: formData.get("pickup_address"),
    delivery_radius_miles: formData.get("delivery_radius_miles"),
    delivery_fee: formData.get("delivery_fee"),
    free_delivery_threshold: formData.get("free_delivery_threshold"),
    min_rental_days: formData.get("min_rental_days"),
    tax_rate: taxPercent != null ? Number(taxPercent) / 100 : formData.get("tax_rate"),
    cancellation_policy: formData.get("cancellation_policy") ?? "",
    late_fee_policy: formData.get("late_fee_policy") ?? "",
    terms_text: formData.get("terms_text") ?? "",
    logo_url: formData.get("logo_url") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(" ") };
  }

  const { error } = await createAdminClient()
    .from("settings")
    .update({
      ...parsed.data,
      contact_email: parsed.data.contact_email || null,
      contact_phone: parsed.data.contact_phone || null,
      logo_url: parsed.data.logo_url || null,
    })
    .eq("id", 1);

  if (error) return { error: error.message };

  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}
