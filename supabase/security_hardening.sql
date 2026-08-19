-- Free Floripa - reforço de segurança (auditoria de 2026-08-19)
-- Execute este arquivo inteiro de uma vez no SQL editor do Supabase, depois
-- de todos os outros arquivos em supabase/ já terem sido aplicados
-- (especialmente coin_wallets.sql, coin_applications.sql, moderator_role.sql
-- e reviews_persistence.sql, que este arquivo depende e substitui trechos).
--
-- Resolve 5 problemas encontrados na auditoria:
--   1. Qualquer usuário autenticado podia chamar add_coin_transaction()
--      diretamente (fora do app, via API) com tx_kind='purchase' e
--      qualquer valor, se creditando moedas ilimitadas de graça - hoje o
--      app ainda não cobra pagamento real por moeda, então isso não rouba
--      dinheiro de ninguém agora, mas precisa estar fechado antes de haver
--      pagamento de verdade. A função passa a só aceitar os 3 pacotes que o
--      app realmente vende hoje (5, 20 ou 35 moedas, com o "reason" certo).
--   2. A auto-promoção a admin/moderador só era bloqueada por um gatilho
--      criado em moderator_role.sql - se o schema.sql base fosse aplicado
--      sozinho em algum ambiente novo, um usuário comum poderia se
--      promover a admin escrevendo na própria linha de public.users. Este
--      arquivo recria esse gatilho de forma idempotente, então rodar este
--      arquivo garante a proteção independentemente do que já foi rodado.
--   3. Empresa podia avaliar qualquer trabalhador (e vice-versa) sem nunca
--      terem trabalhado juntos, inflando ou derrubando a reputação de
--      qualquer perfil à vontade. Passa a exigir uma candidatura real com
--      status 'Trabalho concluído' entre as duas partes.
--   4. Um trabalhador/empresa bloqueado pela moderação só era barrado na
--      interface - a política que registra candidatura não conferia o
--      bloqueio, então dava para contornar via chamada direta à API.
--   5. NUNCA existiu uma política de UPDATE em public.applications para o
--      próprio trabalhador (só existe uma para a empresa dona da vaga). Isso
--      significa que a funcionalidade "Cancelar candidatura" (adicionada
--      nesta mesma sessão) nunca conseguiu persistir no banco real - o botão
--      parecia funcionar porque o app atualiza o estado local na hora, mas
--      updateRemoteApplicationStatus() sempre falhava em silêncio (o erro só
--      aparecia como "Falha ao salvar" no canto da tela). Pelo mesmo motivo,
--      reabrir uma candidatura cancelada (publishApplication faz um upsert
--      com onConflict em job_id+worker_id) também falhava, porque o caminho
--      de conflito exige UPDATE, que não tinha política nenhuma liberando.
--      src/lib/store.tsx também foi ajustado para reaproveitar o id da
--      candidatura cancelada ao reenviar, em vez de gerar um id novo - assim
--      o upsert nunca precisa trocar a chave primária de uma linha existente.
--
-- Nota: existe uma função public.apply_to_job_with_coin (coin_applications.sql)
-- que parecia ser o caminho "oficial" para candidatura com moeda, mas o app
-- nunca chegou a usá-la - o caminho real é applyToJob() em src/lib/store.tsx,
-- que insere direto em public.applications via publishApplication(). Este
-- arquivo também reforça a função por precaução (caso seja usada no futuro),
-- mas a correção que importa de verdade para o app hoje é a nova política de
-- UPDATE da seção 4/5 abaixo.

-- ---------------------------------------------------------------------------
-- 1) Moedas: só aceitar os pacotes reais do app, nunca um valor arbitrário
--    vindo do cliente.
create or replace function public.add_coin_transaction(
  target_user_id uuid,
  coin_delta integer,
  tx_kind text,
  tx_reason text,
  target_job_id text default null,
  target_application_id text default null,
  tx_metadata jsonb default '{}'::jsonb
)
returns public.coin_wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  wallet public.coin_wallets;
  next_balance integer;
