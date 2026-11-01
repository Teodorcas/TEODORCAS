# TEODORCAS

A mobile-first sales and debt management app for a pharmacy that sells drugs in
sachets and cartons.

Drugs are registered in **cartons** and/or **loose sachets**. Selling a drug
consumes loose sachets first and automatically opens a carton when the loose
count runs short. The whole store can be flipped between **Selling** and
**Debtors** mode from the Settings page.

---

## Setup Instructions

### 1. Clone and Install

```bash
git clone <your-github-repo-url>
cd TEODORCAS
npm install
```

### 2. Environment Variables

Create a `.env` file in the root of the project with your Supabase credentials:

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

> ⚠️ Never commit your `.env` file to GitHub. It is already in `.gitignore`.
> On Vercel, add these same variables under Project → Settings → Environment Variables.

### 3. Supabase Setup

Work through these **once**, in this order:

1. [`supabase-schema.sql`](./supabase-schema.sql) — builds the tables.
2. [`supabase-security.sql`](./supabase-security.sql) — turns on Row Level
   Security and moves the access code into a table the anon role cannot read.
   Safe to re-run.
3. **Enable Supabase Auth** — this is what actually closes the database. At
   the top of [`supabase-auth.sql`](./supabase-auth.sql) are the three
   dashboard steps: turn on the Email provider, **turn sign-ups off**, and add
   the single admin user. Then run that file, which drops the interim access
   code layer and swaps every policy from `anon` to `authenticated`.

The tables it leaves you with:

| Table | Purpose |
|---|---|
| `config` | The global Selling / Debtors mode only |
| `drugs` | Drug catalogue with carton + sachet stock and pricing |
| `sales` | One row per line item (multi-drug checkout writes several rows) |
| `debtors` | Debtor names |
| `debtor_entries` | Debt and payment ledger, with a running `balance_after` |
| `sync_state` | Version counters bumped by database triggers — kept, no longer read by the app |

`config` is seeded with `app_mode = 'selling'`. `admin_credentials` exists
between steps 2 and 3 and is dropped by step 3.

