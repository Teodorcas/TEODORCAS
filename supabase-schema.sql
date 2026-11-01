-- ============================================================
-- TEODORCAS PHARMACY — Full schema
-- Run this ONCE in the Supabase SQL Editor of the new project.
-- ============================================================

drop table if exists debtor_entries cascade;
drop table if exists debtors cascade;
drop table if exists sales cascade;
drop table if exists drugs cascade;
drop table if exists sync_state cascade;
drop table if exists admin_credentials cascade;
drop table if exists config cascade;
drop table if exists otp_codes cascade;

-- ─── CONFIG ────────────────────────────────────────────────
-- Holds only the store mode. The admin code is deliberately NOT here: this
-- table has to stay readable for the Selling / Debtors switch, and anything
-- the anon role can read is public. See admin_credentials below.
create table config (
  id text primary key default 'access_codes',
  app_mode text not null default 'selling' check (app_mode in ('selling', 'debtors')),
  updated_at timestamptz default now()
);

insert into config (id, app_mode) values ('access_codes', 'selling');

-- ADMIN CREDENTIALS — the access code, hashed.
-- RLS is on with no policy, so the anon role gets nothing from this table.
-- The app reaches it only through the verify_admin_code() and
-- change_admin_code() SECURITY DEFINER functions in supabase-security.sql.
create table admin_credentials (
  id text primary key default 'access_codes',
  code_hash text not null,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz default now()
);

insert into admin_credentials (id, code_hash)
values ('access_codes', encode(sha256(convert_to('1234', 'UTF8')), 'hex'));

-- ─── DRUGS ─────────────────────────────────────────────────
-- pack_type 'sachet' -> sold/stored as loose sachets (sachets_per_carton = 1)
-- pack_type 'carton' -> stored in cartons; sachets_per_carton >= 1
-- stock_sachets is numeric because a dose sale takes a FRACTION of a sachet:
-- two doses out of a sachet of ten leaves 9.8 on the shelf.
create table drugs (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  pack_type text not null check (pack_type in ('sachet', 'carton')),
  sachets_per_carton integer not null default 1 check (sachets_per_carton >= 1),
  price_per_sachet numeric(10,2) not null check (price_per_sachet > 0),
  price_per_carton numeric(10,2) not null default 0,
  stock_cartons integer not null default 0 check (stock_cartons >= 0),
  stock_sachets numeric(10,2) not null default 0 check (stock_sachets >= 0),
  restock_threshold integer not null default 0 check (restock_threshold >= 0),
  icon text not null default 'Pill',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── SALES ─────────────────────────────────────────────────
-- batch_id groups every drug line belonging to one checkout.
-- sachets is numeric: a custom (dose) line stores the fraction sold, e.g. 0.2.
create table sales (
  id uuid primary key default gen_random_uuid(),
  drug_id uuid references drugs(id) on delete set null,
  drug_name text not null,
  sachets numeric(10,2) not null check (sachets > 0),
  unit_price numeric(10,2) not null,
  final_amount numeric(10,2) not null,
  batch_id uuid,
  timestamp timestamptz default now()
);

create index sales_timestamp_idx on sales (timestamp desc);
create index sales_batch_idx on sales (batch_id);

-- ─── DEBTORS ───────────────────────────────────────────────
create table debtors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- names are unique but case-insensitive: "Chidi Okafor" == "chidi okafor"
create unique index debtors_name_lower_idx on debtors (lower(name));

-- One ledger row per event. balance_after is the debtor's running
-- balance at that moment, so the list page never has to aggregate.
create table debtor_entries (
  id uuid primary key default gen_random_uuid(),
  debtor_id uuid not null references debtors(id) on delete cascade,
  type text not null check (type in ('debt', 'payment')),
  amount numeric(10,2) not null check (amount > 0),
  note text,
  balance_after numeric(10,2) not null,
  timestamp timestamptz default now()
);

create index debtor_entries_debtor_idx on debtor_entries (debtor_id, timestamp desc);

-- ─── SYNC STATE (cache versioning) ─────────────────────────
-- One lightweight row per table. Bumped by the triggers below so the
-- client can poll a single tiny request every 10s and refetch only
-- the tables that actually changed.
create table sync_state (
  table_name text primary key,
  version bigint not null default 0
);

insert into sync_state (table_name, version) values
  ('config', 0),
  ('drugs', 0),
  ('sales', 0),
  ('debtors', 0),
  ('debtor_entries', 0);

create or replace function bump_sync_state() returns trigger
language plpgsql as $$
begin
  insert into sync_state (table_name, version)
  values (tg_table_name, (extract(epoch from clock_timestamp()) * 1000)::bigint)
  on conflict (table_name) do update set version = excluded.version;
  return null;
end;
$$;

-- FOR EACH STATEMENT: a multi-row insert counts as ONE version bump.
create trigger trg_config_sync   after insert or update or delete on config
  for each statement execute function bump_sync_state();
create trigger trg_drugs_sync    after insert or update or delete on drugs
  for each statement execute function bump_sync_state();
create trigger trg_sales_sync    after insert or update or delete on sales
  for each statement execute function bump_sync_state();
create trigger trg_debtors_sync  after insert or update or delete on debtors
  for each statement execute function bump_sync_state();
create trigger trg_entries_sync  after insert or update or delete on debtor_entries
  for each statement execute function bump_sync_state();

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────
-- This file only builds the tables. Now run supabase-security.sql in the
-- same SQL Editor: it turns RLS on for every table, locks admin_credentials
-- away from the anon role and adds the two functions the app uses to check
-- and change the access code. Until it has run, the admin code is readable
-- by anyone holding the anon key.
