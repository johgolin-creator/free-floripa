-- Free Floripa - carteira de moedas
-- Execute este arquivo no SQL editor do Supabase depois do schema principal.

create extension if not exists "pgcrypto";

create table if not exists public.coin_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coin_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('purchase', 'spend', 'bonus', 'refund', 'admin_adjustment')),
  reason text not null,
  amount integer not null check (amount <> 0),
  balance_after integer not null check (balance_after >= 0),
  job_id text,
  application_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.coin_unlocked_jobs (
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, job_id)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists coin_wallets_updated_at on public.coin_wallets;
create trigger coin_wallets_updated_at
before update on public.coin_wallets
for each row execute function public.set_updated_at();

alter table public.coin_wallets enable row level security;
alter table public.coin_transactions enable row level security;
alter table public.coin_unlocked_jobs enable row level security;

drop policy if exists "users read own coin wallet" on public.coin_wallets;
drop policy if exists "users read own coin transactions" on public.coin_transactions;
drop policy if exists "users read own unlocked jobs" on public.coin_unlocked_jobs;

create policy "users read own coin wallet" on public.coin_wallets
for select using (auth.uid() = user_id);

create policy "users read own coin transactions" on public.coin_transactions
for select using (auth.uid() = user_id);

create policy "users read own unlocked jobs" on public.coin_unlocked_jobs
for select using (auth.uid() = user_id);

create or replace function public.ensure_coin_wallet(target_user_id uuid)
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

  insert into public.coin_wallets (user_id)
  values (target_user_id)
  on conflict (user_id) do nothing;

  select *
  into wallet
  from public.coin_wallets
  where user_id = target_user_id;

  return wallet;
end;
$$;

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

  if tx_kind not in ('purchase', 'spend', 'bonus', 'refund', 'admin_adjustment') then
    raise exception 'Tipo de transação inválido.';
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

create or replace function public.unlock_job_with_coin(target_job_id text)
returns public.coin_wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid := auth.uid();
  wallet public.coin_wallets;
  next_balance integer;
begin
  if target_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  insert into public.coin_wallets (user_id)
  values (target_user_id)
  on conflict (user_id) do nothing;

  select *
  into wallet
  from public.coin_wallets
  where user_id = target_user_id
  for update;

  if exists (
    select 1
    from public.coin_unlocked_jobs
    where user_id = target_user_id and job_id = target_job_id
  ) then
    return wallet;
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
    job_id
  )
  values (
    target_user_id,
    'spend',
    'unlock_job',
    -1,
    next_balance,
    target_job_id
  );

  insert into public.coin_unlocked_jobs (user_id, job_id)
  values (target_user_id, target_job_id)
  on conflict (user_id, job_id) do nothing;

  return wallet;
end;
$$;

grant execute on function public.ensure_coin_wallet(uuid) to authenticated;
grant execute on function public.add_coin_transaction(uuid, integer, text, text, text, text, jsonb) to authenticated;
grant execute on function public.unlock_job_with_coin(text) to authenticated;
