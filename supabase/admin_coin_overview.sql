-- Contagem geral de moedas do app inteiro, para o painel admin (aba Moedas).
-- Antes o admin só via o saldo da PRÓPRIA conta ali, sem nenhum total
-- agregado de todas as carteiras. Depende de coin_enforcement.sql (coluna
-- coin_wallets.role) e close_coin_purchases.sql (public.is_support_user).
--
-- Idempotente. Rode no SQL Editor do Supabase.

create or replace function public.admin_coin_overview()
returns table (
  total_balance bigint,
  worker_balance bigint,
  company_balance bigint,
  wallet_count bigint,
  funded_wallet_count bigint,
  worker_plus_active_count bigint,
  company_plus_active_count bigint
)
language sql
security definer
stable
set search_path = public
as $$
  select
    coalesce(sum(balance), 0) as total_balance,
    coalesce(sum(balance) filter (where role = 'trabalhador'), 0) as worker_balance,
    coalesce(sum(balance) filter (where role = 'empresa'), 0) as company_balance,
    count(*) as wallet_count,
    count(*) filter (where balance > 0) as funded_wallet_count,
    count(*) filter (where role = 'trabalhador' and plus_active_until > now()) as worker_plus_active_count,
    count(*) filter (where role = 'empresa' and plus_active_until > now()) as company_plus_active_count
  from public.coin_wallets
  where public.is_support_user()
$$;

revoke all on function public.admin_coin_overview() from public;
grant execute on function public.admin_coin_overview() to authenticated;
