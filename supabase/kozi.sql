-- Kozi : tables de synchronisation entre appareils.
-- À coller une seule fois dans Supabase → SQL Editor → New query → Run.
-- Chaque utilisateur ne peut lire et modifier que SES données (sécurité « Row Level Security »).

create table if not exists public.kozi_state (
  user_id    uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  ts         bigint not null,
  state      jsonb  not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.kozi_photos (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  u       text not null,
  adr     text,
  data    text not null,
  cap     text,
  t       bigint,
  primary key (user_id, u)
);

alter table public.kozi_state  enable row level security;
alter table public.kozi_photos enable row level security;

drop policy if exists "kozi_state : mes données"  on public.kozi_state;
drop policy if exists "kozi_photos : mes photos"  on public.kozi_photos;

create policy "kozi_state : mes données" on public.kozi_state
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "kozi_photos : mes photos" on public.kozi_photos
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- mise à jour automatique de la date
create or replace function public.kozi_touch() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists kozi_state_touch on public.kozi_state;
create trigger kozi_state_touch before update on public.kozi_state
  for each row execute function public.kozi_touch();
