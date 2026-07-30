-- Free Floripa - candidatura segura com moedas
-- Execute este arquivo no SQL editor do Supabase depois do coin_wallets.sql.

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

  if not exists (
    select 1
    from public.jobs
    where id = target_job_uuid and status <> 'Cancelada'
  ) then
    raise exception 'Vaga não encontrada ou indisponível.';
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

  select id
  into existing_application_id
  from public.applications
  where job_id = target_job_uuid and worker_id = target_worker_id;

  select *
  into wallet
  from public.coin_wallets
  where user_id = target_user_id
  for update;

  if existing_application_id is not null then
    application_id := existing_application_id;
    wallet_balance := wallet.balance;
    return next;
  end if;

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
    select id
    into created_application_id
    from public.applications
    where job_id = target_job_uuid and worker_id = target_worker_id;

    application_id := created_application_id;
    wallet_balance := wallet.balance;
    return next;
  end if;

  next_balance := wallet.balance - 1;
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

-- A candidatura do trabalhador passa pela funcao acima, para validar saldo e registrar transacao.
-- Convites da empresa continuam usando a politica "companies invite workers to own jobs".
drop policy if exists "workers apply to jobs" on public.applications;
