import type { Metadata } from "next";
import { SettingsForm } from "@/components/admin/settings-form";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_SETTINGS } from "@/lib/data";

export const metadata: Metadata = { title: "Settings · Admin" };

export default async function AdminSettingsPage() {
  const { data } = await createAdminClient().from("settings").select("*").eq("id", 1).single();
  const settings = data ?? DEFAULT_SETTINGS;

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-ink">Settings</h1>
      <p className="text-sm text-muted">
        Business info, delivery rules, tax rate, and the policy text shown to customers.
      </p>
      <div className="mt-6">
        <SettingsForm settings={settings} />
      </div>
    </div>
  );
}
