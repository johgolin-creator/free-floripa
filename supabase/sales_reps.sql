-- Vendedores + atribuição da empresa ao vendedor pelo link de indicação.
--
-- Modelo:
--   * Um VENDEDOR é qualquer conta cujo e-mail contém "pontapp"
--     (leonardo.pontapp@gmail.com, maria@pontapp.com.br, ...). A tabela
--     public.sales_reps é preenchida automaticamente por um trigger a partir
--     de public.users — não precisa cadastrar ninguém na mão. (Ainda é
--     possível criar um vendedor manual pela função admin_upsert_sales_rep,
--     para exceções.)
--   * O CÓDIGO do vendedor é derivado do e-mail (parte antes do @, só letras
--     e números, maiúsculo). É o que vai no link ?vendedor=CODIGO.
--   * A atribuição fica em company_profiles.sold_by, guardando o código. Ela
--     é gravada no cadastro da empresa (via metadata do signup) e um trigger
--     valida/congela o valor: só um código de vendedor ativo entra, e depois
--     de definido só o suporte troca.
--
-- Idempotente: pode rodar de novo. Depende de company_sold_by.sql (coluna
-- sold_by) e close_coin_purchases.sql (public.is_support_user).

create extension if not exists "pgcrypto";

alter table public.company_profiles add column if not exists sold_by text;

-- --- Tabela de vendedores -------------------------------------------------

create table if not exists public.sales_reps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  code text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sales_reps add column if not exists email text;
alter table public.sales_reps add column if not exists phone text;
alter table public.sales_reps add column if not exists cpf text;
alter table public.sales_reps add column if not exists notes text;

-- Códigos sequenciais VEN001, VEN002, ...
create sequence if not exists public.sales_rep_code_seq;

create or replace function public.next_sales_rep_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text;
begin
  loop
    candidate := 'VEN' || lpad(nextval('public.sales_rep_code_seq')::text, 3, '0');
    exit when not exists (select 1 from public.sales_reps where upper(code) = candidate);
  end loop;
  return candidate;
end;
$$;

alter table public.sales_reps add column if not exists user_id uuid;
do $$ begin
  alter table public.sales_reps
    add constraint sales_reps_user_id_fkey foreign key (user_id)
    references auth.users(id) on delete cascade;
exception when duplicate_object then null; end $$;
-- unique não-parcial em user_id (UNIQUE aceita vários NULL, então os
-- vendedores manuais convivem). Necessário para o `on conflict (user_id)`.
do $$ begin
  alter table public.sales_reps add constraint sales_reps_user_id_uniq unique (user_id);
exception when duplicate_object then null; end $$;
drop index if exists sales_reps_user_id_key;
create unique index if not exists sales_reps_code_key on public.sales_reps (upper(code));

drop trigger if exists sales_reps_updated_at on public.sales_reps;
create trigger sales_reps_updated_at before update on public.sales_reps
for each row execute function public.set_updated_at();

alter table public.sales_reps enable row level security;

drop policy if exists "sales reps support read" on public.sales_reps;
create policy "sales reps support read" on public.sales_reps for select
using (public.is_support_user());

-- o próprio vendedor lê a sua linha (para a Área do Vendedor)
drop policy if exists "sales reps self read" on public.sales_reps;
create policy "sales reps self read" on public.sales_reps for select
using (user_id = auth.uid());

-- --- Derivação do código a partir do e-mail -----------------------------

create or replace function public.sales_rep_slug(email text)
returns text
language sql
immutable
as $$
  select upper(regexp_replace(split_part(coalesce(email, ''), '@', 1), '[^a-zA-Z0-9]', '', 'g'))
$$;

create or replace function public.is_sales_rep_email(email text)
returns boolean
language sql
immutable
as $$
  select coalesce(position('pontapp' in lower(coalesce(email, ''))) > 0, false)
$$;

-- --- Sincronização automática users -> sales_reps ----------------------

create or replace function public.sync_sales_rep_from_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  slug text;
  the_name text;
  orphan_id uuid;
