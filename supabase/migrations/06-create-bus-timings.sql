create table if not exists public.entechemmanur_bus_timings (
  id uuid primary key default gen_random_uuid(),
  route_name text not null,
  direction text not null,
  departure_time time not null,
  arrival_time time,
  via text,
  operating_days text not null default 'Daily',
  is_published boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.entechemmanur_bus_timings enable row level security;

create policy "Public can read published bus timings"
  on public.entechemmanur_bus_timings for select
  to anon, authenticated
  using (is_published = true);

create policy "Admins can manage bus timings"
  on public.entechemmanur_bus_timings for all
  to authenticated
  using (public.entechemmanur_is_admin())
  with check (public.entechemmanur_is_admin());
