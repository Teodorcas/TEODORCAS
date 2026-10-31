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

The full schema lives in [`supabase-schema.sql`](./supabase-schema.sql) at the
repo root. Paste it into the Supabase SQL Editor (Dashboard → SQL Editor → New
Query) and run it **once**.

It creates:

| Table | Purpose |
|---|---|
| `config` | Access code and the global Selling / Debtors mode |
| `drugs` | Drug catalogue with carton + sachet stock and pricing |
| `sales` | One row per line item (multi-drug checkout writes several rows) |
| `debtors` | Debtor names |
| `debtor_entries` | Debt and payment ledger, with a running `balance_after` |
| `sync_state` | Version counters bumped by database triggers — kept, no longer read by the app |

It also seeds `config` with the default admin code and `app_mode = 'selling'`.

> **Note:** RLS is intentionally **not** enabled — see
> [Before going public](#before-going-public).

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

Default login code:

- **Admin:** `1234`

> Change it immediately after first login via **Settings → Access Code**.

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

This build is currently meant for **local / private use**. Before opening it to
anyone else, add:

1. **Row Level Security** on every table in Supabase.
2. **Supabase Auth** so the anon key is no longer a blanket credential — right
   now anyone with the deployed URL and anon key can reach the REST API
   directly.
3. A code review of `vercel.json` — it still carries a stale `/api/*` rewrite
   from the previous version of this project, and the `android-twa/`,
   `public/.well-known/assetlinks.json` and `public/icons/` folders still carry
   the old app's name, package id and URL.

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
