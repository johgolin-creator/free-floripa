-- PONT — pagamentos (Mercado Pago) para compra de moedas e Plus.
--
-- Contexto: a compra self-service foi desligada em close_coin_purchases.sql
-- (só o suporte credita, por e-mail, depois de pagamento no WhatsApp). Este
-- arquivo religa a compra pelo app, mas o crédito na carteira continua
-- acontecendo SÓ no servidor: a Edge Function mercadopago-webhook
-- (supabase/functions/mercadopago-webhook) confirma o pagamento no Mercado
-- Pago e chama public.credit_payment com a service role. O cliente nunca
-- credita a própria carteira.
--
-- Rode uma vez no SQL Editor do Supabase, DEPOIS de coin_wallets.sql,
-- coin_enforcement.sql, plus_unlimited.sql e close_coin_purchases.sql.

create extension if not exists "pgcrypto";

-- --- Tabela de pedidos -----------------------------------------------------

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.user_role not null,
  product_id text not null,
  provider text not null default 'mercadopago',
  -- id do pagamento no provedor (preenchido quando ele existe). Único para
  -- garantir idempotência do webhook.
  provider_payment_id text,
  -- referência que enviamos ao provedor e recebemos de volta (external_reference).
  external_reference text not null default gen_random_uuid()::text,
  amount_cents integer not null check (amount_cents > 0),
  coins integer not null default 0 check (coins >= 0),
  plus_days integer not null default 0 check (plus_days >= 0),
  ledger_reason text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled', 'refunded', 'in_process')),
  -- true depois que a carteira foi creditada. Trava o crédito duplo.
  credited boolean not null default false,
  init_point text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);

create unique index if not exists payments_provider_payment_id_key
  on public.payments (provider, provider_payment_id)
  where provider_payment_id is not null;

create unique index if not exists payments_external_reference_key
  on public.payments (external_reference);

create index if not exists payments_user_id_idx on public.payments (user_id, created_at desc);

drop trigger if exists payments_updated_at on public.payments;
create trigger payments_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

alter table public.payments enable row level security;

-- O usuário só lê os próprios pedidos. Inserção e atualização acontecem só
-- via service role (Edge Functions), que ignora RLS.
drop policy if exists "users read own payments" on public.payments;
create policy "users read own payments" on public.payments
for select using (auth.uid() = user_id);

-- Suporte enxerga tudo (painel admin / investigação).
drop policy if exists "support reads all payments" on public.payments;
create policy "support reads all payments" on public.payments
for select using (public.is_support_user());

-- --- Crédito da carteira a partir de um pagamento aprovado ---------------

create or replace function public.credit_payment(
  target_payment_id uuid,
  mp_payment_id text,
  mp_status text
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  pay public.payments;
  wallet public.coin_wallets;
  next_balance integer;
  normalized_status text;
begin
  -- Só a service role (Edge Function) ou o suporte podem creditar.
  if auth.role() is distinct from 'service_role' and not public.is_support_user() then
    raise exception 'Ação restrita ao servidor de pagamentos.';
  end if;

  select * into pay from public.payments where id = target_payment_id for update;
  if not found then
    raise exception 'Pagamento % não encontrado.', target_payment_id;
  end if;

  normalized_status := case
    when mp_status in ('approved', 'authorized') then 'approved'
    when mp_status in ('rejected', 'cancelled') then mp_status
    when mp_status in ('refunded', 'charged_back') then 'refunded'
    when mp_status in ('in_process', 'pending', 'in_mediation') then 'in_process'
    else 'pending'
  end;

  -- Amarra o id do provedor na primeira notificação (idempotência).
  if pay.provider_payment_id is null and mp_payment_id is not null then
    update public.payments set provider_payment_id = mp_payment_id where id = pay.id
    returning * into pay;
  end if;

  -- Já creditado: não faz nada (webhook pode chegar várias vezes).
  if pay.credited then
    return pay;
  end if;

  if normalized_status <> 'approved' then
    update public.payments set status = normalized_status where id = pay.id returning * into pay;
    return pay;
  end if;

  -- Aprovado e ainda não creditado: credita a carteira.
  insert into public.coin_wallets (user_id, role)
  values (pay.user_id, pay.role)
  on conflict (user_id, role) do nothing;

  select * into wallet from public.coin_wallets
  where user_id = pay.user_id and role = pay.role for update;

  if pay.coins > 0 then
    next_balance := wallet.balance + pay.coins;
    update public.coin_wallets set balance = next_balance, updated_at = now()
    where user_id = pay.user_id and role = pay.role
    returning * into wallet;

    insert into public.coin_transactions (user_id, kind, reason, amount, balance_after, metadata)
    values (
      pay.user_id, 'purchase', pay.ledger_reason, pay.coins, next_balance,
      jsonb_build_object('payment_id', pay.id, 'provider', pay.provider, 'provider_payment_id', pay.provider_payment_id)
    );
  end if;

  if pay.plus_days > 0 then
    update public.coin_wallets
    set plus_active_until = greatest(coalesce(plus_active_until, now()), now()) + (pay.plus_days || ' days')::interval,
        updated_at = now()
    where user_id = pay.user_id and role = pay.role;
  end if;

  update public.payments
  set status = 'approved', credited = true, paid_at = now()
  where id = pay.id
  returning * into pay;

  return pay;
end;
$$;

revoke all on function public.credit_payment(uuid, text, text) from public;
grant execute on function public.credit_payment(uuid, text, text) to service_role;
grant execute on function public.credit_payment(uuid, text, text) to authenticated; -- guardado por is_support_user() lá dentro
