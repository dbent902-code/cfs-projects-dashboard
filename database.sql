-- CFS Monday-Style Live Projects Dashboard
-- Run this in Supabase SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.cfs_projects (
  id uuid primary key default gen_random_uuid(),
  project text not null,
  client text default '',
  project_group text not null default 'SharePoint Projects',
  status text not null default 'Not Started',
  priority text not null default 'Normal',
  owner text default 'CFS Team',
  timeline text default 'TBC',
  notes text default '',
  source text default 'Manual',
  sharepoint_url text default '',
  position integer default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_cfs_projects_updated_at on public.cfs_projects;

create trigger set_cfs_projects_updated_at
before update on public.cfs_projects
for each row execute function public.set_updated_at();

alter table public.cfs_projects enable row level security;

drop policy if exists "Authenticated users can read CFS projects" on public.cfs_projects;
create policy "Authenticated users can read CFS projects"
on public.cfs_projects
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can create CFS projects" on public.cfs_projects;
create policy "Authenticated users can create CFS projects"
on public.cfs_projects
for insert
to authenticated
with check (true);

drop policy if exists "Authenticated users can update CFS projects" on public.cfs_projects;
create policy "Authenticated users can update CFS projects"
on public.cfs_projects
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can delete CFS projects" on public.cfs_projects;
create policy "Authenticated users can delete CFS projects"
on public.cfs_projects
for delete
to authenticated
using (true);

-- Enable realtime for project changes.
alter publication supabase_realtime add table public.cfs_projects;

-- Starter project data based on the dashboard prototype.
insert into public.cfs_projects
(project, client, project_group, status, priority, owner, timeline, notes, source, position)
values
('Mr Morrison', 'SharePoint Projects', 'SharePoint Projects', 'Not Started', 'Normal', 'CFS Team', 'TBC', 'Job 001 - Mr Morrison', 'Starter seed', 1),
('Savill Court (GD)', 'SharePoint Projects', 'SharePoint Projects', 'Working on it', 'Normal', 'CFS Team', 'TBC', 'Job 002 - Savill Court (GD)', 'Starter seed', 2),
('Savill Court (FMS)', 'SharePoint Projects', 'SharePoint Projects', 'Working on it', 'Normal', 'CFS Team', 'TBC', 'Job 003 - Savill Court (FMS)', 'Starter seed', 3),
('152 Montague Road', 'SharePoint Projects', 'SharePoint Projects', 'Not Started', 'Normal', 'CFS Team', 'TBC', 'Job 004 - 152 Montague Road', 'Starter seed', 4),
('21 Burghley Road', 'SharePoint Projects', 'SharePoint Projects', 'Not Started', 'Normal', 'CFS Team', 'TBC', 'Job 005 - 21 Burghley Road', 'Starter seed', 5),
('Terry''s Court', 'Dan Davis', 'Scheduled / Secured', 'Scheduled', 'Normal', 'CFS Team', 'TBC', 'Fire Stopper - Secured', 'works.xlsx', 6),
('Garden Court', 'Dan Davis', 'Scheduled / Secured', 'Scheduled', 'Normal', 'CFS Team', 'TBC', 'Fire Stopper - Secured', 'works.xlsx', 7),
('Brompton Court', 'Acorn', 'Scheduled / Secured', 'Scheduled', 'Normal', 'CFS Team', 'TBC', 'Fire Stopper - Secured', 'works.xlsx', 8),
('High Holborn', 'Dan Davis', 'SharePoint Projects', 'Stuck', 'High', 'Daniel', 'TBC', 'Survey Daniel - TBC', 'works.xlsx', 9),
('Teulon House Blackheath', 'Featherstone', 'SharePoint Projects', 'Stuck', 'High', 'Daniel', 'TBC', 'Survey Daniel - TBC', 'works.xlsx', 10),
('Venchi Gatwick North Terminal', 'P&A Shopfitting', 'SharePoint Projects', 'Stuck', 'High', 'CFS Team', 'TBC', 'Awaiting information confirmation', 'Quote Tracker', 11),
('Jennifer House', 'Acorn Group', 'Complete / Closed', 'Done', 'Normal', 'CFS Team', 'TBC', 'Accepted', 'Quote Tracker', 12)
on conflict do nothing;
