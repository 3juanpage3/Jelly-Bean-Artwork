drop policy if exists "Owner can read all paintings" on public.paintings;
create policy "Owner can read all paintings"
on public.paintings for select
to authenticated
using (
  auth.uid() in (
    'c3005cbd-75cb-4f64-9fd6-71cfa8ca9ddb'::uuid,
    '5d158ab9-0346-4e84-8268-5fa0ff389c8e'::uuid
  )
);

drop policy if exists "Owner can insert paintings" on public.paintings;
create policy "Owner can insert paintings"
on public.paintings for insert
to authenticated
with check (
  auth.uid() in (
    'c3005cbd-75cb-4f64-9fd6-71cfa8ca9ddb'::uuid,
    '5d158ab9-0346-4e84-8268-5fa0ff389c8e'::uuid
  )
);

drop policy if exists "Owner can update paintings" on public.paintings;
create policy "Owner can update paintings"
on public.paintings for update
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

drop policy if exists "Owner can delete paintings" on public.paintings;
create policy "Owner can delete paintings"
on public.paintings for delete
to authenticated
using (
  auth.uid() in (
    'c3005cbd-75cb-4f64-9fd6-71cfa8ca9ddb'::uuid,
    '5d158ab9-0346-4e84-8268-5fa0ff389c8e'::uuid
  )
);

drop policy if exists "Owner can upload artwork" on storage.objects;
create policy "Owner can upload artwork"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'artwork'
  and auth.uid() in (
    'c3005cbd-75cb-4f64-9fd6-71cfa8ca9ddb'::uuid,
    '5d158ab9-0346-4e84-8268-5fa0ff389c8e'::uuid
  )
);

drop policy if exists "Owner can update artwork" on storage.objects;
create policy "Owner can update artwork"
on storage.objects for update
to authenticated
using (
  bucket_id = 'artwork'
  and auth.uid() in (
    'c3005cbd-75cb-4f64-9fd6-71cfa8ca9ddb'::uuid,
    '5d158ab9-0346-4e84-8268-5fa0ff389c8e'::uuid
  )
)
with check (
  bucket_id = 'artwork'
  and auth.uid() in (
    'c3005cbd-75cb-4f64-9fd6-71cfa8ca9ddb'::uuid,
    '5d158ab9-0346-4e84-8268-5fa0ff389c8e'::uuid
  )
);

drop policy if exists "Owner can remove artwork" on storage.objects;
create policy "Owner can remove artwork"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'artwork'
  and auth.uid() in (
    'c3005cbd-75cb-4f64-9fd6-71cfa8ca9ddb'::uuid,
    '5d158ab9-0346-4e84-8268-5fa0ff389c8e'::uuid
  )
);
