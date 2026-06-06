# Deploying Kwarta To Vercel

Kwarta is built for Vercel + Supabase. Vercel hosts the Next.js app, while Supabase provides authentication and the Postgres database.

## 1. Push The Repository

Commit the project and push it to GitHub:

```bash
git add .
git commit -m "Prepare Vercel deployment"
git push -u origin main
```

## 2. Import In Vercel

Create a new Vercel project from the GitHub repository.

Use the default Next.js settings:

- Framework Preset: `Next.js`
- Node.js Version: `20.x`
- Build Command: `npm run build`
- Install Command: `npm install`
- Output Directory: `.next`

The `postinstall` script runs `prisma generate`, so the Prisma client is available during Vercel builds.

## 3. Add Environment Variables

Add these in Vercel Project Settings > Environment Variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
DATABASE_URL=
DIRECT_URL=
```

Use the Supabase pooled connection string for `DATABASE_URL` and the direct connection string for `DIRECT_URL`.

Apply the variables to Production, Preview, and Development unless you intentionally use separate Supabase projects per environment.

## 4. Sync The Database Schema

Run the schema push locally against the production Supabase database before the first production deploy:

```bash
npm run prisma:push
```

Do not run schema pushes automatically during Vercel builds.

## 5. Configure Supabase Auth Redirects

In Supabase Authentication settings, add your Vercel URLs:

```text
https://your-project.vercel.app/auth/callback
https://your-domain.com/auth/callback
```

Keep the local callback for development:

```text
http://localhost:3000/auth/callback
```

Also add the same production URL to the Google OAuth client authorized redirect origins/settings as required by Google and Supabase.

## 6. Deploy

Trigger a Vercel deployment from the dashboard or by pushing to `main`.

After deployment, test:

- Google sign-in
- Loading the dashboard
- Creating a category
- Adding a transaction
- Adding a budget
- Refreshing the page to confirm data persists
