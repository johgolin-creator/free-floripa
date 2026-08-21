-- Free Floripa - convite de vaga com aceitar/recusar (2026-08-21)
-- Execute este arquivo inteiro de uma vez no SQL editor do Supabase, depois
-- de todos os outros arquivos em supabase/ já terem sido aplicados
-- (em especial security_hardening.sql, de onde vem a política de UPDATE em
-- public.applications que este arquivo estende).
--
-- Problema: quando uma empresa "convidava" um trabalhador do banco de
-- profissionais (inviteWorkerToJob em src/lib/store.tsx), a candidatura já
-- nascia com status 'Aprovada' na hora - o trabalhador nunca tinha a chance
-- de aceitar ou recusar, e a vaga contava como preenchida sem confirmação
-- de ninguém além da empresa.
--
-- Este arquivo adiciona dois status novos ao enum public.application_status
-- ('Convidada' = convite pendente, 'Convite recusado' = trabalhador
-- recusou) e ajusta a política de UPDATE do trabalhador para permitir essa
-- transição - mas só a partir de um convite de verdade, nunca como forma de
-- um trabalhador se auto-aprovar numa candidatura comum ('Enviada').

-- ---------------------------------------------------------------------------
-- 1) Novos valores do enum. Precisam estar em um bloco/transação separado de
--    qualquer INSERT/UPDATE que os use (regra do Postgres), então execute
--    este arquivo inteiro de uma vez e não junto de outro script na mesma
--    transação.
alter type public.application_status add value if not exists 'Convidada';
alter type public.application_status add value if not exists 'Convite recusado';

-- ---------------------------------------------------------------------------
-- 2) O trabalhador agora também pode mexer na própria linha quando ela está
--    'Convidada' (para aceitar ou recusar), além dos casos já cobertos por
--    security_hardening.sql (reenviar ou cancelar uma candidatura própria).
drop policy if exists "workers manage own application status" on public.applications;
create policy "workers manage own application status" on public.applications for update using (
  exists (select 1 from public.worker_profiles w where w.id = worker_id and w.user_id = auth.uid())
  and status in ('Enviada', 'Em análise', 'Cancelada', 'Convidada')
) with check (
  exists (select 1 from public.worker_profiles w where w.id = worker_id and w.user_id = auth.uid())
  and status in ('Enviada', 'Cancelada', 'Aprovada', 'Convite recusado')
  and not exists (
    select 1 from public.moderation_blocks mb
    where mb.target_type = 'worker' and mb.target_id = worker_id
  )
);

-- ---------------------------------------------------------------------------
-- 3) Guarda-corpo: a política acima, sozinha, deixaria um trabalhador
--    colocar QUALQUER candidatura própria em 'Aprovada' (não só um convite
--    de verdade) - o que seria uma auto-aprovação. Este gatilho garante que
--    só é possível chegar em 'Aprovada' ou 'Convite recusado' vindo de
--    'Convidada', e só quando quem está fazendo a alteração é o próprio
--    trabalhador (a empresa continua aprovando/recusando candidaturas
--    normalmente pelo caminho já existente, sem passar por esta checagem).
create or replace function public.guard_worker_invite_response() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null
     and exists (select 1 from public.worker_profiles w where w.id = new.worker_id and w.user_id = auth.uid())
  then
    if new.status in ('Aprovada', 'Convite recusado') and old.status <> 'Convidada' then
      raise exception 'Só é possível aceitar ou recusar um convite existente.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_worker_invite_response on public.applications;
create trigger trg_guard_worker_invite_response
before update on public.applications
for each row execute function public.guard_worker_invite_response();
