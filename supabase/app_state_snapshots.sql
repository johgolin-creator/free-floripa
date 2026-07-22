-- Free Floripa MVP - Supabase account-scoped state persistence
-- Execute this in the Supabase SQL Editor if the main schema already exists.
-- The app writes state_key as: VITE_SUPABASE_STATE_KEY || ':' || auth user id.

create extension if not exists "pgcrypto";

create table if not exists public.app_state_snapshots (
  id uuid primary key default gen_random_uuid(),
  state_key text not null unique,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_state_snapshots_updated_at on public.app_state_snapshots;
create trigger app_state_snapshots_updated_at
before update on public.app_state_snapshots
for each row execute function public.set_updated_at();

alter table public.app_state_snapshots enable row level security;

drop policy if exists "demo state public read" on public.app_state_snapshots;
drop policy if exists "demo state public insert" on public.app_state_snapshots;
drop policy if exists "demo state public update" on public.app_state_snapshots;
drop policy if exists "account state read own" on public.app_state_snapshots;
drop policy if exists "account state insert own" on public.app_state_snapshots;
drop policy if exists "account state update own" on public.app_state_snapshots;

create policy "account state read own" on public.app_state_snapshots for select using (
  auth.role() = 'authenticated' and state_key like '%:' || auth.uid()::text
);
create policy "account state insert own" on public.app_state_snapshots for insert with check (
  auth.role() = 'authenticated' and state_key like '%:' || auth.uid()::text
);
create policy "account state update own" on public.app_state_snapshots for update using (
  auth.role() = 'authenticated' and state_key like '%:' || auth.uid()::text
) with check (
  auth.role() = 'authenticated' and state_key like '%:' || auth.uid()::text
);