begin
  if not public.is_sales_rep_email(new.email) then
    -- deixou de ter e-mail de vendedor: desativa (não apaga, para não
    -- perder atribuições antigas).
    update public.sales_reps set active = false, updated_at = now() where user_id = new.id;
    return new;
  end if;

  slug := public.sales_rep_slug(new.email);
  the_name := coalesce(nullif(trim(new.full_name), ''), new.email);

  -- já tem linha desse usuário? só atualiza nome/e-mail/ativo.
  if exists (select 1 from public.sales_reps where user_id = new.id) then
    update public.sales_reps
    set name = coalesce(nullif(trim(the_name), ''), name),
        email = coalesce(email, new.email),
        active = true, updated_at = now()
    where user_id = new.id;
    return new;
  end if;

  -- reaproveita um vendedor "avulso" (sem user_id) com mesmo nome ou código,
  -- em vez de criar um duplicado.
  select id into orphan_id from public.sales_reps
  where user_id is null
    and (lower(trim(name)) = lower(trim(the_name)) or (slug <> '' and upper(code) = slug))
  limit 1;

  if orphan_id is not null then
    update public.sales_reps
    set user_id = new.id, name = the_name, email = coalesce(email, new.email),
        active = true, updated_at = now()
    where id = orphan_id;
    return new;
  end if;

  insert into public.sales_reps (user_id, name, email, code, active)
  values (new.id, the_name, new.email, public.next_sales_rep_code(), true);
  return new;
end;
$$;

drop trigger if exists trg_sync_sales_rep on public.users;
create trigger trg_sync_sales_rep
after insert or update of email, full_name on public.users
for each row execute function public.sync_sales_rep_from_user();

-- backfill das contas com e-mail de vendedor que ainda não têm linha
do $$
declare
  u record;
  orphan_id uuid;
begin
  for u in
    select id, full_name, email from public.users where public.is_sales_rep_email(email)
  loop
    if exists (select 1 from public.sales_reps where user_id = u.id) then
      continue;
    end if;
    select id into orphan_id from public.sales_reps
    where user_id is null and lower(trim(name)) = lower(trim(coalesce(u.full_name, u.email)))
    limit 1;
    if orphan_id is not null then
      update public.sales_reps
      set user_id = u.id, email = coalesce(email, u.email), active = true, updated_at = now()
      where id = orphan_id;
    else
      insert into public.sales_reps (user_id, name, email, code, active)
      values (u.id, coalesce(nullif(trim(u.full_name), ''), u.email), u.email, public.next_sales_rep_code(), true);
    end if;
  end loop;
end $$;

-- --- Validação / congelamento de company_profiles.sold_by --------------

create or replace function public.enforce_company_sold_by()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  norm text;
begin
  norm := upper(regexp_replace(coalesce(new.sold_by, ''), '[^a-zA-Z0-9]', '', 'g'));
  norm := nullif(norm, '');

  if tg_op = 'INSERT' then
    -- só entra um código de vendedor ativo
    if norm is not null and not exists (
      select 1 from public.sales_reps where upper(code) = norm and active
    ) then
      norm := null;
    end if;
    new.sold_by := norm;
    return new;
  end if;

  -- UPDATE: se o valor não mudou, não mexe (preserva dados antigos)
  if norm is not distinct from old.sold_by then
    new.sold_by := old.sold_by;
    return new;
  end if;

  if public.is_support_user() then
    -- suporte pode trocar/limpar, mas se informar um código ele tem que existir
    if norm is not null and not exists (select 1 from public.sales_reps where upper(code) = norm) then
      raise exception 'Código de vendedor inexistente: %', norm;
    end if;
    new.sold_by := norm;
    return new;
  end if;

  -- dono da empresa: só pode DEFINIR quando ainda está vazio, nunca trocar
  if old.sold_by is not null and old.sold_by <> '' then
    new.sold_by := old.sold_by;
    return new;
  end if;
  if norm is not null and not exists (
    select 1 from public.sales_reps where upper(code) = norm and active
  ) then
    norm := null;
  end if;
  new.sold_by := norm;
  return new;
end;
$$;

drop trigger if exists trg_enforce_company_sold_by on public.company_profiles;
create trigger trg_enforce_company_sold_by
before insert or update of sold_by on public.company_profiles
for each row execute function public.enforce_company_sold_by();

-- --- Admin: consultar / ajustar --------------------------------------

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

  norm_code := upper(regexp_replace(coalesce(rep_code, ''), '[^a-zA-Z0-9]', '', 'g'));
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

-- Cria um vendedor com código sequencial VEN###, gerado automaticamente.
create or replace function public.admin_create_sales_rep(
  p_name text,
  p_email text,
  p_phone text,
  p_cpf text,
  p_notes text,
  p_active boolean
)
returns public.sales_reps
language plpgsql
security definer
set search_path = public
as $$
declare
  rep public.sales_reps;
