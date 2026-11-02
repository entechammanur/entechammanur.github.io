insert into public.entechemmanur_site_settings (key, value)
values
  ('about_intro', 'A small place in Chavakkad taluk, Thrissur district, Kerala.'),
  ('about_location', 'Thrissur, Kerala'),
  ('about_location_detail', 'Chavakkad taluk, close to Punnayurkulam.'),
  ('about_pin_code', '679561'),
  ('about_pin_detail', 'Shared with Punnayurkulam post office.')
on conflict (key) do nothing;
