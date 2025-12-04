begin;

alter table public.salons add column if not exists photo_url text;

commit;
