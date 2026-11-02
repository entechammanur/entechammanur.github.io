alter table public.entechemmanur_bus_timings
  add column if not exists route_group text;

update public.entechemmanur_bus_timings
set route_group = coalesce(
  nullif(trim(route_group), ''),
  nullif(trim(last_stop), ''),
  nullif(trim(direction), ''),
  route_name
)
where route_group is null
   or trim(route_group) = '';

alter table public.entechemmanur_bus_timings
  alter column route_group set not null;
