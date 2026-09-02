import type { Metadata } from "next";
import Link from "next/link";
import { ItemForm } from "@/components/admin/item-form";
import { createItem } from "@/app/admin/inventory/actions";

export const metadata: Metadata = { title: "New item · Admin" };

export default function NewItemPage() {
  return (
    <div className="max-w-2xl">
      <Link href="/admin/inventory" className="text-sm text-muted hover:text-ink">
        ← Inventory
      </Link>
      <h1 className="mt-3 text-xl font-semibold text-ink">New item</h1>
      <p className="text-sm text-muted">
        Save the basics first, then add photos and blocked dates.
      </p>
      <div className="mt-6">
        <ItemForm action={createItem} submitLabel="Create item" />
      </div>
    </div>
  );
}
