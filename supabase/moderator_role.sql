-- Adds a 'moderador' role with real cross-tenant moderation access.
--
-- Today "admin" access (src/lib/auth.tsx isAdmin) is a purely client-side
-- signal (VITE_ADMIN_EMAILS / user_metadata.admin) and AdminPage.tsx
-- (src/pages/AdminPage.tsx) only ever reads state.workers/companies/jobs/
-- applications/trustReports/adminModeration, which are populated per-account
-- from the app_state_snapshots blob (see supabase/app_state_snapshots.sql).
-- That means a moderator/admin today can never see a trust report or a
-- block made by anyone but themselves - there is no real shared table for
-- moderation data. This file:
--   1. adds 'moderador' to public.user_role (the enum already had a dead
--      'admin' value that nothing ever wrote);
--   2. widens the RLS policies that already referenced 'admin' so real
--      cross-tenant SELECTs work for company_profiles/jobs/applications;
--   3. adds public.trust_reports and public.moderation_blocks as real
--      shared tables (replacing the client-only state.trustReports /
--      state.adminModeration slices);
--   4. adds a trigger that stops an authenticated user from writing
--      'admin'/'moderador' into their own public.users.role via the API
--      (the existing "users insert own"/"users update own" policies have
--      no `with check` on the role value) and keeps an elevated role from
--      being silently reverted by publishWorkerProfile/publishCompanyProfile
--      (src/lib/supabaseMarketplace.ts), which upsert role: "trabalhador" /
--      "empresa" on every profile save.
--
-- Run the next line by itself first (Postgres cannot use a value added by
-- ALTER TYPE ... ADD VALUE in the same transaction/script run it was added
-- in), THEN run the rest of this file in a second execution.

alter type public.user_role add value if not exists 'moderador';

-- --- Run everything below this line in a second execution -----------------

create or replace function public.guard_user_role() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null then
    if tg_op = 'UPDATE' and old.role in ('admin', 'moderador') and new.role is distinct from old.role then
      -- an already-elevated account is being silently rewritten by the app's
      -- own profile-save upsert (publishWorkerProfile/publishCompanyProfile
      -- always send role: 'trabalhador'/'empresa') - keep the elevated role.
      new.role := old.role;
    elsif new.role in ('admin', 'moderador') then
      -- covers INSERT with an elevated role, and UPDATE trying to escalate a
      -- non-elevated account - only the SQL editor (auth.uid() is null there)
      -- may set these values, via the promotion snippet at the bottom of
      -- this file.
      raise exception 'Não é permitido definir role %.', new.role;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_user_role on public.users;
create trigger trg_guard_user_role
before insert or update on public.users
for each row execute function public.guard_user_role();

drop policy if exists "company profiles visible by role" on public.company_profiles;
create policy "company profiles visible by role" on public.company_profiles for select using (
  auth.role() = 'authenticated'
  and (
    user_id = auth.uid()
    or exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.role in ('trabalhador', 'admin', 'moderador')
    )
  )
);

drop policy if exists "jobs visible to workers or owning company" on public.jobs;
create policy "jobs visible to workers or owning company" on public.jobs for select using (
  auth.role() = 'authenticated'
  and (
    exists (
      select 1
      from public.company_profiles c
      where c.id = company_id
        and c.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.role in ('admin', 'moderador')
    )
    or (
      status not in ('Rascunho', 'Cancelada')
      and exists (
        select 1
        from public.users u
        where u.id = auth.uid()
          and u.role = 'trabalhador'
      )
    )
  )
);

drop policy if exists "moderators read all applications" on public.applications;
create policy "moderators read all applications" on public.applications for select using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('admin', 'moderador'))
);

create table if not exists public.trust_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_role public.user_role not null,
  reporter_id uuid not null,
  reporter_name text not null,
  target_type text not null check (target_type in ('worker', 'company', 'job')),
  target_id uuid not null,
  target_name text not null,
  reason text not null,
  status text not null default 'Aberto' check (status in ('Aberto', 'Resolvido')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_trust_reports_status on public.trust_reports (status);

alter table public.trust_reports enable row level security;

drop policy if exists "authenticated users create trust reports" on public.trust_reports;
create policy "authenticated users create trust reports" on public.trust_reports for insert with check (
  auth.role() = 'authenticated'
);

drop policy if exists "moderators read trust reports" on public.trust_reports;
create policy "moderators read trust reports" on public.trust_reports for select using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('admin', 'moderador'))
);

drop policy if exists "moderators update trust reports" on public.trust_reports;
create policy "moderators update trust reports" on public.trust_reports for update using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('admin', 'moderador'))
);

create table if not exists public.moderation_blocks (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('worker', 'company')),
  target_id uuid not null,
  blocked_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (target_type, target_id)
);

alter table public.moderation_blocks enable row level security;

drop policy if exists "moderation blocks public read" on public.moderation_blocks;
create policy "moderation blocks public read" on public.moderation_blocks for select using (true);

drop policy if exists "moderators manage blocks" on public.moderation_blocks;
create policy "moderators manage blocks" on public.moderation_blocks for all using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('admin', 'moderador'))
) with check (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('admin', 'moderador'))
);

-- --- Promotion snippet -----------------------------------------------------
-- Run this once per moderator, after everything above has been applied,
-- replacing the email each time. It reads straight from auth.users because a
-- moderator may never have completed a worker/company profile, so they may
-- have no public.users row yet.

-- insert into public.users (id, role, full_name, phone, email)
-- select id, 'moderador', coalesce(nullif(trim(raw_user_meta_data->>'name'), ''), email), '', email
-- from auth.users
-- where lower(email) = lower('EMAIL_DO_MODERADOR')
-- on conflict (id) do update set role = 'moderador';
