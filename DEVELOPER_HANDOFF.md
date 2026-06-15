# Developer Handoff

Build target:
A hosted Monday.com-style project dashboard for Canary Fire Stopping.

Current package includes:
- React/Vite app
- Supabase auth and database
- SQL schema and RLS
- Realtime project sync
- CSV import for SharePoint project exports

Immediate deployment tasks:
1. Create Supabase project.
2. Run `database.sql`.
3. Deploy app to Vercel.
4. Add environment variables.
5. Configure Supabase Auth redirect URLs.
6. Invite CFS staff users or restrict authentication to CFS domain.
7. Import full SharePoint project list using CSV.

Next phase:
Add Microsoft Graph direct sync from:
`canaryfirestopping.sharepoint.com/sites/CFSData/Shared Documents/Projects`

Suggested table mapping:
- folder name -> project
- folder web_url -> sharepoint_url
- source -> SharePoint Projects folder
- group -> SharePoint Projects
- status -> Not Started unless already present in Supabase
