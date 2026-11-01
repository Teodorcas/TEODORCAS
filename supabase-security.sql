-- ============================================================
-- TEODORCAS — Row Level Security
-- Run this ONCE in the Supabase SQL Editor. Safe to re-run.
-- ============================================================
--
-- WHAT THIS FIXES
--   The admin access code used to live in `config`, a row the anon role
--   could SELECT — meaning it was readable by anyone who opened devtools,
--   and effectively shipped in the JS bundle. It now lives in
--   `admin_credentials`: RLS on, no policy at all, plus an explicit REVOKE,
--   so the anon role cannot touch that table. The app reaches it only
--   through two SECURITY DEFINER functions, and the code is stored as a
--   SHA-256 hash rather than plaintext. Five wrong guesses now locks the
--   check out server-side, where a browser can't reset it.
--
-- WHAT THIS DOES *NOT* FIX — read this before you share the link
--   This app has no Supabase Auth, so every request from the browser
--   arrives as the `anon` role. The tables the pharmacy actually runs on
--   (drugs, sales, debtors, debtor_entries) have to stay open to `anon`,
--   or the app stops working. RLS enabled with a "let anon do anything"
--   policy is a *placeholder* that documents intent and makes the day you
--   add real auth a one-line change — it is NOT a barrier. Anyone holding
--   the anon key can still read and rewrite your stock, sales and debtor
--   balances without ever seeing a login screen.
--
--   Two real fixes, pick one later:
--     (a) enable Supabase Auth for a single admin user, then change every
--         `to anon` below to `to authenticated`; or
--     (b) move every query behind a Vercel serverless function holding the
--         service_role key, so the browser never receives a Supabase key.
--
--   Until one of those lands, treat this deployment as publicly writable.
-- ============================================================


-- ─── 1. Move the admin code out of the client-readable table ──────────────

create table if not exists admin_credentials (
  id text primary key default 'access_codes',
  code_hash text not null,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz default now()
);

-- Only an install that still has config.admin_code needs migrating. A fresh
-- run of supabase-schema.sql already puts the code here, hashed.
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name   = 'config'
       and column_name  = 'admin_code'
  ) then
    -- hash whatever code is stored today so it stops being readable
    insert into admin_credentials (id, code_hash, updated_at)
    select id, encode(sha256(convert_to(admin_code, 'UTF8')), 'hex'), now()
    from config
    on conflict (id) do update
      set code_hash = excluded.code_hash, updated_at = excluded.updated_at;

    -- app_mode stays behind: the store mode switch needs it.
    alter table config drop column admin_code;
  end if;
end $$;


-- ─── 2. Turn Row Level Security on everywhere ─────────────────────────────

alter table config            enable row level security;
alter table drugs             enable row level security;
alter table sales             enable row level security;
alter table debtors           enable row level security;
alter table debtor_entries    enable row level security;
alter table sync_state        enable row level security;
alter table admin_credentials enable row level security;


-- ─── 3. Placeholder policies for the working tables ───────────────────────
-- These keep the app running today. Change `to anon` to `to authenticated`
-- when Supabase Auth is added — nothing else in the schema has to move.

drop policy if exists "anon can use config"      on config;
drop policy if exists "anon can use drugs"       on drugs;
drop policy if exists "anon can use sales"       on sales;
drop policy if exists "anon can use debtors"     on debtors;
drop policy if exists "anon can use entries"     on debtor_entries;
drop policy if exists "anon can bump versions"   on sync_state;

create policy "anon can use config"    on config          for all to anon using (true) with check (true);
create policy "anon can use drugs"     on drugs           for all to anon using (true) with check (true);
create policy "anon can use sales"     on sales           for all to anon using (true) with check (true);
create policy "anon can use debtors"   on debtors         for all to anon using (true) with check (true);
create policy "anon can use entries"   on debtor_entries  for all to anon using (true) with check (true);

-- sync_state is written by the bump_sync_state() triggers, which run as the
-- invoking role — without this the triggers would fail and every sale insert
-- with them. The counters hold no data.
create policy "anon can bump versions" on sync_state      for all to anon using (true) with check (true);

-- admin_credentials deliberately gets NO policy. RLS with no policy means
-- every statement is denied for roles that are not the table owner.
revoke all on table admin_credentials from anon, authenticated;


-- ─── 4. The only two ways in ──────────────────────────────────────────────
-- SECURITY DEFINER runs these as the owner (postgres), which bypasses RLS,
-- so the anon role can prove it knows the code without ever reading it.

create or replace function public.verify_admin_code(p_code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.admin_credentials%rowtype;
  v_hash text := encode(sha256(convert_to(coalesce(p_code, ''), 'UTF8')), 'hex');
  v_attempts integer;
begin
  select * into v from public.admin_credentials where id = 'access_codes';
  if not found then
    return 'wrong';
  end if;

  -- a lock that has run out stops counting, the way the client does
  if v.locked_until is not null and v.locked_until <= now() then
    update public.admin_credentials
       set failed_attempts = 0, locked_until = null, updated_at = now()
     where id = 'access_codes';
    v.failed_attempts := 0;
    v.locked_until := null;
  end if;

  if v.locked_until is not null and v.locked_until > now() then
    return 'locked';
  end if;

  if v.code_hash = v_hash then
    update public.admin_credentials
       set failed_attempts = 0, locked_until = null, updated_at = now()
     where id = 'access_codes';
    return 'ok';
  end if;

  v_attempts := v.failed_attempts + 1;
  update public.admin_credentials
     set failed_attempts = v_attempts,
         locked_until = case when v_attempts >= 5
                             then now() + ((v_attempts - 4) * 30) * interval '1 second'
                             else locked_until end,
         updated_at = now()
   where id = 'access_codes';
  return 'wrong';
end;
$$;

-- Changing the code requires knowing the current one, otherwise this
-- function would hand the whole app to anyone with the anon key.
create or replace function public.change_admin_code(p_current text, p_new text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_new is null or p_new !~ '^[0-9]{4,8}$' then
    return false;
  end if;
  if public.verify_admin_code(p_current) <> 'ok' then
    return false;
  end if;

  update public.admin_credentials
     set code_hash = encode(sha256(convert_to(p_new, 'UTF8')), 'hex'),
         failed_attempts = 0,
         locked_until = null,
         updated_at = now()
   where id = 'access_codes';
  return true;
end;
$$;

revoke execute on function public.verify_admin_code(text) from public;
revoke execute on function public.change_admin_code(text, text) from public;
grant  execute on function public.verify_admin_code(text) to anon, authenticated;
grant  execute on function public.change_admin_code(text, text) to anon, authenticated;


-- ─── 5. Checks ────────────────────────────────────────────────────────────
-- Run these in the SQL Editor to confirm the lock held:

--   select relname, relrowsecurity from pg_class
--    where relnamespace = 'public'::regnamespace and relkind = 'r'
--    order by relname;
--     every table must show relrowsecurity = t
--
--   select code_hash from admin_credentials;
--     must be 64 hex characters, NOT your code
--
--   select verify_admin_code('0000');   -- must return 'wrong'
--   select verify_admin_code('1234');   -- 'ok' if you never changed the code
--   select change_admin_code('1234', '1234');   -- t
--
-- RECOVERY — if you ever lock yourself out, run this in the SQL Editor
-- (it runs as the table owner, so RLS does not apply):
--
--   update admin_credentials
--      set code_hash = encode(sha256(convert_to('1234', 'UTF8')), 'hex'),
--          failed_attempts = 0, locked_until = null, updated_at = now();
