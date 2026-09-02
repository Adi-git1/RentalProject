"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { itemSchema, blockedDateSchema } from "@/lib/validation";
import { slugify } from "@/lib/slug";

type Result = { ok?: boolean; error?: string; id?: string };

function parseSpecs(formData: FormData): Record<string, string> {
  const keys = formData.getAll("spec_key").map(String);
  const values = formData.getAll("spec_value").map(String);
  const specs: Record<string, string> = {};
  keys.forEach((k, i) => {
    if (k.trim() && values[i]?.trim()) specs[k.trim()] = values[i].trim();
  });
  return specs;
}

function parseItem(formData: FormData) {
  return itemSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    description: formData.get("description") ?? "",
    dimensions: formData.get("dimensions") ?? "",
    weight: formData.get("weight") ?? "",
    price_day: formData.get("price_day"),
    price_weekend: formData.get("price_weekend") ?? "",
    price_week: formData.get("price_week") ?? "",
    deposit: formData.get("deposit"),
    quantity: formData.get("quantity"),
    active: formData.get("active") === "on" || formData.get("active") === "true",
    specs: parseSpecs(formData),
  });
}

async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  const admin = createAdminClient();
  const slug = base || "item";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? slug : `${slug}-${i + 1}`;
    const { data } = await admin.from("items").select("id").eq("slug", candidate).maybeSingle();
    if (!data || data.id === ignoreId) return candidate;
  }
  return `${slug}-${Date.now()}`;
}

export async function createItem(formData: FormData): Promise<Result> {
  await requireAdmin();
  const parsed = parseItem(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(" ") };
  }
  const admin = createAdminClient();
  const slug = await uniqueSlug(slugify(parsed.data.name));
  const { data, error } = await admin
    .from("items")
    .insert({ ...parsed.data, slug })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not create item." };

  revalidatePath("/admin/inventory");
  revalidatePath("/browse");
  redirect(`/admin/inventory/${data.id}?created=1`);
}

export async function updateItem(id: string, formData: FormData): Promise<Result> {
  await requireAdmin();
  const parsed = parseItem(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(" ") };
  }
  const admin = createAdminClient();
  const slug = await uniqueSlug(slugify(parsed.data.name), id);
  const { error } = await admin
    .from("items")
    .update({ ...parsed.data, slug })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/inventory");
  revalidatePath(`/admin/inventory/${id}`);
  revalidatePath("/browse");
  revalidatePath(`/items/${slug}`);
  return { ok: true };
}

export async function setItemActive(id: string, active: boolean): Promise<Result> {
  await requireAdmin();
  await createAdminClient().from("items").update({ active }).eq("id", id);
  revalidatePath("/admin/inventory");
  revalidatePath("/browse");
  return { ok: true };
}

export async function deleteItem(id: string): Promise<Result> {
  await requireAdmin();
  const admin = createAdminClient();
  const { count } = await admin
    .from("booking_items")
    .select("id", { count: "exact", head: true })
    .eq("item_id", id);
  if ((count ?? 0) > 0) {
    return {
      error:
        "This item has bookings and can't be deleted. Set it inactive instead to hide it from the store.",
    };
  }
  await admin.from("items").delete().eq("id", id);
  revalidatePath("/admin/inventory");
  revalidatePath("/browse");
  redirect("/admin/inventory");
}

export async function addPhoto(itemId: string, url: string): Promise<Result> {
  await requireAdmin();
  const admin = createAdminClient();
  const { count } = await admin
    .from("item_photos")
    .select("id", { count: "exact", head: true })
    .eq("item_id", itemId);
  const { error } = await admin
    .from("item_photos")
    .insert({ item_id: itemId, url, sort: count ?? 0 });
  if (error) return { error: error.message };
  revalidatePath(`/admin/inventory/${itemId}`);
  revalidatePath("/browse");
  return { ok: true };
}

export async function deletePhoto(photoId: string, itemId: string): Promise<Result> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: photo } = await admin
    .from("item_photos")
    .select("url")
    .eq("id", photoId)
    .single();
  await admin.from("item_photos").delete().eq("id", photoId);

  // best-effort storage cleanup
  if (photo?.url) {
    const marker = "/item-photos/";
    const idx = photo.url.indexOf(marker);
    if (idx >= 0) {
      const path = photo.url.slice(idx + marker.length);
      await admin.storage.from("item-photos").remove([path]);
    }
  }
  revalidatePath(`/admin/inventory/${itemId}`);
  revalidatePath("/browse");
  return { ok: true };
}

export async function movePhoto(
  photoId: string,
  itemId: string,
  direction: "up" | "down",
): Promise<Result> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: photos } = await admin
    .from("item_photos")
    .select("id, sort")
    .eq("item_id", itemId)
    .order("sort");
  if (!photos) return { error: "No photos." };
  const idx = photos.findIndex((p) => p.id === photoId);
  const swap = direction === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || swap < 0 || swap >= photos.length) return { ok: true };
  await admin.from("item_photos").update({ sort: photos[swap].sort }).eq("id", photos[idx].id);
  await admin.from("item_photos").update({ sort: photos[idx].sort }).eq("id", photos[swap].id);
  revalidatePath(`/admin/inventory/${itemId}`);
  revalidatePath("/browse");
  return { ok: true };
}

export async function addBlockedDate(formData: FormData): Promise<Result> {
  await requireAdmin();
  const parsed = blockedDateSchema.safeParse({
    item_id: formData.get("item_id"),
    start_date: formData.get("start_date"),
    end_date: formData.get("end_date"),
    reason: formData.get("reason") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(" ") };
  }
  const { error } = await createAdminClient().from("blocked_dates").insert({
    item_id: parsed.data.item_id,
    start_date: parsed.data.start_date,
    end_date: parsed.data.end_date,
    reason: parsed.data.reason || null,
  });
  if (error) return { error: error.message };
  revalidatePath(`/admin/inventory/${parsed.data.item_id}`);
  revalidatePath("/browse");
  return { ok: true };
}

export async function deleteBlockedDate(id: string, itemId: string): Promise<Result> {
  await requireAdmin();
  await createAdminClient().from("blocked_dates").delete().eq("id", id);
  revalidatePath(`/admin/inventory/${itemId}`);
  revalidatePath("/browse");
  return { ok: true };
}
