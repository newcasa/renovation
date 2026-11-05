-- Kozi : « Booster une annonce » côté serveur (Supabase / PostgreSQL)
-- À coller dans Supabase → SQL Editor → Run, quand les annonces seront partagées sur le serveur.
-- Garanties : jamais plus de N places par zone et par période (verrou par zone + transaction),
-- place retenue pendant le paiement puis attribuée seulement après confirmation, libérée en cas d'échec,
-- tâche planifiée (pg_cron) qui démarre les boosts réservés et termine les boosts expirés.

-- 1. Réglages (back-office : modifiables dans Table Editor → kozi_boost_config, sans toucher au code)
create table if not exists public.kozi_boost_config (
  id int primary key default 1 check (id = 1),
  places_max int not null default 3,
  hold_minutes int not null default 15,
  prix jsonb not null default '{"couleur":{"7":9,"15":15},"commune":{"7":19,"15":32},"region":{"7":39,"15":65},"national":{"7":79,"15":129}}'
);
insert into public.kozi_boost_config(id) values (1) on conflict do nothing;

-- 2. Boosts
create table if not exists public.kozi_boosts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  listing_id text not null,
  agency text,
  formule text not null check (formule in ('couleur','commune','region','national')),
  zone_key text not null default '',
  zone_label text,
  couleur text not null check (couleur in ('blanc','ciel','sauge','jaune','rose','lavande','peche','perle')),
  jours int not null check (jours in (7,15)),
  prix numeric not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  statut text not null default 'pending' check (statut in ('pending','reserved','active','ended','failed','cancelled')),
  hold_until timestamptz,
  paid_at timestamptz,
  vues int not null default 0, clics int not null default 0, contacts int not null default 0,
  notif_start boolean not null default false, notif_soon boolean not null default false, notif_end boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists kozi_boosts_zone on public.kozi_boosts(zone_key, starts_at, ends_at) where statut in ('pending','reserved','active');
alter table public.kozi_boosts enable row level security;
alter table public.kozi_boost_config enable row level security;
drop policy if exists "boosts : les miens" on public.kozi_boosts;
create policy "boosts : les miens" on public.kozi_boosts for select to authenticated using (auth.uid() = user_id);
drop policy if exists "config : lecture" on public.kozi_boost_config;
create policy "config : lecture" on public.kozi_boost_config for select using (true);
grant select on public.kozi_boosts to authenticated;
grant select on public.kozi_boost_config to anon, authenticated;
-- (aucune écriture directe : tout passe par les fonctions ci-dessous)

-- 3. Places occupées dans une zone sur une période
create or replace function public.kozi_boost_used(p_zone text, p_from timestamptz, p_to timestamptz)
returns int language sql stable as $$
  select count(*)::int from public.kozi_boosts
  where zone_key = p_zone and starts_at < p_to and ends_at > p_from
    and (statut in ('reserved','active') or (statut = 'pending' and hold_until > now()));
$$;

-- 4. Places restantes / date de libération (affichage avant achat)
create or replace function public.kozi_boost_availability(p_zone text, p_jours int)
returns table(libres int, max int, prochaine timestamptz) language plpgsql stable security definer set search_path = public as $$
declare mx int; d interval := make_interval(days => p_jours); c timestamptz;
begin
  select places_max into mx from kozi_boost_config where id = 1;
  if kozi_boost_used(p_zone, now(), now() + d) < mx then
    return query select mx - kozi_boost_used(p_zone, now(), now() + interval '1 second'), mx, null::timestamptz; return;
  end if;
  for c in select distinct ends_at from kozi_boosts where zone_key = p_zone and ends_at > now()
             and (statut in ('reserved','active') or (statut='pending' and hold_until > now())) order by ends_at loop
    if kozi_boost_used(p_zone, c, c + d) < mx then return query select 0, mx, c; return; end if;
  end loop;
  return query select 0, mx, null::timestamptz;
end $$;

