-- Moves coin enforcement from the client into the database.
--
-- Until now, "1 moeda per candidatura" and "10 moedas to cancel a filled
-- vaga" were only checked in the browser (src/lib/store.tsx). The RLS
-- policies that actually allow inserting into public.applications
-- (marketplace_jobs.sql, "workers apply to jobs") and updating
-- public.jobs ("companies update own jobs") never looked at coin balance
-- at all, so anyone calling the Supabase REST API directly (the anon key
-- ships in the page) could send unlimited free applications or cancel a
-- filled vaga without ever paying the empresa fee. Worse, the balance the
-- UI reads (state.subscription.creditsRemaining/companyCreditsRemaining)
-- comes from app_state_snapshots, a JSON blob a user can freely overwrite
-- for their own row (the RLS there only checks ownership, not content).
--
-- This file makes both charges happen as a database trigger, in the same
-- transaction as the insert/update they gate, using the row's REAL wallet
-- balance in public.coin_wallets - not anything the client claims. It also
-- gives public.coin_wallets a role dimension, because today
-- companyCreditsRemaining has no server-side wallet at all: every
-- subscribeProfessional/subscribePlus/buyCredits call in store.tsx only
-- syncs to Supabase "if (state.activeRole === 'trabalhador' ...)" - company
-- coins have only ever existed in that same forgeable JSON blob.
--
-- Run this whole file once in the Supabase SQL Editor, after coin_wallets.sql
-- has already been applied.

-- 1. Give wallets a role dimension (trabalhador vs empresa), preserving
--    every existing balance as that user's 'trabalhador' wallet.
alter table public.coin_wallets add column if not exists role public.user_role not null default 'trabalhador';
alter table public.coin_wallets drop constraint if exists coin_wallets_pkey;
alter table public.coin_wallets add primary key (user_id, role);
alter table public.coin_wallets add constraint coin_wallets_role_check check (role in ('trabalhador', 'empresa'));

-- 2. Re-create the wallet RPCs role-aware. Existing calls that omit
--    target_role keep working against the trabalhador wallet.
create or replace function public.ensure_coin_wallet(target_user_id uuid, target_role public.user_role default 'trabalhador')
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

  insert into public.coin_wallets (user_id, role)
  values (target_user_id, target_role)
  on conflict (user_id, role) do nothing;

  select * into wallet from public.coin_wallets where user_id = target_user_id and role = target_role;
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
  tx_metadata jsonb default '{}'::jsonb,
  target_role public.user_role default 'trabalhador'
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
  if target_role not in ('trabalhador', 'empresa') then
    raise exception 'Papel inválido para carteira de moedas.';
  end if;
  if coin_delta = 0 then
    raise exception 'A transação precisa alterar o saldo.';
  end if;
  if tx_kind not in ('purchase', 'spend', 'bonus', 'refund', 'admin_adjustment') then
    raise exception 'Tipo de transação inválido.';
  end if;

  insert into public.coin_wallets (user_id, role)
  values (target_user_id, target_role)
  on conflict (user_id, role) do nothing;

  select * into wallet from public.coin_wallets where user_id = target_user_id and role = target_role for update;

  next_balance := wallet.balance + coin_delta;
  if next_balance < 0 then
    raise exception 'Saldo de moedas insuficiente.';
  end if;

  update public.coin_wallets set balance = next_balance, updated_at = now()
  where user_id = target_user_id and role = target_role
  returning * into wallet;

  insert into public.coin_transactions (user_id, kind, reason, amount, balance_after, job_id, application_id, metadata)
  values (target_user_id, tx_kind, tx_reason, coin_delta, next_balance, target_job_id, target_application_id, coalesce(tx_metadata, '{}'::jsonb));

  return wallet;
end;
$$;

grant execute on function public.ensure_coin_wallet(uuid, public.user_role) to authenticated;
grant execute on function public.add_coin_transaction(uuid, integer, text, text, text, text, jsonb, public.user_role) to authenticated;

-- 3. Charge 1 moeda from the worker's own wallet the moment a genuine new
--    application lands as 'Enviada' - not on company-created invites
--    (those insert as 'Convidada'), and not twice for the same
--    application (an update that stays 'Enviada' is a no-op here).
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
  if tg_op = 'UPDATE' and old.status = 'Enviada' then
    return new;
  end if;

  select w.user_id into worker_owner_id from public.worker_profiles w where w.id = new.worker_id;
  if worker_owner_id is null then
    raise exception 'Trabalhador não encontrado para cobrança de moeda.';
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

drop trigger if exists trg_charge_coin_for_application on public.applications;
create trigger trg_charge_coin_for_application
before insert or update on public.applications
for each row execute function public.charge_coin_for_application();

-- 4. Charge 10 moedas from the empresa's own wallet the moment a filled
--    vaga (confirmed candidates >= quantity) is cancelled - not for a vaga
--    that still has open slots.
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

drop trigger if exists trg_charge_coin_for_job_cancellation on public.jobs;
create trigger trg_charge_coin_for_job_cancellation
before update on public.jobs
for each row execute function public.charge_coin_for_job_cancellation();

-- 5. Drop the older unlock-job RPCs (unlock_job_with_coin, coin_wallets.sql;
--    apply_to_job_with_coin, coin_applications.sql). Nothing in the client
--    calls either any more (the app moved from "pay to preview a vaga" to
--    "pay to apply", enforced by the trigger above), and both queried
--    coin_wallets by user_id alone - after step 1 gave wallets a role
--    column, that lookup would silently match whichever of a dual-role
--    account's two wallets postgres happened to pick first.
drop function if exists public.unlock_job_with_coin(text);
drop function if exists public.apply_to_job_with_coin(text, uuid, uuid);
