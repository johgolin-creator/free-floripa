-- app_gratuito.sql  --  SCRIPT AVULSO (rodar uma vez no SQL Editor)
--
-- O PONT passou a ser gratuito para todos (Issue #13). Este script desliga
-- toda cobrança de moedas feita pelo banco:
--   * candidatura não gasta mais 1 moeda (coin_enforcement.sql / plus_unlimited.sql);
--   * cancelar vaga preenchida não gasta mais 10 moedas da empresa;
--   * contas novas não recebem mais moedas de boas-vindas (welcome_coins.sql).
--
-- As tabelas de moedas, pagamentos e vendas (coin_wallets, coin_transactions,
-- payments, sales) NÃO são apagadas: ficam como histórico. A área de
-- vendedores continua funcionando como antes.
--
-- Idempotente: pode rodar mais de uma vez sem erro.
-- Rodar: Supabase Dashboard -> SQL Editor -> cola -> Run.

-- 1. Candidatura sem cobrança de moeda.
drop trigger if exists trg_charge_coin_for_application on public.applications;
drop function if exists public.charge_coin_for_application();

-- 2. Cancelamento de vaga preenchida sem cobrança de moeda.
drop trigger if exists trg_charge_coin_for_job_cancellation on public.jobs;
drop function if exists public.charge_coin_for_job_cancellation();

-- 3. Sem moedas de boas-vindas no cadastro.
drop trigger if exists trg_grant_welcome_coins on auth.users;
drop function if exists public.grant_welcome_coins();

-- Conferência: deve voltar 0 linhas.
select tgname
from pg_trigger
where tgname in (
  'trg_charge_coin_for_application',
  'trg_charge_coin_for_job_cancellation',
  'trg_grant_welcome_coins'
);
