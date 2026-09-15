-- Faz TODA notificação do app (vaga nova, candidatura, escala, pagamento,
-- aviso do admin etc.) disparar também um Web Push, não só a de vaga nova.
-- Substitui o gatilho antigo em public.jobs (trg_send_job_push_insert/update)
-- por um único gatilho em public.notifications - já que tudo isso passa por
-- ali de qualquer forma.
--
-- Depende de pg_net (create extension if not exists pg_net;) e da Edge
-- Function send-job-push já publicada (agora genérica, não só de vagas).
--
-- Rode no SQL Editor do Supabase.

create extension if not exists pg_net;

-- Remove o gatilho antigo, específico de vaga publicada (redundante agora:
-- notify_workers_new_job.sql já insere em public.notifications quando uma
-- vaga é publicada, e o gatilho novo abaixo cobre isso).
drop trigger if exists trg_send_job_push_insert on public.jobs;
drop trigger if exists trg_send_job_push_update on public.jobs;

create or replace function public.trigger_send_notification_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://vhicxnrjgirtevtamlzt.supabase.co/functions/v1/send-job-push',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object('type', 'INSERT', 'table', 'notifications', 'record', to_jsonb(new))
  );
  return new;
end;
$$;

drop trigger if exists trg_send_notification_push on public.notifications;
create trigger trg_send_notification_push
after insert on public.notifications
for each row
execute function public.trigger_send_notification_push();
