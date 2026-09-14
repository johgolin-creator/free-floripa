-- Impede candidatura em vaga já totalmente preenchida, no banco (não só no
-- cliente). A RLS de "workers apply to jobs" (marketplace_jobs.sql) só
-- checa o status bruto da vaga (não Rascunho/Cancelada) - o status não vira
-- "Em andamento" sozinho quando a vaga enche, isso é só calculado no
-- cliente (getJobStatus/getOpenSlots em src/lib/rules.ts). Então alguém
-- chamando a API REST direto, ou duas pessoas se candidatando ao mesmo
-- instante pro último lugar, conseguia passar da capacidade da vaga.
--
-- Roda como trigger BEFORE INSERT/UPDATE em public.applications, contando
-- as candidaturas já aprovadas (Aprovada / Trabalho concluído) para a
-- mesma vaga - mesmo critério que job.filled usa no cliente.
--
-- Rode uma vez no SQL Editor do Supabase, depois de marketplace_jobs.sql.

create or replace function public.enforce_job_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  job_quantity integer;
  approved_count integer;
begin
  -- Só entra na regra quando a linha está indo para "Enviada" (candidatura
  -- nova ou reenvio depois de cancelada). Outras transições de status
  -- (aprovação, falta, conclusão etc.) não passam por aqui.
  if new.status <> 'Enviada' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'Enviada' then
    return new;
  end if;

  select quantity into job_quantity from public.jobs where id = new.job_id;
  if job_quantity is null then
    raise exception 'Vaga não encontrada.';
  end if;

  select count(*) into approved_count
  from public.applications
  where job_id = new.job_id and status in ('Aprovada', 'Trabalho concluído');

  if approved_count >= job_quantity then
    raise exception 'Esta vaga já está preenchida.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_job_capacity on public.applications;
create trigger trg_enforce_job_capacity
before insert or update on public.applications
for each row execute function public.enforce_job_capacity();
