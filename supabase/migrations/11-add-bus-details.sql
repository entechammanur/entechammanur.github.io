alter table public.entechemmanur_bus_timings
  add column if not exists last_stop text,
  add column if not exists contact_number text;

update public.entechemmanur_bus_timings
set last_stop = coalesce(nullif(trim(direction), ''), route_name)
where last_stop is null
   or trim(last_stop) = '';

alter table public.entechemmanur_bus_timings
  alter column last_stop set not null;
