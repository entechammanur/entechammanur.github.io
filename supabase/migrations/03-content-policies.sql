do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'entechemmanur_directory_listings',
    'entechemmanur_landmarks',
    'entechemmanur_notices',
    'entechemmanur_events'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('create policy "%s public read" on public.%I for select to anon, authenticated using (is_published = true)', table_name, table_name);
    execute format('create policy "%s admin manage" on public.%I for all to authenticated using (public.entechemmanur_is_admin()) with check (public.entechemmanur_is_admin())', table_name, table_name);
  end loop;
end $$;
