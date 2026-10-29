create table if not exists public.entechemmanur_admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text not null unique,
  role text not null default 'admin' check (role in ('admin', 'editor')),
  created_at timestamptz not null default now()
);

create table if not exists public.entechemmanur_signup_requests (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.entechemmanur_is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.entechemmanur_admin_users
    where user_id = auth.uid()
  );
$$;

create or replace function public.entechemmanur_capture_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.entechemmanur_signup_requests (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Unnamed applicant'),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists entechemmanur_on_auth_user_created on auth.users;
create trigger entechemmanur_on_auth_user_created
  after insert on auth.users
  for each row execute function public.entechemmanur_capture_signup();

alter table public.entechemmanur_admin_users enable row level security;
alter table public.entechemmanur_signup_requests enable row level security;

create policy "Admins can read admin users"
  on public.entechemmanur_admin_users for select
  to authenticated using (public.entechemmanur_is_admin());

create policy "Admins can promote users"
  on public.entechemmanur_admin_users for insert
  to authenticated with check (public.entechemmanur_is_admin());

create policy "Applicants can read their request"
  on public.entechemmanur_signup_requests for select
  to authenticated using (id = auth.uid() or public.entechemmanur_is_admin());

create policy "Admins can update requests"
  on public.entechemmanur_signup_requests for update
  to authenticated using (public.entechemmanur_is_admin()) with check (public.entechemmanur_is_admin());
