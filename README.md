# Kwarta

Kwarta is a responsive personal finance app for tracking income, expenses,
budgets, accounts, and transfers. It is built with Next.js, Supabase Auth,
PostgreSQL, Prisma, Tailwind CSS, and Recharts.

## Features

### Finance workspace

- Home dashboard with category quick-add, period summaries, recent activity,
  spending charts, cash flow, and budget progress.
- Monthly, weekly, and custom twice-monthly budget-cycle views.
- Income and expense transactions with categories, subcategories, accounts,
  dates, times, notes, editing, and deletion.
- Category management with custom colors, icons, and drag-reorderable
  subcategories.
- Category budgets with reusable limits, remaining balances, over-budget states,
  and aggregate segmented progress.
- Bank, e-wallet, and cash accounts with opening balances and calculated current
  balances.
- Account-to-account transfers with optional fees and editable transfer history.
- Reports for income, expenses, and spending across the selected period.

### Preferences and backup

- List and card layouts for Home category items.
- Light and dark modes with black/white, blue, green, and purple accent themes.
- Optional budget tracking for users who want expense logging without limits.
- Full-workspace JSON import and export.
- A latest automatic local backup that can be downloaded or restored.

### Responsive experience

- Desktop sidebar navigation and centered edit dialogs.
- Fixed mobile tab navigation.
- Dedicated full-screen mobile quick-add flow to avoid keyboard and viewport
  conflicts.
- Responsive date, month, week, and budget-cycle pickers.
- Installable PWA metadata and maskable app icons.

### Authentication and persistence

- Supabase email/password and Google authentication.
- PostgreSQL workspace persistence through Prisma and the Next.js workspace API.
- User-scoped categories, accounts, transactions, transfers, and budgets.

## Tech Stack

- Next.js 14 App Router and React 18
- TypeScript
- Tailwind CSS and local shadcn-style UI primitives
- React Hook Form and Zod
- Supabase Auth
- PostgreSQL and Prisma
- Recharts
- Framer Motion
- dnd-kit
- React Icons and Lucide

## Project Structure

```text
app/
  api/workspace/       Workspace persistence API
  auth/callback/       Supabase OAuth callback
  globals.css          Theme tokens and global styles
  layout.tsx           Metadata, font, and pre-paint theme setup
  manifest.ts          PWA manifest

components/
  kwarta-app.tsx       App state, authentication, routing, and settings
  kwarta/              Finance views, forms, charts, and shared controls
  ui/                  Reusable UI primitives

lib/
  kwarta/              Finance, period, and backup helpers
  supabase/            Supabase browser and server clients
  schema.ts            Form and API validation
  types.ts             Shared domain types

prisma/
  schema.prisma        PostgreSQL data model

docs/
  DESIGN.md            Current visual and interaction specification
```

## Getting Started

Kwarta requires Node.js 24.x.

1. Install dependencies:

```bash
npm install
```

2. Create the local environment file:

```bash
cp .env.example .env.local
```

3. Add the required values:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
DATABASE_URL=
DIRECT_URL=
```

Use the Supabase pooled PostgreSQL connection for `DATABASE_URL` and the direct
connection for `DIRECT_URL`.

4. Generate Prisma and sync the schema:

```bash
npm run prisma:generate
npm run prisma:push
```

5. Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Supabase Authentication

Enable the authentication providers used by the project. Add the local callback
URL to the Supabase redirect allow list:

```text
http://localhost:3000/auth/callback
```

Add each deployed callback URL as well:

```text
https://your-project.vercel.app/auth/callback
https://your-domain.com/auth/callback
```

## Scripts

```bash
npm run dev              # Start the Next.js development server
npm run lint             # Run Next.js linting
npm run build            # Create the deployment build
npm run build:verify     # Run the full local production verification
npm run start            # Serve a completed production build
npm run prisma:generate  # Generate Prisma Client
npm run prisma:push      # Sync the Prisma schema to PostgreSQL
```

## Deploying to Vercel

1. Import the GitHub repository into Vercel with the Next.js preset.
2. Select Node.js 24.x.
3. Use `npm install` as the install command and `npm run build` as the build
   command. The output directory is `.next`.
4. Add the four environment variables listed above to the required Vercel
   environments.
5. Run `npm run prisma:push` against the production database before the first
   production deployment. Do not run schema pushes automatically during builds.
6. Add the production authentication callback URLs in Supabase and Google OAuth.

After deployment, verify sign-in, workspace loading, account edits, transaction
creation, budgets, transfers, backup export, and persistence after refresh.

## Documentation

See [`docs/DESIGN.md`](docs/DESIGN.md) for the current visual system,
responsive behavior, and component conventions.

Do not commit `.env.local`, Supabase secrets, or database credentials.
