# DoorCheck

Fire door inspection and compliance tracking for UK landlords, managing agents, and passive fire protection contractors, built to support the quarterly communal fire door inspection duty under the Fire Safety (England) Regulations 2022.

## What it does (MVP)

- **Property setup**: add buildings and list their fire doors / compartmentation elements by location
- **Inspection checklist**: per-door checklist (leaf condition, seals/intumescent strips, hinges, self-closer, gaps, signage, glazing, frame), pass/fail/N-A with notes
- **Photo evidence**: timestamped photos attached to each checklist item
- **Defect tracking**: any "fail" auto-creates a defect with a due date, tracked open → in progress → closed
- **PDF reports**: a professional inspection report per building per inspection date, generated client-side
- **Dashboard**: buildings overdue for inspection, open defects, last inspection date

Multi-tenant: each signup creates its own company; all data is scoped to that company via Postgres row-level security.

FRA action tracker (uploading FRA PDFs and tracking recommendations to closure) is planned for phase 2 and not yet built.

## Stack

- React + Vite (mobile-first UI)
- Supabase: Postgres, Auth, Storage, Row Level Security
- `@react-pdf/renderer` for client-side PDF generation
- No custom backend server — Supabase is used directly from the client, scoped by RLS

## Setup

### 1. Create a Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Open the SQL Editor and run `database.sql` in full.
3. Go to Project Settings → API and copy the **Project URL** and **anon public key**.

### 2. Run locally

```bash
npm install
```

Create `.env.local`:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

```bash
npm run dev
```

Open the local URL shown in the terminal, then use **Create account** to sign up (this creates your company and an admin profile).

### 3. Deploy to Vercel

1. Push this repo to GitHub.
2. Import it into Vercel.
3. Add the same two environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
4. Deploy.
5. Add the Vercel URL to Supabase → Authentication → URL Configuration.

## Domain assumption to confirm

Inspection frequency is set per building (default: quarterly/3 months) rather than hardcoded, since the quarterly duty under the Fire Safety (England) Regulations 2022 is a strict legal minimum for buildings 11m+ in height, but only best practice below that. Confirm this matches your intended compliance model, or let me know if frequency should instead be fixed or driven by a different rule (e.g. building height/risk category).

## Not yet built

- FRA action tracker (phase 2)
- Any feature beyond the MVP list above — flag if you want something added
