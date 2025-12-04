begin;

insert into storage.buckets (id, name, public)
values ('salons', 'salons', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('public', 'public', true)
on conflict (id) do nothing;

alter table storage.objects enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Public read salons bucket'
  ) then
    create policy "Public read salons bucket"
      on storage.objects for select
      to public
      using (bucket_id = 'salons');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Public read public bucket'
  ) then
    create policy "Public read public bucket"
      on storage.objects for select
      to public
      using (bucket_id = 'public');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Authenticated insert salons bucket'
  ) then
    create policy "Authenticated insert salons bucket"
      on storage.objects for insert
      to authenticated
      with check (bucket_id = 'salons');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Authenticated update salons bucket'
  ) then
    create policy "Authenticated update salons bucket"
      on storage.objects for update
      to authenticated
      using (bucket_id = 'salons')
      with check (bucket_id = 'salons');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Authenticated delete salons bucket'
  ) then
    create policy "Authenticated delete salons bucket"
      on storage.objects for delete
      to authenticated
      using (bucket_id = 'salons');
  end if;
end $$;

commit;