begin
  if not public.is_support_user() then
    raise exception 'Ação restrita ao suporte.';
  end if;
  if trim(coalesce(p_name, '')) = '' then
    raise exception 'Informe o nome do vendedor.';
  end if;

  insert into public.sales_reps (name, email, phone, cpf, notes, code, active)
  values (
    trim(p_name),
    nullif(trim(coalesce(p_email, '')), ''),
    nullif(trim(coalesce(p_phone, '')), ''),
    nullif(regexp_replace(coalesce(p_cpf, ''), '[^0-9]', '', 'g'), ''),
    nullif(trim(coalesce(p_notes, '')), ''),
    public.next_sales_rep_code(),
    coalesce(p_active, true)
  )
  returning * into rep;
  return rep;
end;
$$;

create or replace function public.admin_update_sales_rep(
  rep_id uuid,
  p_name text,
  p_email text,
  p_phone text,
  p_cpf text,
  p_notes text,
  p_active boolean
)
returns public.sales_reps
language plpgsql
security definer
set search_path = public
as $$
declare
  rep public.sales_reps;
begin
  if not public.is_support_user() then
    raise exception 'Ação restrita ao suporte.';
  end if;

  update public.sales_reps set
    name = coalesce(nullif(trim(p_name), ''), name),
    email = nullif(trim(coalesce(p_email, '')), ''),
    phone = nullif(trim(coalesce(p_phone, '')), ''),
    cpf = nullif(regexp_replace(coalesce(p_cpf, ''), '[^0-9]', '', 'g'), ''),
    notes = nullif(trim(coalesce(p_notes, '')), ''),
    active = coalesce(p_active, active),
    updated_at = now()
  where id = rep_id
  returning * into rep;
  if not found then raise exception 'Vendedor não encontrado.'; end if;
  return rep;
end;
$$;

-- Lookup público (usado no cadastro para mostrar "Vendedor responsável: Nome").
-- Só devolve o nome, e só se o código existir e estiver ativo.
create or replace function public.sales_rep_public(p_code text)
returns table (name text)
language sql
security definer
stable
set search_path = public
as $$
  select name from public.sales_reps
  where upper(code) = upper(regexp_replace(coalesce(p_code, ''), '[^a-zA-Z0-9]', '', 'g'))
    and active
  limit 1
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
  delete from public.sales_reps where id = rep_id;
end;
$$;

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

  norm_code := upper(regexp_replace(coalesce(rep_code, ''), '[^a-zA-Z0-9]', '', 'g'));
  if norm_code <> '' and not exists (select 1 from public.sales_reps where upper(code) = norm_code) then
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

-- Empresa (self-service, write-once): fallback quando o código não veio pelo
-- metadata do cadastro (ex.: link aberto com a sessão já aberta).
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
  norm_code := upper(regexp_replace(coalesce(rep_code, ''), '[^a-zA-Z0-9]', '', 'g'));
  if norm_code = '' then
    return jsonb_build_object('ok', false, 'applied', false);
  end if;

  select code into canonical
  from public.sales_reps
  where upper(code) = norm_code and active = true;
  if canonical is null then
    return jsonb_build_object('ok', false, 'applied', false);
  end if;

  update public.company_profiles
  set sold_by = canonical, updated_at = now()
  where user_id = auth.uid() and (sold_by is null or sold_by = '');
  get diagnostics rows_updated = row_count;

  return jsonb_build_object('ok', true, 'applied', rows_updated > 0, 'code', canonical);
end;
$$;

revoke all on function public.admin_list_sales_reps() from public;
revoke all on function public.admin_upsert_sales_rep(uuid, text, text, boolean) from public;
revoke all on function public.admin_create_sales_rep(text, text, text, text, text, boolean) from public;
revoke all on function public.admin_update_sales_rep(uuid, text, text, text, text, text, boolean) from public;
revoke all on function public.admin_delete_sales_rep(uuid) from public;
revoke all on function public.admin_set_company_sales_rep(uuid, text) from public;
revoke all on function public.claim_company_sales_rep(text) from public;

grant execute on function public.admin_list_sales_reps() to authenticated;
grant execute on function public.admin_upsert_sales_rep(uuid, text, text, boolean) to authenticated;
grant execute on function public.admin_create_sales_rep(text, text, text, text, text, boolean) to authenticated;
grant execute on function public.admin_update_sales_rep(uuid, text, text, text, text, text, boolean) to authenticated;
grant execute on function public.admin_delete_sales_rep(uuid) to authenticated;
grant execute on function public.admin_set_company_sales_rep(uuid, text) to authenticated;
grant execute on function public.claim_company_sales_rep(text) to authenticated;
grant execute on function public.sales_rep_public(text) to anon, authenticated;
