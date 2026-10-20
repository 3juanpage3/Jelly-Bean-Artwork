update public.paintings
set medium = 'Acrylic'
where medium <> 'Acrylic';

alter table public.paintings
add constraint paintings_medium_acrylic check (medium = 'Acrylic');

alter table public.paintings
drop column if exists sort_order;