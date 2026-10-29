-- Replace only the email address below, then run this in Supabase SQL Editor.
do $$
declare
  admin_email text := 'admin@example.com';
  auth_user auth.users%rowtype;
begin
  select *
  into auth_user
  from auth.users
  where lower(email) = lower(admin_email)
  limit 1;

  if auth_user.id is null then
    raise exception 'No Supabase Auth user found for email: %', admin_email;
  end if;

  insert into public.entechemmanur_admin_users (
    user_id,
    display_name,
    email,
    role
  )
  values (
    auth_user.id,
    coalesce(nullif(auth_user.raw_user_meta_data ->> 'full_name', ''), auth_user.email),
    auth_user.email,
    'admin'
  )
  on conflict (user_id) do update
  set email = excluded.email,
      role = 'admin';

  update public.entechemmanur_signup_requests
  set status = 'approved',
      reviewed_at = now()
  where id = auth_user.id;

  raise notice 'Admin access granted to %', auth_user.email;
end $$;
