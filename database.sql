-- DoorCheck: Fire Door Compliance Tool
-- Run this in the Supabase SQL Editor on a fresh project.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tenancy: one company per account, users belong to a company via profiles.
-- ---------------------------------------------------------------------------

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  full_name text default '',
  role text not null default 'inspector', -- 'admin' | 'inspector'
  created_at timestamptz default now()
);

-- Helper: current user's company id, used throughout RLS policies.
create or replace function public.user_company_id()
returns uuid
language sql
security definer
stable
as $$
  select company_id from public.profiles where id = auth.uid()
$$;

-- ---------------------------------------------------------------------------
-- Buildings and fire doors
-- ---------------------------------------------------------------------------

create table if not exists public.buildings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  address text default '',
  client_name text default '',
  -- Inspection cadence in months. Defaults to quarterly (3 months), which is
  -- the mandatory minimum under the Fire Safety (England) Regulations 2022
  -- for buildings 11m+ in height with communal fire doors. Below that
  -- threshold quarterly is best practice rather than a legal duty, so this
  -- is configurable per building rather than hardcoded.
  inspection_frequency_months integer not null default 3,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.fire_doors (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  location_label text not null, -- e.g. "Flat 3 entrance door", "Riser cupboard 2nd floor"
  door_type text default '', -- e.g. FD30, FD60
  notes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Inspections and per-door checklist items
-- ---------------------------------------------------------------------------

create table if not exists public.inspections (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  inspector_id uuid references auth.users(id),
  inspection_date date not null default current_date,
  status text not null default 'in_progress', -- 'in_progress' | 'completed'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- One row per checklist item per door per inspection.
create table if not exists public.inspection_items (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections(id) on delete cascade,
  fire_door_id uuid not null references public.fire_doors(id) on delete cascade,
  item_key text not null, -- see CHECKLIST_ITEMS in src/lib/checklist.js
  result text not null default 'na', -- 'pass' | 'fail' | 'na'
  notes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (inspection_id, fire_door_id, item_key)
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  inspection_item_id uuid not null references public.inspection_items(id) on delete cascade,
  storage_path text not null,
  taken_at timestamptz default now(),
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Defects: auto-created whenever a checklist item is marked 'fail'.
-- ---------------------------------------------------------------------------

create table if not exists public.defects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  building_id uuid not null references public.buildings(id) on delete cascade,
  fire_door_id uuid not null references public.fire_doors(id) on delete cascade,
  inspection_item_id uuid references public.inspection_items(id) on delete set null,
  description text not null default '',
  due_date date,
  status text not null default 'open', -- 'open' | 'in_progress' | 'closed'
  created_at timestamptz default now(),
  closed_at timestamptz
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_buildings_updated_at on public.buildings;
create trigger set_buildings_updated_at
before update on public.buildings
for each row execute function public.set_updated_at();

drop trigger if exists set_fire_doors_updated_at on public.fire_doors;
create trigger set_fire_doors_updated_at
before update on public.fire_doors
for each row execute function public.set_updated_at();

drop trigger if exists set_inspections_updated_at on public.inspections;
create trigger set_inspections_updated_at
before update on public.inspections
for each row execute function public.set_updated_at();

drop trigger if exists set_inspection_items_updated_at on public.inspection_items;
create trigger set_inspection_items_updated_at
before update on public.inspection_items
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create / auto-close a defect when a checklist item's result changes.
-- ---------------------------------------------------------------------------

create or replace function public.sync_defect_from_inspection_item()
returns trigger as $$
declare
  v_building_id uuid;
  v_company_id uuid;
begin
  select f.building_id, b.company_id
    into v_building_id, v_company_id
  from public.fire_doors f
  join public.buildings b on b.id = f.building_id
  where f.id = new.fire_door_id;

  if new.result = 'fail' then
    if not exists (
      select 1 from public.defects
      where inspection_item_id = new.id and status <> 'closed'
    ) then
      insert into public.defects
        (company_id, building_id, fire_door_id, inspection_item_id, description, due_date, status)
      values
        (v_company_id, v_building_id, new.fire_door_id, new.id,
         new.item_key || ': ' || coalesce(nullif(new.notes, ''), 'failed inspection'),
         current_date + interval '28 days',
         'open');
    end if;
  else
    update public.defects
    set status = 'closed', closed_at = now()
    where inspection_item_id = new.id and status <> 'closed';
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists sync_defect_on_inspection_item on public.inspection_items;
create trigger sync_defect_on_inspection_item
after insert or update of result on public.inspection_items
for each row execute function public.sync_defect_from_inspection_item();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.buildings enable row level security;
alter table public.fire_doors enable row level security;
alter table public.inspections enable row level security;
alter table public.inspection_items enable row level security;
alter table public.photos enable row level security;
alter table public.defects enable row level security;

drop policy if exists "read own company" on public.companies;
create policy "read own company" on public.companies
for select to authenticated using (id = public.user_company_id());

-- Any authenticated user can create a new company: this is how signup
-- provisions a brand new tenant before their profile row exists.
drop policy if exists "create company on signup" on public.companies;
create policy "create company on signup" on public.companies
for insert to authenticated with check (true);

drop policy if exists "read own profile row" on public.profiles;
create policy "read own profile row" on public.profiles
for select to authenticated using (company_id = public.user_company_id());

drop policy if exists "insert own profile row" on public.profiles;
create policy "insert own profile row" on public.profiles
for insert to authenticated with check (id = auth.uid());

drop policy if exists "buildings by company" on public.buildings;
create policy "buildings by company" on public.buildings
for all to authenticated
using (company_id = public.user_company_id())
with check (company_id = public.user_company_id());

drop policy if exists "fire doors by company" on public.fire_doors;
create policy "fire doors by company" on public.fire_doors
for all to authenticated
using (building_id in (select id from public.buildings where company_id = public.user_company_id()))
with check (building_id in (select id from public.buildings where company_id = public.user_company_id()));

drop policy if exists "inspections by company" on public.inspections;
create policy "inspections by company" on public.inspections
for all to authenticated
using (building_id in (select id from public.buildings where company_id = public.user_company_id()))
with check (building_id in (select id from public.buildings where company_id = public.user_company_id()));

drop policy if exists "inspection items by company" on public.inspection_items;
create policy "inspection items by company" on public.inspection_items
for all to authenticated
using (inspection_id in (
  select i.id from public.inspections i
  join public.buildings b on b.id = i.building_id
  where b.company_id = public.user_company_id()
))
with check (inspection_id in (
  select i.id from public.inspections i
  join public.buildings b on b.id = i.building_id
  where b.company_id = public.user_company_id()
));

drop policy if exists "photos by company" on public.photos;
create policy "photos by company" on public.photos
for all to authenticated
using (inspection_item_id in (
  select ii.id from public.inspection_items ii
  join public.inspections i on i.id = ii.inspection_id
  join public.buildings b on b.id = i.building_id
  where b.company_id = public.user_company_id()
))
with check (inspection_item_id in (
  select ii.id from public.inspection_items ii
  join public.inspections i on i.id = ii.inspection_id
  join public.buildings b on b.id = i.building_id
  where b.company_id = public.user_company_id()
));

drop policy if exists "defects by company" on public.defects;
create policy "defects by company" on public.defects
for all to authenticated
using (company_id = public.user_company_id())
with check (company_id = public.user_company_id());

-- ---------------------------------------------------------------------------
-- Storage bucket for inspection photos
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('inspection-photos', 'inspection-photos', false)
on conflict (id) do nothing;

-- Photos are stored at "<company_id>/<inspection_item_id>/<filename>" so
-- access can be scoped by the first path segment.
drop policy if exists "read own company photos" on storage.objects;
create policy "read own company photos" on storage.objects
for select to authenticated
using (bucket_id = 'inspection-photos' and (storage.foldername(name))[1] = public.user_company_id()::text);

drop policy if exists "upload own company photos" on storage.objects;
create policy "upload own company photos" on storage.objects
for insert to authenticated
with check (bucket_id = 'inspection-photos' and (storage.foldername(name))[1] = public.user_company_id()::text);

drop policy if exists "delete own company photos" on storage.objects;
create policy "delete own company photos" on storage.objects
for delete to authenticated
using (bucket_id = 'inspection-photos' and (storage.foldername(name))[1] = public.user_company_id()::text);
