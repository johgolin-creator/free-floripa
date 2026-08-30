-- Closes self-service coin top-ups.
--
-- Until now any authenticated user could credit their own wallet by calling
-- add_coin_transaction with tx_kind='purchase' (that was grantRemoteCoins in
-- src/lib/supabaseCoins.ts) or self-activate Plus via activate_unlimited_plan.
-- The client no longer calls either. This file also stops direct REST calls:
--   * add_coin_transaction now rejects positive deltas / 'purchase' / 'bonus'
--     unless the caller is admin/moderador. Spending (the negative deltas the
--     app relies on elsewhere) is unchanged.
--   * activate_unlimited_plan is restricted to admin/moderador.
--   * new admin_adjust_coins / admin_activate_plus give the support team a
--     way to credit a wallet by e-mail after a WhatsApp payment, surfaced in
--     the admin panel (src/lib/supabaseAdminCoins.ts).
--
-- Existing balances and active Plus windows are untouched.
--
-- Run once in the Supabase SQL Editor, after coin_enforcement.sql and
-- plus_unlimited.sql have been applied. For the admin functions to work,
-- your account must have public.users.role in ('admin','moderador') - see
-- the promotion snippet at the bottom of moderator_role.sql.

create or replace function public.is_support_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role in ('admin', 'moderador')
  );
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

  -- Adding coins is no longer self-service. Only the support team credits
  -- wallets, through admin_adjust_coins.
  if (coin_delta > 0 or tx_kind in ('purchase', 'bonus', 'admin_adjustment')) and not public.is_support_user() then
    raise exception 'Apenas o suporte pode adicionar moedas. Fale com o suporte pelo WhatsApp.';
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
  if not public.is_support_user() then
    raise exception 'O plano ilimitado é liberado apenas pelo suporte.';
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

-- --- Support-only helpers, addressed by e-mail -----------------------------

create or replace function public.admin_adjust_coins(
  target_email text,
  target_role public.user_role,
  coin_delta integer,
  tx_reason text default 'Ajuste manual do suporte'
)
returns public.coin_wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
  wallet public.coin_wallets;
  next_balance integer;
begin
  if not public.is_support_user() then
    raise exception 'Ação restrita ao suporte.';
  end if;
  if target_role not in ('trabalhador', 'empresa') then
    raise exception 'Papel inválido.';
  end if;
  if coin_delta = 0 then
    raise exception 'Informe uma quantidade diferente de zero.';
  end if;

  select id into target_user_id from public.users where lower(email) = lower(trim(target_email));
  if target_user_id is null then
    raise exception 'Nenhuma conta encontrada com esse e-mail.';
  end if;

  insert into public.coin_wallets (user_id, role)
  values (target_user_id, target_role)
  on conflict (user_id, role) do nothing;

  select * into wallet from public.coin_wallets where user_id = target_user_id and role = target_role for update;

  next_balance := wallet.balance + coin_delta;
  if next_balance < 0 then
    raise exception 'O ajuste deixaria o saldo negativo.';
  end if;

  update public.coin_wallets set balance = next_balance, updated_at = now()
  where user_id = target_user_id and role = target_role
  returning * into wallet;

  insert into public.coin_transactions (user_id, kind, reason, amount, balance_after)
  values (target_user_id, 'admin_adjustment', tx_reason, coin_delta, next_balance);

  return wallet;
end;
$$;

create or replace function public.admin_activate_plus(
  target_email text,
  target_role public.user_role,
  days integer default 30
)
returns public.coin_wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
  wallet public.coin_wallets;
begin
  if not public.is_support_user() then
    raise exception 'Ação restrita ao suporte.';
  end if;
  if target_role not in ('trabalhador', 'empresa') then
    raise exception 'Papel inválido.';
  end if;
  if days <= 0 then
    raise exception 'Duração inválida.';
  end if;

  select id into target_user_id from public.users where lower(email) = lower(trim(target_email));
  if target_user_id is null then
    raise exception 'Nenhuma conta encontrada com esse e-mail.';
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

grant execute on function public.is_support_user() to authenticated;
grant execute on function public.admin_adjust_coins(text, public.user_role, integer, text) to authenticated;
grant execute on function public.admin_activate_plus(text, public.user_role, integer) to authenticated;
