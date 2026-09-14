-- Renumera os vendedores que ainda têm o código antigo (derivado do e-mail,
-- tipo LEONARDOCOMERCIALPONTAPP) para o padrão VEN### sequencial. Quem já
-- está no padrão (VEN001, VEN002...) não muda. Atualiza também
-- company_profiles.sold_by e sales.sales_rep_code para o novo código, para
-- não perder a atribuição de clientes/vendas já existente.
--
-- ATENÇÃO: qualquer link de indicação já compartilhado com o código antigo
-- (?vendedor=LEONARDOCOMERCIALPONTAPP) para de funcionar depois desta
-- migração — o vendedor precisa copiar o link novo (botão "Copiar link" no
-- painel dele) e reenviar para quem for cadastrar depois disso.
--
-- Rode uma vez no SQL Editor do Supabase. Pode rodar de novo sem problema
-- (não faz nada se já estiver tudo no padrão VEN###).

alter table public.company_profiles disable trigger trg_enforce_company_sold_by;

do $$
declare
  rep record;
  new_code text;
begin
  for rep in
    select id, code
    from public.sales_reps
    where code !~ '^VEN[0-9]{3}$'
    order by created_at
  loop
    new_code := public.next_sales_rep_code();

    update public.company_profiles
    set sold_by = new_code, updated_at = now()
    where upper(coalesce(sold_by, '')) = upper(rep.code);

    update public.sales
    set sales_rep_code = new_code, updated_at = now()
    where upper(coalesce(sales_rep_code, '')) = upper(rep.code);

    update public.sales_reps
    set code = new_code, updated_at = now()
    where id = rep.id;

    raise notice 'Vendedor % renomeado de % para %', rep.id, rep.code, new_code;
  end loop;
end $$;

alter table public.company_profiles enable trigger trg_enforce_company_sold_by;

-- Confira o resultado:
select name, code, active, created_at
from public.sales_reps
order by code;
