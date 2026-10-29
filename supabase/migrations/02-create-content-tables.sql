create table if not exists public.entechemmanur_directory_listings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  description text,
  phone text,
  whatsapp text,
  address text,
  latitude double precision,
  longitude double precision,
  opening_hours jsonb not null default '{}'::jsonb,
  is_verified boolean not null default false,
  is_published boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.entechemmanur_landmarks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  latitude double precision not null,
  longitude double precision not null,
  is_published boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.entechemmanur_notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  severity text not null default 'info' check (severity in ('info', 'important', 'urgent')),
  is_published boolean not null default false,
  published_until timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.entechemmanur_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  venue text,
  latitude double precision,
  longitude double precision,
  is_published boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
