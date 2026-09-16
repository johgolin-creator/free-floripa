-- Vagas freelancer vistas em posts de rede social (Facebook), coladas à mão
-- por um admin em src/pages/AdminLeadsPage.tsx — nunca coletadas de forma
-- automatizada (risco de banimento da conta pessoal + LGPD numa coleta sem
-- consentimento). O texto vira um lead compartilhado entre os admins, igual
-- ao padrão já usado em company_leads.sql.
--
-- Run this whole file once in the Supabase SQL Editor.

create table if not exists public.facebook_leads (
  id text primary key,
  raw_text text not null,
  title text not null,
  contact_name text,
  phone text,
  email text,
  city text,
  contacted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.facebook_leads enable row level security;

drop policy if exists "moderators read facebook leads" on public.facebook_leads;
create policy "moderators read facebook leads" on public.facebook_leads for select using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('admin', 'moderador'))
);

drop policy if exists "moderators manage facebook leads" on public.facebook_leads;
create policy "moderators manage facebook leads" on public.facebook_leads for all using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('admin', 'moderador'))
) with check (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('admin', 'moderador'))
);

create or replace function public.touch_facebook_leads_updated_at() returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_facebook_leads_updated_at on public.facebook_leads;
create trigger trg_facebook_leads_updated_at
before update on public.facebook_leads
for each row execute function public.touch_facebook_leads_updated_at();
