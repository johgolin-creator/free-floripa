-- Plus now grants unlimited candidaturas/cancelamentos for 30 days, instead
-- of (on top of) a fixed 35-coin package. Since coin_enforcement.sql moved
-- charging into database triggers, "unlimited" has to be recognized there
-- too - a client claiming it has unlimited access would otherwise still get
-- charged for real by the trigger, or worse, a forged claim would need to
-- be checked server-side anyway.
--
-- Run this whole file once in the Supabase SQL Editor, after
-- coin_enforcement.sql has already been applied.

alter table public.coin_wallets add column if not exists plus_active_until timestamptz;

create or replace function public.activate_unlimited_plan(
  target_user_id uuid,
  target_role public.user_role,
  days integer default 30
)
returns public.coin_wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  wallet public.coin_wallets;
begin
  if auth.uid() is null or auth.uid() <> target_user_id then
    raise exception 'Acesso negado para esta carteira.';
  end if;
  if target_role not in ('trabalhador', 'empresa') then
    raise exception 'Papel inválido para carteira de moedas.';
  end if;
  if days <= 0 then
    raise exception 'Duração inválida para o plano ilimitado.';
  end if;

  insert into public.coin_wallets (user_id, role)
  values (target_user_id, target_role)
  on conflict (user_id, role) do nothing;

  update public.coin_wallets
  set plus_active_until = greatest(coalesce(plus_active_until, now()), now()) + (days || ' days')::interval,
      updated_at = now()
  where user_id = target_user_id and role = target_role
  returning * into wallet;

  return wallet;
end;
$$;

grant execute on function public.activate_unlimited_plan(uuid, public.user_role, integer) to authenticated;

-- Skip the 1-moeda charge entirely while the worker's Plus window is active.
create or replace function public.charge_coin_for_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  worker_owner_id uuid;
  wallet public.coin_wallets;
  next_balance integer;
begin
  if new.status <> 'Enviada' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if exists (select 1 from public.applications where job_id = new.job_id and worker_id = new.worker_id) then
      return new;
    end if;
  elsif old.status = 'Enviada' then
    return new;
  end if;

  select w.user_id into worker_owner_id from public.worker_profiles w where w.id = new.worker_id;
  if worker_owner_id is null then
    raise exception 'Trabalhador não encontrado para cobrança de moeda.';
  end if;

  if exists (
    select 1 from public.coin_wallets
    where user_id = worker_owner_id and role = 'trabalhador' and plus_active_until > now()
  ) then
    return new;
  end if;

  insert into public.coin_wallets (user_id, role)
  values (worker_owner_id, 'trabalhador')
  on conflict (user_id, role) do nothing;

  select * into wallet from public.coin_wallets where user_id = worker_owner_id and role = 'trabalhador' for update;

  next_balance := wallet.balance - 1;
  if next_balance < 0 then
    raise exception 'Saldo de moedas insuficiente para enviar candidatura.';
  end if;

  update public.coin_wallets set balance = next_balance, updated_at = now()
  where user_id = worker_owner_id and role = 'trabalhador';

  insert into public.coin_transactions (user_id, kind, reason, amount, balance_after, job_id, application_id)
  values (worker_owner_id, 'spend', 'apply_job', -1, next_balance, new.job_id::text, new.id::text);

  return new;
end;
$$;

-- Skip the 10-moeda charge entirely while the empresa's Plus window is active.
create or replace function public.charge_coin_for_job_cancellation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  company_owner_id uuid;
  approved_count integer;
  wallet public.coin_wallets;
  next_balance integer;
begin
  if new.status <> 'Cancelada' or old.status = 'Cancelada' then
    return new;
  end if;

  select count(*) into approved_count
  from public.applications
  where job_id = new.id and status in ('Aprovada', 'Trabalho concluído');

  if approved_count < new.quantity then
    return new;
  end if;

  select c.user_id into company_owner_id from public.company_profiles c where c.id = new.company_id;
  if company_owner_id is null then
    raise exception 'Empresa não encontrada para cobrança de moeda.';
  end if;

  if exists (
    select 1 from public.coin_wallets
    where user_id = company_owner_id and role = 'empresa' and plus_active_until > now()
  ) then
    return new;
  end if;

  insert into public.coin_wallets (user_id, role)
  values (company_owner_id, 'empresa')
  on conflict (user_id, role) do nothing;

  select * into wallet from public.coin_wallets where user_id = company_owner_id and role = 'empresa' for update;

  next_balance := wallet.balance - 10;
  if next_balance < 0 then
    raise exception 'Saldo de moedas da empresa insuficiente para cancelar vaga preenchida.';
  end if;

  update public.coin_wallets set balance = next_balance, updated_at = now()
  where user_id = company_owner_id and role = 'empresa';

  insert into public.coin_transactions (user_id, kind, reason, amount, balance_after, job_id)
  values (company_owner_id, 'spend', 'cancel_filled_job', -10, next_balance, new.id::text);

  return new;
end;
$$;
