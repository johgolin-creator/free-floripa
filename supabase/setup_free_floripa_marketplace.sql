-- Free Floripa - instalador seguro do marketplace
-- Use este arquivo quando professional_bank.sql ou marketplace_jobs.sql der erro
-- por falta de tabela, tipo ou politica no Supabase.

create extension if not exists "pgcrypto";

do $$
begin
  create type public.user_role as enum ('trabalhador', 'empresa', 'admin');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.application_status as enum ('Enviada', 'Em análise', 'Aprovada', 'Recusada', 'Cancelada', 'Trabalho concluído', 'Falta registrada');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.payment_method as enum ('Dinheiro', 'Pix', 'Transferência', 'A combinar');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.shift_status as enum ('Ainda não chegou', 'Fez check-in', 'Finalizou o turno');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.experience_level as enum ('Iniciante', 'Poucas diárias', 'Experiente', 'Profissional experiente');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null,
  full_name text not null,
  phone text,
  email text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.worker_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  display_name text not null default 'Profissional Free Floripa',
  avatar_url text,
  birth_date date,
  city text not null default 'Florianópolis',
  neighborhood text not null default 'Centro',
  professions text[] not null default '{}',
  experience text,
  description text,
  availability text,
  has_transport boolean not null default false,
  max_distance_km integer not null default 10,
  rating numeric(3,2) not null default 0,
  completed_jobs integer not null default 0,
  attendance_rate integer not null default 100,
  punctuality_rate integer not null default 100,
  cancellations integer not null default 0,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.worker_profiles
add column if not exists display_name text not null default 'Profissional Free Floripa';

create table if not exists public.worker_function_experience (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.worker_profiles(id) on delete cascade,
  function_name text not null,
  level public.experience_level not null default 'Iniciante',
  months integer not null default 0 check (months >= 0),
  accepts_assistant boolean not null default true,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (worker_id, function_name)
);

create table if not exists public.company_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  establishment_name text not null,
  responsible_name text not null,
  cnpj text not null unique,
  phone text not null,
  email text not null,
  category text not null,
  address text not null,
  neighborhood text not null,
  description text,
  logo_url text,
  rating numeric(3,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.company_profiles(id) on delete cascade,
  title text not null,
  function_name text not null,
  quantity integer not null check (quantity > 0),
  filled integer not null default 0 check (filled >= 0),
  shift_date date not null,
  starts_at time not null,
  ends_at time,
  daily_value numeric(10,2) not null check (daily_value > 0),
  payment_method public.payment_method not null,
  approximate_address text not null,
  full_address text not null,
  neighborhood text not null,
  uniform text,
  required_experience text,
  description text not null,
  benefits text[] not null default '{}',
  contact_after_confirmation boolean not null default true,
  urgent boolean not null default false,
  status text not null default 'Publicada',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint filled_lte_quantity check (filled <= quantity)
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  worker_id uuid not null references public.worker_profiles(id) on delete cascade,
  status public.application_status not null default 'Enviada',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, worker_id)
);

create table if not exists public.work_shifts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  worker_id uuid not null references public.worker_profiles(id) on delete cascade,
  status public.shift_status not null default 'Ainda não chegou',
  checkin_at timestamptz,
  checkout_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, worker_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  role public.user_role,
  title text not null,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;
alter table public.worker_profiles enable row level security;
alter table public.worker_function_experience enable row level security;
alter table public.company_profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;
alter table public.work_shifts enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "users read own" on public.users;
create policy "users read own" on public.users for select using (auth.uid() = id);

drop policy if exists "users insert own" on public.users;
create policy "users insert own" on public.users for insert with check (auth.uid() = id);

drop policy if exists "users update own" on public.users;
create policy "users update own" on public.users for update using (auth.uid() = id);

drop policy if exists "workers public limited read" on public.worker_profiles;
create policy "workers public limited read" on public.worker_profiles for select using (true);

drop policy if exists "workers manage own" on public.worker_profiles;
create policy "workers manage own" on public.worker_profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "worker function experience public read" on public.worker_function_experience;
create policy "worker function experience public read" on public.worker_function_experience for select using (true);

