import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let slugs: string[] = [];
  try {
    const { data } = await createAdminClient()
      .from("items")
      .select("slug")
      .eq("active", true);
    slugs = (data ?? []).map((r) => r.slug);
  } catch {
    slugs = [];
  }

  const staticPaths = ["", "/browse", "/how-it-works", "/terms"];

  return [
    ...staticPaths.map((p) => ({
      url: `${SITE_URL}${p}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
    })),
    ...slugs.map((slug) => ({
      url: `${SITE_URL}/items/${slug}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
    })),
  ];
}
