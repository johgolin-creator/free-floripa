-- Bug reports submitted from the "Relatar bug" button, visible only to
-- moderators/admins (src/components/ReportBugButton.tsx). Run this after
-- supabase/moderator_role.sql (needs public.users.role to include
-- 'moderador' for the RLS checks below).

create table if not exists public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  reporter_email text not null,
  reporter_name text not null,
  title text not null,
  description text not null,
  page_path text not null default '',
  status text not null default 'Aberto' check (status in ('Aberto', 'Em andamento', 'Resolvido')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_bug_reports_created_at on public.bug_reports (created_at desc);

alter table public.bug_reports enable row level security;

drop policy if exists "moderators insert bug reports" on public.bug_reports;
create policy "moderators insert bug reports" on public.bug_reports for insert with check (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('admin', 'moderador'))
);

drop policy if exists "moderators read bug reports" on public.bug_reports;
create policy "moderators read bug reports" on public.bug_reports for select using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('admin', 'moderador'))
);

drop policy if exists "moderators update bug reports" on public.bug_reports;
create policy "moderators update bug reports" on public.bug_reports for update using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('admin', 'moderador'))
);
