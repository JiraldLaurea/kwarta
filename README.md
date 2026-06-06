# Kwarta

Kwarta is a personal budget tracker built with Next.js, Supabase Auth, PostgreSQL, Prisma, Tailwind CSS, and Recharts.

## Features

- Google sign-in through Supabase Auth
- Dashboard with income, expense, balance, spending, cash flow, and budget progress views
- Transaction, category, and monthly budget management
- PostgreSQL persistence through Prisma
- Mobile-first responsive layout

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn-style UI primitives
- Supabase Auth
- PostgreSQL
- Prisma
- Recharts

## Getting Started

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Fill in the values from Supabase:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
DATABASE_URL=
DIRECT_URL=
```

Generate the Prisma client and sync the database schema:

```bash
npm run prisma:generate
npm run prisma:push
```

Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Supabase Setup

Enable Google as an auth provider in Supabase.

For local development, add this redirect URL:

```text
http://localhost:3000/auth/callback
```

For production, add your deployed callback URL:

```text
https://your-domain.com/auth/callback
```

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm run start
npm run prisma:generate
npm run prisma:push
```

## Environment Variables

Use `.env.example` as the template. Do not commit `.env.local` or any file containing real Supabase keys or database credentials.

## Design And Stack Docs

- `docs/DESIGN.md`
- `docs/kwarta-tech-stack.md`