begin
  if auth.uid() is null or auth.uid() <> target_user_id then
    raise exception 'Acesso negado para esta carteira.';
  end if;

  if coin_delta = 0 then
    raise exception 'A transação precisa alterar o saldo.';
  end if;

  if tx_kind = 'purchase' then
    if not (
      (tx_reason = 'coin_pack' and coin_delta = 5)
      or (tx_reason = 'package_professional' and coin_delta = 20)
      or (tx_reason = 'package_plus' and coin_delta = 35)
    ) then
      raise exception 'Pacote de moedas inválido.';
    end if;
  elsif tx_kind <> 'spend' then
    -- 'bonus'/'refund'/'admin_adjustment' não são usados pelo app por esta
    -- função hoje; só permitidos aqui se algum dia forem chamados fora de um
    -- contexto de usuário autenticado (ex.: script administrativo interno).
    raise exception 'Tipo de transação não permitido para esta chamada.';
  end if;

  insert into public.coin_wallets (user_id)
  values (target_user_id)
  on conflict (user_id) do nothing;

  select *
  into wallet
  from public.coin_wallets
  where user_id = target_user_id
  for update;

  next_balance := wallet.balance + coin_delta;
  if next_balance < 0 then
    raise exception 'Saldo de moedas insuficiente.';
  end if;

  update public.coin_wallets
  set balance = next_balance, updated_at = now()
  where user_id = target_user_id
  returning * into wallet;

  insert into public.coin_transactions (
    user_id,
    kind,
    reason,
    amount,
    balance_after,
    job_id,
    application_id,
    metadata
  )
  values (
    target_user_id,
    tx_kind,
    tx_reason,
    coin_delta,
    next_balance,
    target_job_id,
    target_application_id,
    coalesce(tx_metadata, '{}'::jsonb)
  );

  return wallet;
end;
$$;

grant execute on function public.add_coin_transaction(uuid, integer, text, text, text, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Bloqueia auto-promoção a admin/moderador, de forma independente do que
--    já tiver sido aplicado por moderator_role.sql.
create or replace function public.guard_user_role() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null then
    if tg_op = 'UPDATE' and old.role in ('admin', 'moderador') and new.role is distinct from old.role then
      new.role := old.role;
    elsif new.role in ('admin', 'moderador') then
      raise exception 'Não é permitido definir role %.', new.role;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_user_role on public.users;
create trigger trg_guard_user_role
before insert or update on public.users
for each row execute function public.guard_user_role();

-- ---------------------------------------------------------------------------
-- 3) Avaliações só podem ser criadas em cima de uma candidatura real com
--    trabalho concluído entre as duas partes - fecha avaliação forjada e,
--    de quebra, limita a uma avaliação por candidatura (o índice único em
--    application_id já existente passa a valer de verdade).
drop policy if exists "companies create worker reviews" on public.worker_reviews;
create policy "companies create worker reviews" on public.worker_reviews for insert with check (
  exists (select 1 from public.company_profiles c where c.id = company_id and c.user_id = auth.uid())
  and application_id is not null
  and exists (
    select 1
    from public.applications a
    join public.jobs j on j.id = a.job_id
    where a.id = application_id
      and a.worker_id = worker_id
      and a.status = 'Trabalho concluído'
      and j.company_id = company_id
      and j.id = job_id
  )
);

drop policy if exists "workers create company reviews" on public.company_reviews;
create policy "workers create company reviews" on public.company_reviews for insert with check (
  exists (select 1 from public.worker_profiles w where w.id = worker_id and w.user_id = auth.uid())
  and application_id is not null
  and exists (
    select 1
    from public.applications a
    join public.jobs j on j.id = a.job_id
    where a.id = application_id
      and a.worker_id = worker_id
      and a.status = 'Trabalho concluído'
      and j.company_id = company_id
      and j.id = job_id
  )
);

