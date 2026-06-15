# CFS Live Monday-Style Projects Dashboard

This is the proper live version of the CFS Monday-style dashboard.

It uses:
- React / Vite frontend
- Supabase authentication
- Supabase Postgres database
- Supabase realtime sync
- CSV import for SharePoint project exports
- Vercel or Netlify hosting

## What this live version does

- Staff sign in using email magic links
- All users see the same shared board
- Add, edit, delete projects
- Live updates across users
- Monday-style grouped table
- Search and status filter
- Import project CSV exports from SharePoint
- Project values are hidden

## Columns / groups

- SharePoint Projects
- Scheduled / Secured
- On Site
- Complete / Closed

Removed:
- New / Inbox
- Pricing / Tendering
- QA / Evidence

## Setup Step 1: Create Supabase project

1. Create a Supabase project.
2. Open SQL Editor.
3. Paste and run `database.sql`.
4. Go to Project Settings > API.
5. Copy:
   - Project URL
   - anon public key

## Setup Step 2: Run locally

Install Node.js first.

Then in this folder:

```bash
npm install
```

Create `.env.local`:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Run:

```bash
npm run dev
```

Open the local URL shown in the terminal.

## Setup Step 3: Deploy to Vercel

1. Push this folder to GitHub.
2. Import the repository into Vercel.
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy.
5. Add the Vercel URL to Supabase Auth URL configuration.

## SharePoint project import

The app includes CSV import.

Export the SharePoint Projects folder list to CSV with a project/folder name column called one of:

- Name
- Project
- Project Name
- Title
- Folder Name
- Site
- Job
- Job Name

Then click `Import CSV` in the live app.

## Proper SharePoint sync

For direct automatic SharePoint sync, a developer needs to add Microsoft Graph integration.

Recommended production path:
- Create an Azure App Registration
- Grant Microsoft Graph permissions for SharePoint file/folder read
- Add a serverless sync route
- Sync `/sites/CFSData/Shared Documents/Projects` into the `cfs_projects` Supabase table
- Run sync manually or on schedule

This package is ready for the live database and hosting stage.
