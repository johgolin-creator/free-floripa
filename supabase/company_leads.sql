-- Shared table for the company-prospecting bot (src/pages/AdminLeadsPage.tsx).
--
-- Both the manual "Buscar empresas" button (browser, src/lib/companyProspecting.ts)
-- and the scheduled Edge Function (supabase/functions/company-prospecting-bot)
-- upsert into this same table, so every admin sees one shared, growing list
-- instead of each browser keeping its own local copy.
--
-- Run this whole file once in the Supabase SQL Editor.

create table if not exists public.company_leads (
  id text primary key,
  segment text not null check (segment in ('Restaurantes', 'Baladas', 'Hotéis', 'Mercados', 'Atacados')),
  name text not null,
  phone text,
  email text,
  website text,
  address text,
  city text not null,
  contacted boolean not null default false,
  found_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_company_leads_segment on public.company_leads (segment);

alter table public.company_leads enable row level security;

drop policy if exists "moderators read company leads" on public.company_leads;
create policy "moderators read company leads" on public.company_leads for select using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('admin', 'moderador'))
);

drop policy if exists "moderators manage company leads" on public.company_leads;
create policy "moderators manage company leads" on public.company_leads for all using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('admin', 'moderador'))
) with check (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('admin', 'moderador'))
);

create or replace function public.touch_company_leads_updated_at() returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_company_leads_updated_at on public.company_leads;
create trigger trg_company_leads_updated_at
before update on public.company_leads
for each row execute function public.touch_company_leads_updated_at();
