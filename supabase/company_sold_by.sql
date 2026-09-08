-- Atribuição de venda: qual vendedor trouxe / fechou o pacote com a empresa.
--
-- É um campo de texto livre em company_profiles (nome ou código do vendedor).
-- Preenchido de dois jeitos:
--   1. automático: a empresa chega por um link do vendedor
--      (usepont.com.br/cadastro-empresa?vendedor=MARIA); o app guarda "MARIA"
--      e grava no cadastro.
--   2. manual: a administração define/corrige pelo painel, via a função
--      admin_set_company_sold_by (gated por is_support_user()).
--
-- Rode uma vez no SQL Editor, depois de setup_free_floripa_marketplace.sql e
-- close_coin_purchases.sql.

alter table public.company_profiles
  add column if not exists sold_by text;

create or replace function public.admin_set_company_sold_by(
  target_company_id uuid,
  value text
)
returns public.company_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  company public.company_profiles;
begin
  if not public.is_support_user() then
    raise exception 'Ação restrita ao suporte.';
  end if;

  update public.company_profiles
  set sold_by = nullif(trim(coalesce(value, '')), ''), updated_at = now()
  where id = target_company_id
  returning * into company;

  if not found then
    raise exception 'Empresa não encontrada.';
  end if;

  return company;
end;
$$;

revoke all on function public.admin_set_company_sold_by(uuid, text) from public;
grant execute on function public.admin_set_company_sold_by(uuid, text) to authenticated;
