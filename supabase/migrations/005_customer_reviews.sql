create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  artwork text not null default ''
    check (char_length(artwork) <= 120),
  display_name text not null default ''
    check (char_length(display_name) <= 80),
  painting_rating smallint not null
    check (painting_rating between 1 and 5),
  service_rating smallint not null
    check (service_rating between 1 and 5),
  comment text not null
    check (char_length(btrim(comment)) between 1 and 1200),
  publication_consent boolean not null default false,
  status text not null default 'pending'
    check (status in ('pending', 'published', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviews_published_with_consent
    check (status <> 'published' or publication_consent)
);

create index if not exists reviews_status_created_at_idx
on public.reviews (status, created_at desc);

create or replace function public.initialize_customer_review()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.status = 'pending';
  new.created_at = now();
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists reviews_initialize on public.reviews;
create trigger reviews_initialize
before insert on public.reviews
for each row execute function public.initialize_customer_review();

drop trigger if exists reviews_updated_at on public.reviews;
create trigger reviews_updated_at
before update on public.reviews
for each row execute function public.set_painting_updated_at();

alter table public.reviews enable row level security;

revoke all on public.reviews from anon, authenticated;
grant select, insert on public.reviews to anon;
grant select, insert, update, delete on public.reviews to authenticated;

drop policy if exists "Public can submit consented pending reviews" on public.reviews;
create policy "Public can submit consented pending reviews"
on public.reviews for insert
to anon, authenticated
with check (
  status = 'pending'
  and publication_consent
);

drop policy if exists "Public can read consented published reviews" on public.reviews;
create policy "Public can read consented published reviews"
on public.reviews for select
to anon, authenticated
using (
  status = 'published'
  and publication_consent
);

drop policy if exists "Catalogue admins can read all reviews" on public.reviews;
create policy "Catalogue admins can read all reviews"
on public.reviews for select
to authenticated
using (
  auth.uid() in (
    'c3005cbd-75cb-4f64-9fd6-71cfa8ca9ddb'::uuid,
    '5d158ab9-0346-4e84-8268-5fa0ff389c8e'::uuid
  )
);

drop policy if exists "Catalogue admins can update reviews" on public.reviews;
create policy "Catalogue admins can update reviews"
on public.reviews for update
to authenticated
using (
  auth.uid() in (
    'c3005cbd-75cb-4f64-9fd6-71cfa8ca9ddb'::uuid,
    '5d158ab9-0346-4e84-8268-5fa0ff389c8e'::uuid
  )
)
with check (
  auth.uid() in (
    'c3005cbd-75cb-4f64-9fd6-71cfa8ca9ddb'::uuid,
    '5d158ab9-0346-4e84-8268-5fa0ff389c8e'::uuid
  )
);

drop policy if exists "Catalogue admins can delete reviews" on public.reviews;
create policy "Catalogue admins can delete reviews"
on public.reviews for delete
to authenticated
using (
  auth.uid() in (
    'c3005cbd-75cb-4f64-9fd6-71cfa8ca9ddb'::uuid,
    '5d158ab9-0346-4e84-8268-5fa0ff389c8e'::uuid
  )
);

notify pgrst, 'reload schema';
