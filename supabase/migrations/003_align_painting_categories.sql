alter table public.paintings
drop constraint if exists paintings_category_check;

alter table public.paintings
add constraint paintings_category_check
check (category in ('anime', 'gaming', 'fantasy', 'cartoon', 'nature'));
