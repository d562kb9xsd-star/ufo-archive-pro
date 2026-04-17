alter table public.profiles enable row level security;
alter table public.cases enable row level security;

create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = user_id and role = 'admin'
  );
$$;

drop policy if exists "profiles read own" on public.profiles;
create policy "profiles read own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "public read approved cases" on public.cases;
create policy "public read approved cases"
  on public.cases
  for select
  to anon, authenticated
  using (status = 'approved' or public.is_admin(auth.uid()));

drop policy if exists "anyone can insert cases" on public.cases;
create policy "anyone can insert cases"
  on public.cases
  for insert
  to anon, authenticated
  with check (status = 'pending');

drop policy if exists "admins manage cases" on public.cases;
create policy "admins manage cases"
  on public.cases
  for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "public view media"
  on storage.objects
  for select
  to public
  using (bucket_id = 'ufo-media');

drop policy if exists "upload media" on storage.objects;
create policy "upload media"
  on storage.objects
  for insert
  to public
  with check (bucket_id = 'ufo-media');

drop policy if exists "admins update media" on storage.objects;
create policy "admins update media"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'ufo-media' and public.is_admin(auth.uid()))
  with check (bucket_id = 'ufo-media' and public.is_admin(auth.uid()));

drop policy if exists "admins delete media" on storage.objects;
create policy "admins delete media"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'ufo-media' and public.is_admin(auth.uid()));
