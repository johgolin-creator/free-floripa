-- Vendedores com código próprio + atribuição automática da empresa pelo link
-- usepont.com.br/cadastro-empresa?vendedor=CODIGO
--
-- A atribuição em si continua guardada em company_profiles.sold_by (de
-- company_sold_by.sql): agora ela guarda o CÓDIGO do vendedor. O painel admin
-- resolve o código -> nome pela tabela sales_reps.
--
-- Depende de: company_sold_by.sql (coluna sold_by) e close_coin_purchases.sql
-- (public.is_support_user). Rode uma vez no SQL Editor.

create extension if not exists "pgcrypto";

-- garante a coluna usada para guardar o código do vendedor (idempotente;
-- também criada em company_sold_by.sql)
alter table public.company_profiles add column if not exists sold_by text;

create table if not exists public.sales_reps (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- código único, sem depender de caixa
create unique index if not exists sales_reps_code_key on public.sales_reps (upper(code));

drop trigger if exists sales_reps_updated_at on public.sales_reps;
create trigger sales_reps_updated_at before update on public.sales_reps
for each row execute function public.set_updated_at();

alter table public.sales_reps enable row level security;

-- Só o suporte lê a lista direto. A empresa nunca lê a tabela: a atribuição
-- passa pela função claim_company_sales_rep (security definer).
drop policy if exists "sales reps support read" on public.sales_reps;
create policy "sales reps support read" on public.sales_reps for select
using (public.is_support_user());

-- --- Admin: CRUD de vendedores ------------------------------------------

create or replace function public.admin_list_sales_reps()
returns setof public.sales_reps
language sql
security definer
stable
set search_path = public
as $$
  select *
  from public.sales_reps
  where public.is_support_user()
  order by active desc, name
$$;

create or replace function public.admin_upsert_sales_rep(
  rep_id uuid,
  rep_name text,
  rep_code text,
  rep_active boolean
)
returns public.sales_reps
language plpgsql
security definer
set search_path = public
as $$
declare
  rep public.sales_reps;
  norm_code text;
  norm_name text;
begin
  if not public.is_support_user() then
    raise exception 'Ação restrita ao suporte.';
  end if;

  norm_code := upper(regexp_replace(coalesce(rep_code, ''), '\s+', '', 'g'));
  norm_name := trim(coalesce(rep_name, ''));
  if norm_code = '' then raise exception 'Informe um código para o vendedor.'; end if;
  if norm_name = '' then raise exception 'Informe o nome do vendedor.'; end if;

  if rep_id is null then
    insert into public.sales_reps (name, code, active)
    values (norm_name, norm_code, coalesce(rep_active, true))
    returning * into rep;
  else
    update public.sales_reps
    set name = norm_name, code = norm_code, active = coalesce(rep_active, true)
    where id = rep_id
    returning * into rep;
    if not found then raise exception 'Vendedor não encontrado.'; end if;
  end if;

  return rep;
end;
$$;

create or replace function public.admin_delete_sales_rep(rep_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_support_user() then
    raise exception 'Ação restrita ao suporte.';
  end if;
  -- As empresas já atribuídas continuam com o código gravado em sold_by.
  delete from public.sales_reps where id = rep_id;
end;
$$;

-- Admin: define/limpa o vendedor de uma empresa (troca a de admin_set_company_sold_by
-- por esta, que valida contra a lista quando um código é passado).
create or replace function public.admin_set_company_sales_rep(
  target_company_id uuid,
  rep_code text
)
returns public.company_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  company public.company_profiles;
  norm_code text;
begin
  if not public.is_support_user() then
    raise exception 'Ação restrita ao suporte.';
  end if;

  norm_code := upper(regexp_replace(coalesce(rep_code, ''), '\s+', '', 'g'));
  if norm_code <> '' and not exists (
    select 1 from public.sales_reps where upper(code) = norm_code
  ) then
    raise exception 'Código de vendedor inexistente.';
  end if;

  update public.company_profiles
  set sold_by = nullif(norm_code, ''), updated_at = now()
  where id = target_company_id
  returning * into company;
  if not found then raise exception 'Empresa não encontrada.'; end if;

  return company;
end;
$$;

-- --- Empresa: atribuição automática pelo link (write-once) -------------

create or replace function public.claim_company_sales_rep(rep_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  norm_code text;
  canonical text;
  rows_updated integer;
begin
  norm_code := upper(regexp_replace(coalesce(rep_code, ''), '\s+', '', 'g'));
  if norm_code = '' then
    return jsonb_build_object('ok', false, 'applied', false);
  end if;

  select code into canonical
  from public.sales_reps
  where upper(code) = norm_code and active = true;

  if canonical is null then
    return jsonb_build_object('ok', false, 'applied', false);
  end if;

  -- só grava se a empresa ainda não tem atribuição
  update public.company_profiles
  set sold_by = canonical, updated_at = now()
  where user_id = auth.uid() and (sold_by is null or sold_by = '');
  get diagnostics rows_updated = row_count;

  return jsonb_build_object('ok', true, 'applied', rows_updated > 0, 'code', canonical);
end;
$$;

revoke all on function public.admin_list_sales_reps() from public;
revoke all on function public.admin_upsert_sales_rep(uuid, text, text, boolean) from public;
revoke all on function public.admin_delete_sales_rep(uuid) from public;
revoke all on function public.admin_set_company_sales_rep(uuid, text) from public;
revoke all on function public.claim_company_sales_rep(text) from public;

grant execute on function public.admin_list_sales_reps() to authenticated;
grant execute on function public.admin_upsert_sales_rep(uuid, text, text, boolean) to authenticated;
grant execute on function public.admin_delete_sales_rep(uuid) to authenticated;
grant execute on function public.admin_set_company_sales_rep(uuid, text) to authenticated;
grant execute on function public.claim_company_sales_rep(text) to authenticated;
