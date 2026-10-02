-- Replace c3005cbd-75cb-4f64-9fd6-71cfa8ca9ddb with the owner's Supabase Auth user UUID before applying.
create table public.paintings (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  slug text unique not null,
  category text not null check (category in ('anime', 'nature', 'fantasy')),
  dimensions text not null check (char_length(dimensions) between 1 and 80),
  medium text not null check (char_length(medium) between 1 and 120),
  description text not null check (char_length(description) between 1 and 2000),
  price_zar integer not null check (price_zar >= 0),
  image_path text not null,
  image_alt text not null check (char_length(image_alt) between 1 and 250),
  status text not null default 'draft'
    check (status in ('draft', 'available', 'sold', 'archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.set_painting_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger paintings_updated_at
before update on public.paintings
for each row execute function public.set_painting_updated_at();

alter table public.paintings enable row level security;

grant select on public.paintings to anon, authenticated;
grant insert, update, delete on public.paintings to authenticated;

create policy "Public can read available paintings"
on public.paintings for select
to anon, authenticated
using (status = 'available');

create policy "Owner can read all paintings"
on public.paintings for select
to authenticated
using (auth.uid() = 'c3005cbd-75cb-4f64-9fd6-71cfa8ca9ddb'::uuid);

create policy "Owner can insert paintings"
on public.paintings for insert
to authenticated
with check (auth.uid() = 'c3005cbd-75cb-4f64-9fd6-71cfa8ca9ddb'::uuid);

create policy "Owner can update paintings"
on public.paintings for update
to authenticated
using (auth.uid() = 'c3005cbd-75cb-4f64-9fd6-71cfa8ca9ddb'::uuid)
with check (auth.uid() = 'c3005cbd-75cb-4f64-9fd6-71cfa8ca9ddb'::uuid);

create policy "Owner can delete paintings"
on public.paintings for delete
to authenticated
using (auth.uid() = 'c3005cbd-75cb-4f64-9fd6-71cfa8ca9ddb'::uuid);

create policy "Owner can upload artwork"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'artwork'
  and auth.uid() = 'c3005cbd-75cb-4f64-9fd6-71cfa8ca9ddb'::uuid
);

create policy "Owner can update artwork"
on storage.objects for update
to authenticated
using (
  bucket_id = 'artwork'
  and auth.uid() = 'c3005cbd-75cb-4f64-9fd6-71cfa8ca9ddb'::uuid
)
with check (
  bucket_id = 'artwork'
  and auth.uid() = 'c3005cbd-75cb-4f64-9fd6-71cfa8ca9ddb'::uuid
);

create policy "Owner can remove artwork"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'artwork'
  and auth.uid() = 'c3005cbd-75cb-4f64-9fd6-71cfa8ca9ddb'::uuid
);