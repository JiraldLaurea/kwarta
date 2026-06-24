# Kwarta Project Overview

Kwarta is a personal finance and budget tracking app built with Next.js, Supabase, PostgreSQL, Prisma, Tailwind CSS, and Recharts. It helps a signed-in user track transactions, organize income and expense categories, set monthly category budgets, and review spending activity through responsive dashboard views.

## Purpose

The project focuses on fast, mobile-friendly budget management. The main user flow is:

1. Sign in with Google through Supabase Auth.
2. Create or manage income and expense categories.
3. Add transactions from the home dashboard, transactions page, or quick-add category cards.
4. Set monthly budget limits for expense categories.
5. Review totals, cash flow, budget progress, recent activity, and reports.
6. Import or export JSON backups for transactions and budgets.

## Main Features

- Google authentication through Supabase.
- Dashboard metrics for income, expenses, balance, and spending.
- Category quick-add cards with mobile list/card layout options.
- Accounts/wallets page listing connected banks, e-cash (e.g. GCash), and physical cash with computed balances and a total-balance summary. Manual now, with fields reserved for future automatic bank/e-wallet syncing.
- Account-to-account transfers with an optional fee (deducted from the source account). Transfers move money between wallets without counting as income or expense, and appear in a transfers history on the Accounts page.
- Transaction creation, editing, deletion, grouping, account assignment, and backup import/export.
- Monthly budgets with reusable budget support.
- Budget progress lines and over-budget states.
- Settings for budget tracking, home layout, backup tools, and account access.
- Responsive desktop modals and mobile bottom sheets.
- PWA metadata, app icons, and service worker shell support.

## Tech Stack

- **Framework:** Next.js App Router
- **Language:** TypeScript
- **UI:** React, Tailwind CSS, local shadcn-style primitives
- **Charts:** Recharts
- **Forms and validation:** React Hook Form, Zod
- **Authentication:** Supabase Auth
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Deployment target:** Vercel

## Project Structure

```text
app/
  api/workspace/        Workspace persistence API route
  auth/callback/        Supabase auth callback route
  globals.css           Global Tailwind styles
  layout.tsx            App metadata and root layout
  manifest.ts           PWA manifest
  page.tsx              Root app entry

components/
  kwarta-app.tsx        Main app state, navigation, auth, and view routing
  kwarta/               Kwarta feature views and shared finance UI
  ui/                   Local reusable UI primitives

lib/
  kwarta/               Finance helpers and backup utilities
  supabase/             Supabase browser and server clients
  data.ts               Seed/demo workspace data
  schema.ts             Zod schemas
  types.ts              Shared app types
  prisma.ts             Prisma client setup

prisma/
  schema.prisma         Database models

docs/
  DESIGN.md             Visual system and component guidelines
  deployment-vercel.md  Vercel and Supabase deployment checklist
  kwarta-tech-stack.md  Stack notes and future ideas
```

## Data Model Summary

Kwarta persists four main entities:

- **Category:** user-owned income or expense category with name, color, and relations to budgets and transactions.
- **Account:** user-owned wallet (bank, e-wallet, or cash) with name, type, color, icon, and an opening balance. Includes API-ready fields (`provider`, `externalId`, `syncStatus`) reserved for a future bank/e-wallet aggregation integration. Balances are computed as opening balance plus linked income minus linked expenses.
- **Transaction:** user-owned income or expense entry with amount, merchant, optional note, date, category, and an optional linked account.
- **Transfer:** user-owned movement of funds between two accounts with an amount, optional fee, and date. The source account loses the amount plus fee; the destination gains the amount. Transfers affect account balances only and are excluded from income/expense totals, charts, and budgets.
- **Budget:** user-owned monthly category limit with amount, month, and category.

The Prisma schema uses PostgreSQL decimal fields for money values and indexes user and category IDs for common workspace queries.

## Development

Install dependencies:

```bash
npm install
```

Create local environment variables:

```bash
cp .env.example .env.local
```

Generate Prisma and sync the database:

```bash
npm run prisma:generate
npm run prisma:push
```

Start the dev server:

```bash
npm run dev
```

Verify a production build:

```bash
npm run build:verify
```

## Environment Variables

Kwarta expects these variables in `.env.local` and in Vercel:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
DATABASE_URL=
DIRECT_URL=
```

Use `.env.example` as the template. Do not commit real Supabase keys or database credentials.

## Deployment Notes

The app is designed for Vercel hosting with Supabase for auth and Postgres. Use Node.js 20.x, the default Next.js build output, and the environment variables listed above. Before the first production deployment, push the Prisma schema to the production database.

See `docs/deployment-vercel.md` for the full deployment checklist.

## Related Docs

- `README.md`
- `docs/DESIGN.md`
- `docs/kwarta-tech-stack.md`
- `docs/deployment-vercel.md`
