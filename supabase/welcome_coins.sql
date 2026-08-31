-- welcome_coins.sql  --  SCRIPT AVULSO (nao faz parte das migrations)
--
-- Toda conta nova (trabalhador ou empresa) nasce com 5 moedas na carteira
-- do seu papel, com um lancamento "welcome_bonus" no extrato. Nenhum outro
-- bonus e concedido.
--
-- O gatilho fica em auth.users (dispara no momento do cadastro, antes de
-- qualquer efeito do cliente), entao a carteira ja existe com saldo 5
-- quando o app chama ensure_coin_wallet -- o insert de la cai no
-- "on conflict do nothing" e o saldo 5 e preservado.
--
-- Contas que ja existem nao sao afetadas (o gatilho so roda em INSERT).
--
-- Rodar: Supabase Dashboard -> SQL Editor -> cola -> Run.

create or replace function public.grant_welcome_coins()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_role text := new.raw_user_meta_data->>'role';
  inserted_count int;
begin
  -- So trabalhador/empresa ganham. Qualquer outro valor (ou ausencia) sai fora.
  if raw_role is null or raw_role not in ('trabalhador', 'empresa') then
    return new;
  end if;

  insert into public.coin_wallets (user_id, role, balance)
  values (new.id, raw_role::public.user_role, 5)
  on conflict (user_id, role) do nothing;
  get diagnostics inserted_count = row_count;

  -- So registra o lancamento se a carteira foi de fato criada agora.
  if inserted_count > 0 then
    insert into public.coin_transactions (user_id, kind, reason, amount, balance_after)
    values (new.id, 'bonus', 'welcome_bonus', 5, 5);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_grant_welcome_coins on auth.users;
create trigger trg_grant_welcome_coins
after insert on auth.users
for each row execute function public.grant_welcome_coins();
