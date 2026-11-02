begin;

-- Keep content, but remove references to the accounts being deleted.
update public.entechemmanur_directory_listings set created_by = null where created_by is not null;
update public.entechemmanur_landmarks set created_by = null where created_by is not null;
update public.entechemmanur_notices set created_by = null where created_by is not null;
update public.entechemmanur_events set created_by = null where created_by is not null;
update public.entechemmanur_bus_timings set created_by = null where created_by is not null;
update public.entechemmanur_site_settings set updated_by = null where updated_by is not null;
update public.entechemmanur_signup_requests set reviewed_by = null where reviewed_by is not null;

delete from auth.users;

commit;