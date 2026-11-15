-- Valou : tableau de bord des calculs (prix de référence par poste)
-- À coller UNE fois dans Supabase → SQL Editor → Run.
-- Ensuite, remplace TON-EMAIL dans la dernière ligne par l'adresse avec laquelle tu te connectes, et exécute-la.
--
-- valou_tarifs        : prix retenus, publiés (lus par l'appli Valou, pour tout le monde)
-- valou_tarifs_admin  : tes artisans participants et leurs propositions de prix (privé : toi seul)
-- valou_admins        : qui a le droit de modifier (toi)

create table if not exists public.valou_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.valou_admins enable row level security;
drop policy if exists "valou_admins_moi" on public.valou_admins;
create policy "valou_admins_moi" on public.valou_admins for select to authenticated using (user_id = auth.uid());

create or replace function public.valou_is_admin() returns boolean
  language sql stable security definer set search_path = public
  as $$ select exists (select 1 from public.valou_admins where user_id = auth.uid()) $$;
revoke all on function public.valou_is_admin() from public;
grant execute on function public.valou_is_admin() to anon, authenticated;

create table if not exists public.valou_tarifs (
  id text primary key default 'ref' check (id = 'ref'),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);
alter table public.valou_tarifs enable row level security;
drop policy if exists "valou_tarifs_lecture" on public.valou_tarifs;
create policy "valou_tarifs_lecture" on public.valou_tarifs for select to anon, authenticated using (true);
drop policy if exists "valou_tarifs_ajout" on public.valou_tarifs;
create policy "valou_tarifs_ajout" on public.valou_tarifs for insert to authenticated with check (public.valou_is_admin());
drop policy if exists "valou_tarifs_modif" on public.valou_tarifs;
create policy "valou_tarifs_modif" on public.valou_tarifs for update to authenticated using (public.valou_is_admin()) with check (public.valou_is_admin());
grant select on public.valou_tarifs to anon, authenticated;
grant insert, update on public.valou_tarifs to authenticated;

create table if not exists public.valou_tarifs_admin (
  id text primary key default 'ref' check (id = 'ref'),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.valou_tarifs_admin enable row level security;
drop policy if exists "valou_tarifs_admin_moi" on public.valou_tarifs_admin;
create policy "valou_tarifs_admin_moi" on public.valou_tarifs_admin for all to authenticated using (public.valou_is_admin()) with check (public.valou_is_admin());
grant select, insert, update on public.valou_tarifs_admin to authenticated;

-- date de mise à jour automatique
create or replace function public.valou_touch() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists valou_tarifs_touch on public.valou_tarifs;
create trigger valou_tarifs_touch before update on public.valou_tarifs for each row execute function public.valou_touch();
drop trigger if exists valou_tarifs_admin_touch on public.valou_tarifs_admin;
create trigger valou_tarifs_admin_touch before update on public.valou_tarifs_admin for each row execute function public.valou_touch();

-- DERNIÈRE ÉTAPE : te donner le droit de modifier (remplace TON-EMAIL, puis exécute cette ligne)
-- insert into public.valou_admins (user_id) select id from auth.users where email = 'TON-EMAIL' on conflict do nothing;
