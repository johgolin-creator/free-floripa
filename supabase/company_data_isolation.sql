-- Free Floripa - isolamento de dados entre empresas
-- Execute este arquivo no SQL editor do Supabase.
-- Objetivo: trabalhadores veem vagas abertas; empresas veem somente as proprias vagas e dados relacionados.

drop policy if exists "companies public limited read" on public.company_profiles;
drop policy if exists "company profiles visible by role" on public.company_profiles;
create policy "company profiles visible by role" on public.company_profiles for select using (
  auth.role() = 'authenticated'
  and (
    user_id = auth.uid()
    or exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.role in ('trabalhador', 'admin')
    )
  )
);

drop policy if exists "jobs readable by authenticated users" on public.jobs;
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
        and u.role = 'admin'
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

drop policy if exists "workers apply to jobs" on public.applications;
create policy "workers apply to jobs" on public.applications for insert with check (
  exists (
    select 1
    from public.worker_profiles w
    where w.id = worker_id
      and w.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.jobs j
    where j.id = job_id
      and j.status not in ('Rascunho', 'Cancelada')
  )
);

drop policy if exists "companies update applications for own jobs" on public.applications;
create policy "companies update applications for own jobs" on public.applications for update using (
  exists (
    select 1
    from public.jobs j
    join public.company_profiles c on c.id = j.company_id
    where j.id = job_id
      and c.user_id = auth.uid()
  )
) with check (
  exists (
    select 1
    from public.jobs j
    join public.company_profiles c on c.id = j.company_id
    where j.id = job_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists "shift participants update" on public.work_shifts;
create policy "shift participants update" on public.work_shifts for update using (
  exists (select 1 from public.worker_profiles w where w.id = worker_id and w.user_id = auth.uid())
  or exists (
    select 1
    from public.jobs j
    join public.company_profiles c on c.id = j.company_id
    where j.id = job_id
      and c.user_id = auth.uid()
  )
) with check (
  exists (select 1 from public.worker_profiles w where w.id = worker_id and w.user_id = auth.uid())
  or exists (
    select 1
    from public.jobs j
    join public.company_profiles c on c.id = j.company_id
    where j.id = job_id
      and c.user_id = auth.uid()
  )
);
