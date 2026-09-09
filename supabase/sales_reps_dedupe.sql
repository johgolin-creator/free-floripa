-- Limpeza única: junta os vendedores "avulsos" (linhas sem user_id, criadas
-- na mão antes) com os automáticos (contas com pontapp no e-mail) e remove os
-- duplicados. As empresas atribuídas ao código antigo passam para o código do
-- vendedor automático.
--
-- Rode UMA vez no SQL Editor, depois de sales_reps.sql. Pode rodar de novo
-- sem problema (não faz nada se já não houver duplicados).

-- O trigger de company_profiles congela sold_by; desliga durante a migração.
alter table public.company_profiles disable trigger trg_enforce_company_sold_by;

do $$
declare
  m record;
  a record;
begin
  for m in select * from public.sales_reps where user_id is null loop
    -- vendedor automático "equivalente": mesmo nome, ou mesmo código, ou o
    -- código automático começa com o código avulso (LEONARDO -> LEONARDOPONTAPP).
    select * into a
    from public.sales_reps
    where user_id is not null
      and id <> m.id
      and (
        lower(trim(name)) = lower(trim(m.name))
        or upper(code) = upper(m.code)
        or upper(code) like upper(m.code) || '%'
      )
    order by (lower(trim(name)) = lower(trim(m.name))) desc
    limit 1;

    if found then
      update public.company_profiles
      set sold_by = a.code, updated_at = now()
      where upper(coalesce(sold_by, '')) = upper(m.code);

      delete from public.sales_reps where id = m.id;
      raise notice 'Vendedor avulso "%" (%%) juntado em "%" (%%)', m.name, m.code, a.name, a.code;
    end if;
  end loop;
end $$;

alter table public.company_profiles enable trigger trg_enforce_company_sold_by;

-- Confira o resultado:
select id, user_id is not null as automatico, name, code, active
from public.sales_reps
order by name, automatico desc;
