-- ============================================================================
-- Storage buckets + policies for item photos and branding assets.
-- Wrapped so a lack of privilege on storage.objects (rare, project-dependent)
-- doesn't roll back the rest of the schema — if it fails, create the two public
-- buckets in the Supabase dashboard (Storage) and add "admin write" policies.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('item-photos', 'item-photos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

do $$
begin
  drop policy if exists "atr storage public read" on storage.objects;
  create policy "atr storage public read" on storage.objects
    for select using (bucket_id in ('item-photos', 'branding'));

  drop policy if exists "atr storage admin write" on storage.objects;
  create policy "atr storage admin write" on storage.objects
    for all using (bucket_id in ('item-photos', 'branding') and public.is_admin())
    with check (bucket_id in ('item-photos', 'branding') and public.is_admin());
exception
  when insufficient_privilege then
    raise notice 'Skipped storage.objects policies (insufficient privilege) — add them from the dashboard.';
end $$;
