alter table public.entechemmanur_bus_timings
  add column if not exists bus_name text not null default '';
