create table if not exists public.entechemmanur_site_settings (
  key text primary key,
  value text not null,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

alter table public.entechemmanur_site_settings enable row level security;

create policy "Public can read site settings"
  on public.entechemmanur_site_settings for select
  to anon, authenticated using (true);

create policy "Admins can manage site settings"
  on public.entechemmanur_site_settings for all
  to authenticated
  using (public.entechemmanur_is_admin())
  with check (public.entechemmanur_is_admin());

insert into public.entechemmanur_site_settings (key, value)
values
  ('hero_image_url', 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=2200&q=85'),
  ('hero_eyebrow', 'A living map of Kerala · 10°40′N 76°02′E'),
  ('hero_title', 'Find your way back home.'),
  ('hero_description', 'A new way to experience Chammanoor — its green roads, familiar landmarks and the people who make this place feel like home.')
on conflict (key) do nothing;

insert into storage.buckets (id, name, public)
values ('entechemmanur_media', 'entechemmanur_media', true)
on conflict (id) do update set public = true;

create policy "Public can view Entechemmanur media"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'entechemmanur_media');

create policy "Admins can upload Entechemmanur media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'entechemmanur_media' and public.entechemmanur_is_admin());

create policy "Admins can update Entechemmanur media"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'entechemmanur_media' and public.entechemmanur_is_admin())
  with check (bucket_id = 'entechemmanur_media' and public.entechemmanur_is_admin());

create policy "Admins can delete Entechemmanur media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'entechemmanur_media' and public.entechemmanur_is_admin());