drop policy if exists "workers manage own function experience" on public.worker_function_experience;
create policy "workers manage own function experience" on public.worker_function_experience for all using (
  exists (select 1 from public.worker_profiles w where w.id = worker_id and w.user_id = auth.uid())
) with check (
  exists (select 1 from public.worker_profiles w where w.id = worker_id and w.user_id = auth.uid())
);

drop policy if exists "companies public limited read" on public.company_profiles;
create policy "companies public limited read" on public.company_profiles for select using (true);

drop policy if exists "companies manage own" on public.company_profiles;
create policy "companies manage own" on public.company_profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "jobs readable by authenticated users" on public.jobs;
create policy "jobs readable by authenticated users" on public.jobs for select using (auth.role() = 'authenticated');

drop policy if exists "companies insert jobs" on public.jobs;
create policy "companies insert jobs" on public.jobs for insert with check (
  exists (select 1 from public.company_profiles c where c.id = company_id and c.user_id = auth.uid())
);

drop policy if exists "companies update own jobs" on public.jobs;
create policy "companies update own jobs" on public.jobs for update using (
  exists (select 1 from public.company_profiles c where c.id = company_id and c.user_id = auth.uid())
);

drop policy if exists "workers apply to jobs" on public.applications;
create policy "workers apply to jobs" on public.applications for insert with check (
  exists (select 1 from public.worker_profiles w where w.id = worker_id and w.user_id = auth.uid())
);

drop policy if exists "companies invite workers to own jobs" on public.applications;
create policy "companies invite workers to own jobs" on public.applications for insert with check (
  exists (
    select 1
    from public.jobs j
    join public.company_profiles c on c.id = j.company_id
    where j.id = job_id and c.user_id = auth.uid()
  )
);

drop policy if exists "workers read own applications" on public.applications;
create policy "workers read own applications" on public.applications for select using (
  exists (select 1 from public.worker_profiles w where w.id = worker_id and w.user_id = auth.uid())
  or exists (
    select 1
    from public.jobs j
    join public.company_profiles c on c.id = j.company_id
    where j.id = job_id and c.user_id = auth.uid()
  )
);

drop policy if exists "companies update applications for own jobs" on public.applications;
create policy "companies update applications for own jobs" on public.applications for update using (
  exists (
    select 1
    from public.jobs j
    join public.company_profiles c on c.id = j.company_id
    where j.id = job_id and c.user_id = auth.uid()
  )
);

drop policy if exists "shift participants read" on public.work_shifts;
create policy "shift participants read" on public.work_shifts for select using (
  exists (select 1 from public.worker_profiles w where w.id = worker_id and w.user_id = auth.uid())
  or exists (
    select 1 from public.jobs j join public.company_profiles c on c.id = j.company_id
    where j.id = job_id and c.user_id = auth.uid()
  )
);

drop policy if exists "companies create shifts" on public.work_shifts;
create policy "companies create shifts" on public.work_shifts for insert with check (
  exists (
    select 1 from public.jobs j join public.company_profiles c on c.id = j.company_id
    where j.id = job_id and c.user_id = auth.uid()
  )
);

drop policy if exists "shift participants update" on public.work_shifts;
create policy "shift participants update" on public.work_shifts for update using (
  exists (select 1 from public.worker_profiles w where w.id = worker_id and w.user_id = auth.uid())
  or exists (
    select 1 from public.jobs j join public.company_profiles c on c.id = j.company_id
    where j.id = job_id and c.user_id = auth.uid()
  )
);

drop policy if exists "authenticated users create notifications" on public.notifications;
create policy "authenticated users create notifications" on public.notifications for insert with check (auth.role() = 'authenticated');

drop policy if exists "users read own notifications" on public.notifications;
create policy "users read own notifications" on public.notifications for select using (auth.uid() = user_id);

drop policy if exists "users update own notifications" on public.notifications;
create policy "users update own notifications" on public.notifications for update using (auth.uid() = user_id);