-- 5. Réserver une place (mode 'now' ou 'reserve') : verrou par zone → deux agences ne peuvent pas prendre la même place
create or replace function public.kozi_boost_book(p_listing text, p_agency text, p_formule text, p_zone text, p_zone_label text,
  p_couleur text, p_jours int, p_mode text default 'now', p_from timestamptz default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare cfg kozi_boost_config; d interval := make_interval(days => p_jours); t0 timestamptz := greatest(now(), coalesce(p_from, now()));
  st timestamptz; c timestamptz; v_id uuid; px numeric;
begin
  if auth.uid() is null then raise exception 'non connecté'; end if;
  select * into cfg from kozi_boost_config c0 where c0.id = 1;
  px := (cfg.prix -> p_formule ->> p_jours::text)::numeric;
  if px is null then raise exception 'tarif manquant'; end if;
  if p_formule <> 'couleur' then
    perform pg_advisory_xact_lock(hashtext('kozi_boost:' || p_zone));   -- verrou exclusif sur la zone jusqu'à la fin de la transaction
    if kozi_boost_used(p_zone, t0, t0 + d) < cfg.places_max then st := t0;
    elsif p_mode = 'reserve' then
      for c in select distinct ends_at from kozi_boosts where zone_key = p_zone and ends_at > t0
                 and (statut in ('reserved','active') or (statut='pending' and hold_until > now())) order by ends_at loop
        if kozi_boost_used(p_zone, c, c + d) < cfg.places_max then st := c; exit; end if;
      end loop;
    end if;
    if st is null then return jsonb_build_object('complet', true); end if;
  else st := t0; end if;
  insert into kozi_boosts(listing_id, agency, formule, zone_key, zone_label, couleur, jours, prix, starts_at, ends_at, statut, hold_until)
  values (p_listing, p_agency, p_formule, case when p_formule='couleur' then '' else p_zone end, p_zone_label, p_couleur, p_jours, px, st, st + d, 'pending', now() + make_interval(mins => cfg.hold_minutes))
  returning kozi_boosts.id into v_id;
  return jsonb_build_object('id', v_id, 'debut', st, 'fin', st + d, 'prix', px);
end $$;

-- 6. Résultat du paiement (à appeler par le webhook du prestataire de paiement, jamais par l'appli directement en production)
create or replace function public.kozi_boost_payment(p_id uuid, p_ok boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare b kozi_boosts;
begin
  select * into b from kozi_boosts where id = p_id for update;
  if b.id is null or b.statut <> 'pending' then return jsonb_build_object('erreur','etat'); end if;
  if not p_ok or b.hold_until < now() then update kozi_boosts set statut = 'failed' where id = p_id; return jsonb_build_object('echec', true); end if;
  if b.starts_at <= now() then
    update kozi_boosts set paid_at = now(), statut = 'active', starts_at = now(), ends_at = now() + make_interval(days => jours) where id = p_id;
  else
    update kozi_boosts set paid_at = now(), statut = 'reserved' where id = p_id;
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- 7. Tâche planifiée : libère les paiements abandonnés, démarre les réservés, termine les expirés, prépare les notifications
create or replace function public.kozi_boost_tick() returns void language plpgsql security definer set search_path = public as $$
begin
  update kozi_boosts set statut = 'failed' where statut = 'pending' and hold_until < now();
  update kozi_boosts set statut = 'active', notif_start = true where statut = 'reserved' and starts_at <= now();
  update kozi_boosts set notif_soon = true where statut = 'active' and not notif_soon and ends_at - now() <= interval '2 days';
  update kozi_boosts set statut = 'ended', notif_end = true where statut = 'active' and ends_at <= now();
end $$;

-- 8. Annonces en tête de liste pour une zone de recherche (visiteurs, sans données privées)
create or replace function public.kozi_boost_top(p_zone text)
returns table(listing_id text, couleur text) language sql stable security definer set search_path = public as $$
  select listing_id, couleur from kozi_boosts where statut = 'active' and zone_key = p_zone and now() between starts_at and ends_at;
$$;
-- Droits : par défaut PostgreSQL ouvre toute fonction à tout le monde (PUBLIC) : on referme puis on ouvre au cas par cas.
revoke execute on function public.kozi_boost_used(text,timestamptz,timestamptz), public.kozi_boost_availability(text,int), public.kozi_boost_top(text),
  public.kozi_boost_book(text,text,text,text,text,text,int,text,timestamptz), public.kozi_boost_payment(uuid,boolean), public.kozi_boost_tick() from public, anon, authenticated;
grant execute on function public.kozi_boost_availability(text,int), public.kozi_boost_top(text) to anon, authenticated;
grant execute on function public.kozi_boost_book(text,text,text,text,text,text,int,text,timestamptz) to authenticated;
-- kozi_boost_payment et kozi_boost_tick : uniquement le serveur (webhook de paiement, tâche planifiée), jamais l'appli.

-- 9. Planification toutes les 5 minutes (Database → Extensions → activer « pg_cron » avant de lancer cette ligne)
-- select cron.schedule('kozi-boost-tick', '*/5 * * * *', $$select public.kozi_boost_tick()$$);
