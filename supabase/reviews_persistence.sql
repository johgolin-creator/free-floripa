-- Reviews were only ever written to the client-side app_state_snapshots blob
-- (see src/lib/store.tsx addReview / addCompanyReview). worker_profiles.rating
-- and company_profiles.rating are read from the real tables on every reload
-- (src/lib/supabaseMarketplace.ts mapPublicWorker / mapCompany), and the
-- existing "workers manage own" / "companies manage own" RLS policies only
-- let a profile's own owner update it - so a company could never actually
-- persist a worker's rating, and vice versa. The review looked saved for the
-- rest of that session, then reverted to 0.0 / 0 trabalhos on next load.
--
-- This adds a real table per review direction plus a trigger that recomputes
-- the aggregate rating/completed_jobs as SECURITY DEFINER, so the recompute
-- runs with elevated privileges and isn't blocked by the "manage own" policies.
-- Run this once in the Supabase SQL editor for this project.

create table if not exists public.worker_reviews (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.worker_profiles(id) on delete cascade,
  company_id uuid not null references public.company_profiles(id) on delete cascade,
  application_id uuid references public.applications(id) on delete set null,
  job_id uuid references public.jobs(id) on delete set null,
  author_name text not null,
  rating integer not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now()
);

create unique index if not exists idx_worker_reviews_application
  on public.worker_reviews (application_id)
  where application_id is not null;

create index if not exists idx_worker_reviews_worker
  on public.worker_reviews (worker_id);

create table if not exists public.company_reviews (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.company_profiles(id) on delete cascade,
  worker_id uuid not null references public.worker_profiles(id) on delete cascade,
  worker_name text not null,
  application_id uuid references public.applications(id) on delete set null,
  job_id uuid references public.jobs(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now()
);

create unique index if not exists idx_company_reviews_application
  on public.company_reviews (application_id)
  where application_id is not null;

create index if not exists idx_company_reviews_company
  on public.company_reviews (company_id);

alter table public.worker_reviews enable row level security;
alter table public.company_reviews enable row level security;

drop policy if exists "worker reviews public read" on public.worker_reviews;
create policy "worker reviews public read" on public.worker_reviews for select using (true);

drop policy if exists "companies create worker reviews" on public.worker_reviews;
create policy "companies create worker reviews" on public.worker_reviews for insert with check (
  exists (select 1 from public.company_profiles c where c.id = company_id and c.user_id = auth.uid())
);

drop policy if exists "company reviews public read" on public.company_reviews;
create policy "company reviews public read" on public.company_reviews for select using (true);

drop policy if exists "workers create company reviews" on public.company_reviews;
create policy "workers create company reviews" on public.company_reviews for insert with check (
  exists (select 1 from public.worker_profiles w where w.id = worker_id and w.user_id = auth.uid())
);

create or replace function public.recompute_worker_rating() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.worker_profiles
  set
    rating = coalesce((select round(avg(rating)::numeric, 1) from public.worker_reviews where worker_id = coalesce(new.worker_id, old.worker_id)), 0),
    completed_jobs = (select count(*) from public.worker_reviews where worker_id = coalesce(new.worker_id, old.worker_id))
  where id = coalesce(new.worker_id, old.worker_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_recompute_worker_rating on public.worker_reviews;
create trigger trg_recompute_worker_rating
after insert or update or delete on public.worker_reviews
for each row execute function public.recompute_worker_rating();

create or replace function public.recompute_company_rating() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.company_profiles
  set rating = coalesce((select round(avg(rating)::numeric, 1) from public.company_reviews where company_id = coalesce(new.company_id, old.company_id)), 0)
  where id = coalesce(new.company_id, old.company_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_recompute_company_rating on public.company_reviews;
create trigger trg_recompute_company_rating
after insert or update or delete on public.company_reviews
for each row execute function public.recompute_company_rating();
