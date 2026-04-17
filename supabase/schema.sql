create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null check (type in ('image', 'video', 'case-study', 'document')),
  date_observed date,
  location text not null,
  summary text not null,
  description text,
  case_study text,
  tags text[] not null default '{}',
  media_path text,
  media_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  submitter_email text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.update_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_cases_updated_at on public.cases;
create trigger set_cases_updated_at
  before update on public.cases
  for each row execute procedure public.update_timestamp();

insert into storage.buckets (id, name, public)
values ('ufo-media', 'ufo-media', true)
on conflict (id) do nothing;