> **Note:** RLS is on for every table. After step 3 only a signed-in session
> can reach them — see [Before going public](#before-going-public).

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

Default login code:

- **Admin:** `1234`

> The Supabase admin user is created with the password `teodorcas` + that code,
> so the default is `teodorcas1234`. Change it immediately after first login
> via **Settings → Access Code** — that updates the Supabase Auth password.

### 5. Build for Production

```bash
npm run build
```

---

## Pages

The bottom navigation and routes change with the active store mode.

### Selling mode

| Page | Route | What it does |
|---|---|---|
| Dashboard | `/dashboard` | Sales record, period filters, multi-drug checkout |
| Drugs | `/drugs` | Catalogue with carton/sachet stock and total value |
| Add Drug | `/drugs/add` | Register a drug (carton or sachet, icon, opening stock) |
| Edit Drug | `/drugs/edit/:id` | Edit an existing drug |
| Restock | `/restock` | Add cartons and/or loose sachets, live new-total preview |
| Settings | `/settings` | Mode switch, access code, statement, reset |

### Debtors mode

| Page | Route | What it does |
|---|---|---|
| Debtors Dashboard | `/dashboard` | Totals, Record Debt, Pay Debt |
| Debtors | `/debtors` | Debtor list with search, amount sorting, per-person history |
| Settings | `/settings` | Mode switch, access code, statement, reset |

Legacy paths `/products` and `/products/add` redirect to the drugs pages.

---

## How Selling Works

1. On the Dashboard, tap **Record a Sale**.
2. Search a drug and tap it — it goes straight into the sale at one sachet.
   Type the real number in the small box inside the row. Repeat for as many
   drugs as you like.
3. For a dose sale — the customer buying 2 of the 10 doses in a sachet — flip
   the **Custom** switch beside the search box. A read-only description, an
   amount field and a ＋ button appear. You always search first: tapping a drug
   drops its name into the locked description instead of adding a line. Type
   what the customer paid, tap ＋, and the line joins the sale. Both fields
   clear after every add, ready for the next one. Toggling the switch off
   hides all three again.
4. Tap **Confirm** — the modal lists every item and the grand total.
5. Stock is consumed loose-sachet-first; a carton is opened automatically when
   there are not enough loose sachets. Not enough stock in total blocks the sale.
6. The dashboard, drugs page and restock page update immediately.

**Dose sales remove real stock.** A custom line is a fraction of a sachet —
`amount ÷ price per sachet` — and exactly that much comes off the shelf.
Register a White Capsule carton of 10 sachets at ₦1,000 a sachet, sell 10
doses of ₦100 each, and the shelf goes from `1 carton + 10 sachets` to
`1 carton`; the stock value drops by exactly ₦1,000. Custom lines are always
linked to their drug, so the drugs page, the restock page and the statement
PDF all agree. (The statement adds the fraction into its "Sachets Sold"
column, e.g. 1 carton at 10 doses becomes 9.8.)

Prices are entered per sachet. The **carton price is derived automatically** as
`sachets_per_carton × price_per_sachet` and shown read-only.

---

## Caching

Data is mirrored into `localStorage` so the app paints instantly within a
session. There is **no background polling** — the database is only contacted
when the app asks on purpose.

- **Right after login** everything the app can need is fetched once, in
  parallel, and written to the mirror. This is the only bulk read.
- **Every later read** paints from the mirror with no network request at all.
- **Every write** goes to the database first. On success the collections it
  touched are refetched and written straight back into the mirror, so a sale
  you just recorded is on every screen immediately.
- Signing out clears the mirror, so the next session always starts fresh.
- Cache keys are scoped to the absolute date window, so "Today" can never serve
  yesterday's cached list.
- The mirror is pruned to roughly 2 MB so it cannot overflow the storage quota.

> `sync_state` and its triggers still exist in the schema but are no longer
> read by the app. They are harmless, and are the natural hook if background
> syncing is ever wanted again.

---

## Before going public

The site is deployed, so this section matters. Two of the three items below are
done; the third is not.

### 1. The access code is a real credential — done

The code is no longer a value the client reads and compares against. It is
the password of the single Supabase Auth account, so there is no readable
copy anywhere: not in `config`, not in the JS bundle, not in a database
column. Changing it in **Settings → Access Code** resets that password.

The interim `admin_credentials` table and the two `SECURITY DEFINER`
functions from `supabase-security.sql` are dropped by `supabase-auth.sql`.
They were a stepping stone between "code readable by anyone with the anon
key" and this, and leaving unreachable functions behind is only attack
surface.

### 2. Row Level Security now protects the data — done

Every request reaches the tables as a signed-in `authenticated` session. The
`anon` role has no policies and no table grants left, so the anon key alone
signs nothing in — someone holding it cannot read or rewrite your stock,
sales and debtor balances.

Two things are carrying the weight, and it is worth knowing which:

- **Supabase's sign-in rate limiting.** The 4-digit code is mapped onto the
  Supabase password by prefixing it (`teodorcas` + the code), which is why it
  clears the 6-character minimum. The prefix is public in the bundle and adds
  no entropy at all. 10,000 combinations behind a login screen is a lock on
  the door, not the door.
- **RLS.** This is the part that actually changed. The gate used to be
  cosmetic — a scripted client never had to pass it.

If you want the code itself to be strong, make it six digits (`OtpInput`
takes a `length` prop) and drop the prefix; six digits is 1,000,000
combinations rather than 10,000, for the same login screen.

**Sign-ups must stay off** in Authentication → Settings. Leave them on and
anyone can register an account that passes every policy above.

A stronger setup still exists — move every query behind a Vercel serverless
function holding the `service_role` key, so the browser never receives a
Supabase key at all. Much larger refactor, and not needed for this app's
threat model.

### 3. Leftovers from the previous app — still open

`vercel.json` carries a stale `/api/*` rewrite, and `android-twa/`,
`public/.well-known/assetlinks.json` and `public/icons/` still carry the old
app's name, package id and URL. The APK build is deliberately the last task.
Signing material (`*.keystore`, `cert.der`, `*.apk`, `twa-manifest.json`) is
gitignored and must stay that way.

---

## Design System

Tokens live in `tailwind.config.js` and should not be changed casually:

| Token | Value |
|---|---|
| `primary` | `#1A56DB` |
| `primary-light` | `#EBF2FF` |
| `primary-dark` | `#1240A0` |
| `accent` | `#F97316` |
| `slate-dark` | `#1E293B` |
| `brand.bg` | `#F5F6FA` |
| Card radius | `14px` |
| Button radius | `10px` |
| Font | Poppins |
