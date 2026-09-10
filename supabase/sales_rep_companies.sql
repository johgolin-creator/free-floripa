-- Empresas indicadas por um vendedor, ANTES de qualquer venda.
--
-- O painel do vendedor mostrava só o que estava na tabela public.sales, ou
-- seja, o cliente só aparecia depois que o admin registrava a venda do
-- pacote. Esta função devolve toda empresa cujo company_profiles.sold_by
-- aponta para o código do vendedor logado — a atribuição feita no cadastro
-- pelo link ?vendedor=CODIGO. Assim o vendedor vê a indicação assim que a
-- empresa entra no app, e "vendas/faturamento" continua vindo de public.sales.
--
-- Idempotente. Depende de sales_reps.sql (public.sales_reps, company_profiles.sold_by).

create or replace function public.sales_rep_my_companies()
returns table (
  id uuid,
  establishment_name text,
  responsible_name text,
  email text,
  phone text,
  neighborhood text,
  created_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select c.id,
         c.establishment_name,
         c.responsible_name,
         c.email,
         c.phone,
         c.neighborhood,
         c.created_at
  from public.company_profiles c
  join public.sales_reps r
    on upper(regexp_replace(coalesce(c.sold_by, ''), '[^a-zA-Z0-9]', '', 'g')) = upper(r.code)
  where r.user_id = auth.uid()
    and r.active
  order by c.created_at desc nulls last, c.establishment_name;
$$;

grant execute on function public.sales_rep_my_companies() to authenticated;
