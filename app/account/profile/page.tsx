import type { Metadata } from "next";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Container, Field, inputClass } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { profileSchema } from "@/lib/validation";

export const metadata: Metadata = { title: "Edit profile" };

async function updateProfile(formData: FormData) {
  "use server";
  const user = await requireUser("/account/profile");
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) return;
  await createAdminClient()
    .from("users")
    .update({ name: parsed.data.name, phone: parsed.data.phone || null })
    .eq("id", user.id);
  revalidatePath("/account/profile");
  revalidatePath("/account");
}

export default async function ProfilePage() {
  const user = await requireUser("/account/profile");

  return (
    <Container className="max-w-md py-8">
      <Link href="/account" className="text-sm text-muted hover:text-ink">
        ← Back
      </Link>
      <h1 className="mt-3 text-xl font-semibold text-ink">Edit profile</h1>
      <form action={updateProfile} className="mt-6 space-y-4">
        <Field label="Email">
          <input className={inputClass} value={user.email} disabled />
        </Field>
        <Field label="Full name">
          <input name="name" defaultValue={user.name ?? ""} className={inputClass} required />
        </Field>
        <Field label="Phone" hint="Used for pickup/delivery coordination.">
          <input
            name="phone"
            type="tel"
            defaultValue={user.phone ?? ""}
            className={inputClass}
          />
        </Field>
        <Button type="submit">Save changes</Button>
      </form>
    </Container>
  );
}
