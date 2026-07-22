-- Free Floripa MVP - Supabase schema
-- Execute este arquivo no SQL editor do Supabase após criar o projeto.

create extension if not exists "pgcrypto";

create type public.user_role as enum ('trabalhador', 'empresa', 'admin');
create type public.application_status as enum ('Enviada', 'Em análise', 'Aprovada', 'Recusada', 'Cancelada', 'Trabalho concluído', 'Falta registrada');
create type public.payment_method as enum ('Dinheiro', 'Pix', 'Transferência', 'A combinar');
create type public.shift_status as enum ('Ainda não chegou', 'Fez check-in', 'Finalizou o turno');
create type public.experience_level as enum ('Iniciante', 'Poucas diárias', 'Experiente', 'Profissional experiente');

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null,
  full_name text not null,
  phone text,
  email text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.job_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.worker_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  avatar_url text,
  birth_date date,
  city text not null default 'Florianópolis',
  neighborhood text not null,
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

create table public.worker_function_experience (
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

create table public.company_profiles (
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

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.company_profiles(id) on delete cascade,
  category_id uuid references public.job_categories(id),
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
  status text not null default 'Aberta',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint filled_lte_quantity check (filled <= quantity)
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  worker_id uuid not null references public.worker_profiles(id) on delete cascade,
  status public.application_status not null default 'Enviada',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, worker_id)
);

