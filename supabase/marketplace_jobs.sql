-- Free Floripa - vagas e candidaturas compartilhadas
-- Execute este arquivo no SQL editor do Supabase depois de professional_bank.sql.

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
