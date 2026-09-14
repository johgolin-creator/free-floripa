-- Avisa automaticamente todos os freelancers quando uma vaga nova é
-- publicada (seja criada já publicada, seja criada como rascunho e
-- publicada depois). Dispara uma notificação por trabalhador em
-- public.notifications, sem depender de ninguém clicar em nada no painel
-- admin.
--
-- Idempotente: pode rodar de novo.

create or replace function public.notify_workers_new_job()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  company_name text;
begin
  select establishment_name into company_name
  from public.company_profiles
  where id = new.company_id;

  insert into public.notifications (id, user_id, role, title, body, read, created_at)
  select
    gen_random_uuid(),
    wp.user_id,
    'trabalhador',
    'Nova vaga disponivel',
    format(
      $msg$Nova vaga disponivel: %s esta contratando %s %s(s) para %s. Candidate-se agora no PONT!$msg$,
      coalesce(company_name, 'Uma empresa'),
      new.quantity,
      new.function_name,
      new.title
    ),
    false,
    now()
  from public.worker_profiles wp
  where wp.user_id is not null;

  return new;
end;
$function$;

-- Vaga criada já publicada (não rascunho, não cancelada).
drop trigger if exists trg_notify_workers_new_job_insert on public.jobs;
create trigger trg_notify_workers_new_job_insert
after insert on public.jobs
for each row
when (new.status not in ('Rascunho', 'Cancelada'))
execute function public.notify_workers_new_job();

-- Vaga criada como rascunho e publicada depois: notifica só na transição.
drop trigger if exists trg_notify_workers_new_job_publish on public.jobs;
create trigger trg_notify_workers_new_job_publish
after update of status on public.jobs
for each row
when (old.status = 'Rascunho' and new.status not in ('Rascunho', 'Cancelada'))
execute function public.notify_workers_new_job();
