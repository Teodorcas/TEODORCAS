-- ============================================================
-- TEODORCAS — Switch to Supabase Auth
-- Run this in the Supabase SQL Editor, in this order:
--   1. Enable the provider and create the admin user (below)
--   2. Run this file
--   3. Deploy the new build
-- ============================================================
--
-- WHY THIS FILE EXISTS
--   Until now every browser request arrived as the `anon` role, so the
--   placeholder policies in supabase-security.sql had to let it do anything.
--   The app now signs in through Supabase Auth, so requests arrive as
--   `authenticated` and the anon role can be shut out completely. This is
--   the change that actually stops someone with the anon key from rewriting
--   your stock, sales and debtor balances.
--
-- BEFORE RUNNING — in the Supabase Dashboard
--
--   a) Authentication → Providers → Email: enabled (it is by default).
--
--   b) Authentication → Settings: turn OFF "Allow new users to sign up".
--      Leave this on and anyone can register themselves an account that
--      passes these policies. This is the single most important step.
--
--   c) Authentication → Users → "Add user":
--        Email:    admin@teodorcas.app
--        Password: teodorcas<your 4-digit code>   e.g. teodorcas1234
--        Tick "Auto Confirm User".
--
--      The app maps the 4-digit access code onto a Supabase password by
--      prefixing it, because Supabase rejects passwords under 6 characters.
--      The prefix is public (it ships in the bundle) and adds no entropy —
--      the four digits are still the only secret, so Supabase's sign-in
--      rate limiting is doing real work here. 10,000 combinations is
--      guessable by a patient script; treat the code as a lock on the door,
--      not as the door.
--
-- ============================================================


-- ─── 1. Drop the hand-rolled access-code layer ────────────────────────────
-- The code is a Supabase Auth password now, so nothing reads these.

drop function if exists public.verify_admin_code(text);
drop function if exists public.change_admin_code(text, text);
drop table if exists admin_credentials;


-- ─── 2. Take away the policies that let anyone in ─────────────────────────

drop policy if exists "anon can use config"    on config;
drop policy if exists "anon can use drugs"     on drugs;
drop policy if exists "anon can use sales"     on sales;
drop policy if exists "anon can use debtors"   on debtors;
drop policy if exists "anon can use entries"   on debtor_entries;
drop policy if exists "anon can bump versions" on sync_state;


-- ─── 3. Only a signed-in session gets anything ────────────────────────────
-- Change `to anon` to `to authenticated`, as described in the README.

create policy "signed in config"    on config         for all to authenticated using (true) with check (true);
create policy "signed in drugs"     on drugs          for all to authenticated using (true) with check (true);
create policy "signed in sales"     on sales          for all to authenticated using (true) with check (true);
create policy "signed in debtors"   on debtors        for all to authenticated using (true) with check (true);
create policy "signed in entries"   on debtor_entries for all to authenticated using (true) with check (true);

-- sync_state is written by the bump_sync_state() triggers, which run as the
-- invoking role — without this the triggers would fail and every sale insert
-- with them. The counters hold no data.
create policy "signed in versions" on sync_state      for all to authenticated using (true) with check (true);

-- Belt and braces: RLS already refuses anon, this removes its table grants
-- as well so the deny does not depend on one setting staying correct.
revoke all on table config          from anon;
revoke all on table drugs           from anon;
revoke all on table sales           from anon;
revoke all on table debtors         from anon;
revoke all on table debtor_entries  from anon;
revoke all on table sync_state      from anon;


-- ─── 4. Checks ────────────────────────────────────────────────────────────
--   select policyname, roles from pg_policies where schemaname = 'public';
--     every row must show roles = {authenticated}
--
--   select relname, relrowsecurity from pg_class
--    where relnamespace = 'public'::regnamespace and relkind = 'r'
--    order by relname;
--     every table must show relrowsecurity = t
--
--   admin_credentials, verify_admin_code() and change_admin_code() must all
--   be gone.
--
-- If you ever need back in after losing the code, reset it from the SQL
-- Editor, which runs as the table owner and is unaffected by any of this:
--
--   update auth.users
--      set encrypted_password = crypt('teodorcas1234', gen_salt('bf'))
--    where email = 'admin@teodorcas.app';
--
-- (that one needs pgcrypto: `create extension if not exists pgcrypto;`)