create table public.work_shifts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  worker_id uuid not null references public.worker_profiles(id) on delete cascade,
  application_id uuid references public.applications(id) on delete set null,
  status public.shift_status not null default 'Ainda não chegou',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, worker_id)
);

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  work_shift_id uuid not null references public.work_shifts(id) on delete cascade,
  worker_id uuid not null references public.worker_profiles(id) on delete cascade,
  checkin_at timestamptz,
  checkout_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  work_shift_id uuid references public.work_shifts(id) on delete cascade,
  reviewer_user_id uuid not null references public.users(id) on delete cascade,
  reviewed_user_id uuid not null references public.users(id) on delete cascade,
  punctuality integer check (punctuality between 1 and 5),
  service integer check (service between 1 and 5),
  experience integer check (experience between 1 and 5),
  commitment integer check (commitment between 1 and 5),
  organization integer check (organization between 1 and 5),
  treatment integer check (treatment between 1 and 5),
  payment integer check (payment between 1 and 5),
  working_conditions integer check (working_conditions between 1 and 5),
  overall_rating integer not null check (overall_rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.company_profiles(id) on delete cascade,
  worker_id uuid not null references public.worker_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (company_id, worker_id)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  plan_name text not null default 'Gratuito',
  active boolean not null default true,
  current_period_end date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.application_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  credits_remaining integer not null default 5,
  renewal_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  role public.user_role,
  title text not null,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- MVP demo persistence: stores the current app state in Supabase while auth is not active.
-- Use VITE_SUPABASE_STATE_KEY to separate environments such as demo, staging, and production.
create table public.app_state_snapshots (
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

create trigger users_updated_at before update on public.users for each row execute function public.set_updated_at();
create trigger worker_profiles_updated_at before update on public.worker_profiles for each row execute function public.set_updated_at();
create trigger worker_function_experience_updated_at before update on public.worker_function_experience for each row execute function public.set_updated_at();
create trigger company_profiles_updated_at before update on public.company_profiles for each row execute function public.set_updated_at();
create trigger jobs_updated_at before update on public.jobs for each row execute function public.set_updated_at();
create trigger applications_updated_at before update on public.applications for each row execute function public.set_updated_at();
create trigger work_shifts_updated_at before update on public.work_shifts for each row execute function public.set_updated_at();
create trigger subscriptions_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();
create trigger application_credits_updated_at before update on public.application_credits for each row execute function public.set_updated_at();
create trigger app_state_snapshots_updated_at before update on public.app_state_snapshots for each row execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.worker_profiles enable row level security;
alter table public.worker_function_experience enable row level security;
alter table public.company_profiles enable row level security;
alter table public.job_categories enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;
alter table public.work_shifts enable row level security;
alter table public.checkins enable row level security;
alter table public.reviews enable row level security;
alter table public.favorites enable row level security;
alter table public.subscriptions enable row level security;
alter table public.application_credits enable row level security;
alter table public.notifications enable row level security;
alter table public.app_state_snapshots enable row level security;

create policy "users read own" on public.users for select using (auth.uid() = id);
create policy "users update own" on public.users for update using (auth.uid() = id);

create policy "categories are public" on public.job_categories for select using (true);

create policy "workers public limited read" on public.worker_profiles for select using (true);
create policy "workers manage own" on public.worker_profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "worker function experience public read" on public.worker_function_experience for select using (true);
create policy "workers manage own function experience" on public.worker_function_experience for all using (
  exists (select 1 from public.worker_profiles w where w.id = worker_id and w.user_id = auth.uid())
) with check (
  exists (select 1 from public.worker_profiles w where w.id = worker_id and w.user_id = auth.uid())
);

create policy "companies public limited read" on public.company_profiles for select using (true);
create policy "companies manage own" on public.company_profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "jobs readable by authenticated users" on public.jobs for select using (auth.role() = 'authenticated');
create policy "companies insert jobs" on public.jobs for insert with check (
  exists (select 1 from public.company_profiles c where c.id = company_id and c.user_id = auth.uid())
);
create policy "companies update own jobs" on public.jobs for update using (
  exists (select 1 from public.company_profiles c where c.id = company_id and c.user_id = auth.uid())
);

create policy "workers apply to jobs" on public.applications for insert with check (
  exists (select 1 from public.worker_profiles w where w.id = worker_id and w.user_id = auth.uid())
);
create policy "workers read own applications" on public.applications for select using (
  exists (select 1 from public.worker_profiles w where w.id = worker_id and w.user_id = auth.uid())
  or exists (
    select 1
    from public.jobs j
    join public.company_profiles c on c.id = j.company_id
    where j.id = job_id and c.user_id = auth.uid()
  )
);
create policy "companies update applications for own jobs" on public.applications for update using (
  exists (
    select 1
    from public.jobs j
    join public.company_profiles c on c.id = j.company_id
    where j.id = job_id and c.user_id = auth.uid()
  )
);

create policy "shift participants read" on public.work_shifts for select using (
  exists (select 1 from public.worker_profiles w where w.id = worker_id and w.user_id = auth.uid())
  or exists (
    select 1 from public.jobs j join public.company_profiles c on c.id = j.company_id
    where j.id = job_id and c.user_id = auth.uid()
  )
);
create policy "companies create shifts" on public.work_shifts for insert with check (
  exists (
    select 1 from public.jobs j join public.company_profiles c on c.id = j.company_id
    where j.id = job_id and c.user_id = auth.uid()
  )
);
create policy "shift participants update" on public.work_shifts for update using (
  exists (select 1 from public.worker_profiles w where w.id = worker_id and w.user_id = auth.uid())
  or exists (
    select 1 from public.jobs j join public.company_profiles c on c.id = j.company_id
    where j.id = job_id and c.user_id = auth.uid()
  )
);

create policy "workers insert own checkins" on public.checkins for insert with check (
  exists (select 1 from public.worker_profiles w where w.id = worker_id and w.user_id = auth.uid())
);
create policy "shift participants read checkins" on public.checkins for select using (
  exists (select 1 from public.worker_profiles w where w.id = worker_id and w.user_id = auth.uid())
  or exists (
    select 1 from public.work_shifts s
    join public.jobs j on j.id = s.job_id
    join public.company_profiles c on c.id = j.company_id
    where s.id = work_shift_id and c.user_id = auth.uid()
  )
);

create policy "participants create reviews" on public.reviews for insert with check (auth.uid() = reviewer_user_id);
create policy "participants read reviews" on public.reviews for select using (auth.uid() = reviewer_user_id or auth.uid() = reviewed_user_id);

create policy "companies manage favorites" on public.favorites for all using (
  exists (select 1 from public.company_profiles c where c.id = company_id and c.user_id = auth.uid())
) with check (
  exists (select 1 from public.company_profiles c where c.id = company_id and c.user_id = auth.uid())
);

create policy "users read own subscriptions" on public.subscriptions for select using (auth.uid() = user_id);
create policy "users read own credits" on public.application_credits for select using (auth.uid() = user_id);
create policy "users read own notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "users update own notifications" on public.notifications for update using (auth.uid() = user_id);

-- Demo-only policy for the shared MVP state. Replace with authenticated policies before production launch.
create policy "demo state public read" on public.app_state_snapshots for select using (true);
create policy "demo state public insert" on public.app_state_snapshots for insert with check (true);
create policy "demo state public update" on public.app_state_snapshots for update using (true) with check (true);

insert into public.job_categories (name) values
  ('Garçom'),
  ('Bartender'),
  ('Auxiliar de cozinha'),
  ('Copeiro'),
  ('Recepcionista'),
  ('Operador de caixa'),
  ('Limpeza'),
  ('Montador de eventos'),
  ('Promotor')
on conflict (name) do nothing;
