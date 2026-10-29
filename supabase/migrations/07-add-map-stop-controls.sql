alter table public.entechemmanur_landmarks
  add column if not exists route_order integer not null default 0,
  add column if not exists is_map_highlighted boolean not null default false,
  add column if not exists location_input text,
  add column if not exists location_type text,
  add column if not exists stop_label text;