-- ---------------------------------------------------------------------------
-- 4) e 5) Candidatura via moeda: passa a respeitar bloqueio de moderação e
--    permite reabrir uma candidatura cancelada (em vez de travar para
--    sempre por causa da restrição unique(job_id, worker_id)).
create or replace function public.apply_to_job_with_coin(
  target_job_id text,
  target_worker_id uuid,
  target_application_id uuid
)
returns table (
  application_id uuid,
  wallet_balance integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid := auth.uid();
  target_job_uuid uuid;
  existing_application_id uuid;
  existing_status public.application_status;
  created_application_id uuid;
  wallet public.coin_wallets;
  next_balance integer;
begin
  if target_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  begin
    target_job_uuid := target_job_id::uuid;
  exception
    when invalid_text_representation then
      raise exception 'Vaga remota inválida.';
  end;

  if not exists (
    select 1
    from public.worker_profiles
    where id = target_worker_id and user_id = target_user_id
  ) then
    raise exception 'Perfil profissional não pertence ao usuário autenticado.';
  end if;

  if exists (
    select 1 from public.moderation_blocks mb
    where mb.target_type = 'worker' and mb.target_id = target_worker_id
  ) then
    raise exception 'Seu perfil está em revisão e não pode enviar candidaturas no momento.';
  end if;

  if not exists (
    select 1
    from public.jobs
    where id = target_job_uuid and status <> 'Cancelada'
  ) then
    raise exception 'Vaga não encontrada ou indisponível.';
  end if;

  if exists (
    select 1
    from public.jobs j
    join public.moderation_blocks mb on mb.target_type = 'company' and mb.target_id = j.company_id
    where j.id = target_job_uuid
  ) then
    raise exception 'Esta empresa está em revisão e não recebe candidaturas agora.';
  end if;

  if not exists (
    select 1
    from public.coin_unlocked_jobs
    where user_id = target_user_id and job_id = target_job_id
  ) then
    raise exception 'Libere a vaga completa antes de enviar candidatura.';
  end if;

  insert into public.coin_wallets (user_id)
  values (target_user_id)
  on conflict (user_id) do nothing;

  select id, status
  into existing_application_id, existing_status
  from public.applications
  where job_id = target_job_uuid and worker_id = target_worker_id;

  select *
  into wallet
  from public.coin_wallets
  where user_id = target_user_id
  for update;

  if existing_application_id is not null and existing_status <> 'Cancelada' then
    application_id := existing_application_id;
    wallet_balance := wallet.balance;
    return next;
  end if;

  next_balance := wallet.balance - 1;
  if next_balance < 0 then
    raise exception 'Saldo de moedas insuficiente.';
  end if;

  if existing_application_id is not null then
    update public.applications
    set status = 'Enviada', updated_at = now()
    where id = existing_application_id;

    created_application_id := existing_application_id;
  else
    insert into public.applications (
      id,
      job_id,
      worker_id,
      status,
      created_at,
      updated_at
    )
    values (
      target_application_id,
      target_job_uuid,
      target_worker_id,
      'Enviada',
      now(),
      now()
    )
    on conflict (job_id, worker_id) do nothing
    returning id into created_application_id;

    if created_application_id is null then
      -- corrida rara: outra requisição inseriu ao mesmo tempo; não cobra moeda.
      select id
      into created_application_id
      from public.applications
      where job_id = target_job_uuid and worker_id = target_worker_id;

      application_id := created_application_id;
      wallet_balance := wallet.balance;
      return next;
    end if;
  end if;

  update public.coin_wallets
  set balance = next_balance, updated_at = now()
  where user_id = target_user_id
  returning * into wallet;

  insert into public.coin_transactions (
    user_id,
    kind,
    reason,
    amount,
    balance_after,
    job_id,
    application_id
  )
  values (
    target_user_id,
    'spend',
    'apply_job',
    -1,
    next_balance,
    target_job_id,
    target_application_id::text
  );

  application_id := created_application_id;
  wallet_balance := next_balance;
  return next;
end;
$$;

grant execute on function public.apply_to_job_with_coin(text, uuid, uuid) to authenticated;

drop policy if exists "companies invite workers to own jobs" on public.applications;
create policy "companies invite workers to own jobs" on public.applications for insert with check (
  exists (
    select 1
    from public.jobs j
    join public.company_profiles c on c.id = j.company_id
    where j.id = job_id and c.user_id = auth.uid()
      and not exists (
        select 1 from public.moderation_blocks mb
        where mb.target_type = 'company' and mb.target_id = c.id
      )
  )
  and not exists (
    select 1 from public.moderation_blocks mb
    where mb.target_type = 'worker' and mb.target_id = worker_id
  )
);

-- Caminho real usado pelo app hoje (src/lib/store.tsx applyToJob ->
-- publishApplication, um upsert direto em public.applications - não passa
-- pela função apply_to_job_with_coin acima). Reforça a checagem de bloqueio
-- de moderação nesse caminho de verdade.
drop policy if exists "workers apply to jobs" on public.applications;
create policy "workers apply to jobs" on public.applications for insert with check (
  exists (select 1 from public.worker_profiles w where w.id = worker_id and w.user_id = auth.uid())
  and exists (
    select 1
    from public.jobs j
    where j.id = job_id
      and j.status not in ('Rascunho', 'Cancelada')
  )
  and not exists (
    select 1 from public.moderation_blocks mb
    where mb.target_type = 'worker' and mb.target_id = worker_id
  )
  and not exists (
    select 1
    from public.jobs j
    join public.moderation_blocks mb on mb.target_type = 'company' and mb.target_id = j.company_id
    where j.id = job_id
  )
);

-- Nunca existiu uma política de UPDATE para o próprio trabalhador em
-- public.applications - sem ela, tanto "Cancelar candidatura" quanto reabrir
-- uma candidatura cancelada (o upsert de publishApplication cai aqui quando
-- já existe uma linha para o par vaga+trabalhador) falhavam sempre. O
-- trabalhador só pode mexer na própria linha, só a partir de um status ainda
-- "em aberto", e só para reenviar ('Enviada') ou cancelar ('Cancelada') -
-- nunca para se auto-aprovar ou mexer em candidaturas já decididas pela
-- empresa.
drop policy if exists "workers manage own application status" on public.applications;
create policy "workers manage own application status" on public.applications for update using (
  exists (select 1 from public.worker_profiles w where w.id = worker_id and w.user_id = auth.uid())
  and status in ('Enviada', 'Em análise', 'Cancelada')
) with check (
  exists (select 1 from public.worker_profiles w where w.id = worker_id and w.user_id = auth.uid())
  and status in ('Enviada', 'Cancelada')
  and not exists (
    select 1 from public.moderation_blocks mb
    where mb.target_type = 'worker' and mb.target_id = worker_id
  )
);
