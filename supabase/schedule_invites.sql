-- Link de convite de escala.
--
-- A empresa cria uma escala e recebe um link (usepont.com.br/convite/CODIGO).
-- Ela cola o link na lista de transmissão / grupo de WhatsApp. Quem abre o
-- link (mesmo sem conta no PONT) informa nome e celular e toca em "Confirmo"
-- ou "Não posso". A resposta cai no painel da escala.
--
--   * schedule_invites            uma linha por escala com link (dados públicos
--                                 do evento + código).
--   * schedule_invite_responses   uma linha por celular que respondeu.
--   * schedule_invite_public()    lê o evento pelo código (anônimo).
--   * schedule_invite_respond()   grava a resposta (anônimo), com nome, celular
--                                 e CPF obrigatórios (o CPF é validado aqui, não
--                                 só na tela), respeitando o
--                                 limite de vagas: passou do limite, vai para
--                                 a lista de espera e sobe sozinho se alguém
--                                 desistir.
--
-- Idempotente. Rode UMA vez no SQL Editor do Supabase (pode rodar de novo).
-- Depende de public.is_support_user() (close_coin_purchases.sql).

create table if not exists public.schedule_invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  schedule_id text not null,
  company_name text not null default '',
  title text not null,
  function_name text not null default '',
  quantity integer not null default 1 check (quantity > 0),
  shift_date date not null,
  starts_at text not null default '',
  ends_at text not null default '',
  place text not null default '',
  neighborhood text not null default '',
  notes text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, schedule_id)
);

create table if not exists public.schedule_invite_responses (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references public.schedule_invites(id) on delete cascade,
  phone_digits text not null,
  name text not null,
  cpf text,
  worker_user_id uuid references public.users(id) on delete set null,
  status text not null check (status in ('confirmado', 'recusado', 'lista_espera')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (invite_id, phone_digits)
);

create index if not exists schedule_invite_responses_invite_idx
  on public.schedule_invite_responses (invite_id, status);

-- Instalações anteriores não tinham o CPF.
alter table public.schedule_invite_responses add column if not exists cpf text;

alter table public.schedule_invites enable row level security;
alter table public.schedule_invite_responses enable row level security;

drop policy if exists "invites owner manage" on public.schedule_invites;
create policy "invites owner manage" on public.schedule_invites for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "invites support read" on public.schedule_invites;
create policy "invites support read" on public.schedule_invites for select
using (public.is_support_user());

drop policy if exists "invite responses owner manage" on public.schedule_invite_responses;
create policy "invite responses owner manage" on public.schedule_invite_responses for all
using (exists (
  select 1 from public.schedule_invites i
  where i.id = invite_id and i.owner_id = auth.uid()
))
with check (exists (
  select 1 from public.schedule_invites i
  where i.id = invite_id and i.owner_id = auth.uid()
));

drop policy if exists "invite responses support read" on public.schedule_invite_responses;
create policy "invite responses support read" on public.schedule_invite_responses for select
using (public.is_support_user());

grant select, insert, update, delete on public.schedule_invites to authenticated;
grant select, insert, update, delete on public.schedule_invite_responses to authenticated;

-- --- Leitura pública do evento (só o necessário para a página do convite) ---

create or replace function public.schedule_invite_public(p_code text)
returns table (
  title text,
  function_name text,
  quantity integer,
  shift_date date,
  starts_at text,
  ends_at text,
  place text,
  neighborhood text,
  notes text,
  company_name text,
  active boolean,
  confirmed integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    i.title, i.function_name, i.quantity, i.shift_date, i.starts_at, i.ends_at,
    i.place, i.neighborhood, i.notes, i.company_name, i.active,
    (select count(*)::integer from public.schedule_invite_responses r
      where r.invite_id = i.id and r.status = 'confirmado')
  from public.schedule_invites i
  where i.code = upper(trim(p_code))
  limit 1
$$;

-- --- CPF: confere os dígitos verificadores -----------------------------------

create or replace function public.schedule_invite_valid_cpf(p_cpf text)
returns boolean
language plpgsql
immutable
as $$
declare
  d text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  total integer;
  check_digit integer;
  i integer;
begin
  if length(d) <> 11 or d = repeat(substr(d, 1, 1), 11) then
    return false;
  end if;

  total := 0;
  for i in 1..9 loop
    total := total + substr(d, i, 1)::integer * (11 - i);
  end loop;
  check_digit := (total * 10) % 11;
  if check_digit = 10 then check_digit := 0; end if;
  if check_digit <> substr(d, 10, 1)::integer then
    return false;
  end if;

  total := 0;
  for i in 1..10 loop
    total := total + substr(d, i, 1)::integer * (12 - i);
  end loop;
  check_digit := (total * 10) % 11;
  if check_digit = 10 then check_digit := 0; end if;
  return check_digit = substr(d, 11, 1)::integer;
end;
$$;

-- --- Resposta do freelancer (anônimo) ---------------------------------------
-- A versão antiga (sem CPF) sai do ar: se ficasse, dava para responder sem CPF.

drop function if exists public.schedule_invite_respond(text, text, text, text);

create or replace function public.schedule_invite_respond(
  p_code text,
  p_name text,
  p_phone text,
  p_cpf text,
  p_answer text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.schedule_invites;
  digits text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  cpf_digits text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  clean_name text := left(trim(coalesce(p_name, '')), 80);
  new_status text;
  taken integer;
  known_user uuid;
  total integer;
begin
  select * into inv from public.schedule_invites where code = upper(trim(p_code));
  if not found or not inv.active then
    return jsonb_build_object('ok', false, 'error', 'invite_not_found');
  end if;
  if inv.shift_date < current_date - 1 then
    return jsonb_build_object('ok', false, 'error', 'closed');
  end if;
  if length(clean_name) < 3 then
    return jsonb_build_object('ok', false, 'error', 'name');
  end if;
  if length(digits) < 10 or length(digits) > 15 then
    return jsonb_build_object('ok', false, 'error', 'phone');
  end if;
  if not public.schedule_invite_valid_cpf(cpf_digits) then
    return jsonb_build_object('ok', false, 'error', 'cpf');
  end if;
  if p_answer not in ('confirmo', 'recuso') then
    return jsonb_build_object('ok', false, 'error', 'answer');
  end if;

  perform pg_advisory_xact_lock(hashtext(inv.id::text));

  -- O mesmo CPF não pode ocupar duas vagas usando celulares diferentes.
  if exists (
    select 1 from public.schedule_invite_responses
    where invite_id = inv.id and cpf = cpf_digits and phone_digits <> digits
  ) then
    return jsonb_build_object('ok', false, 'error', 'cpf_in_use');
  end if;

  select count(*) into total from public.schedule_invite_responses where invite_id = inv.id;
  if total >= 500 and not exists (
    select 1 from public.schedule_invite_responses
    where invite_id = inv.id and phone_digits = digits
  ) then
    return jsonb_build_object('ok', false, 'error', 'full');
  end if;

  -- Reconhece quem já tem conta pelo celular (DDD + 8 últimos dígitos, então
  -- com ou sem código do país e com ou sem o nono dígito).
  select u.id into known_user
  from public.users u
  where length(regexp_replace(coalesce(u.phone, ''), '\D', '', 'g')) >= 10
    and right(regexp_replace(coalesce(u.phone, ''), '\D', '', 'g'), 8) = right(digits, 8)
  limit 1;

  if p_answer = 'recuso' then
    new_status := 'recusado';
  else
    select count(*) into taken from public.schedule_invite_responses
    where invite_id = inv.id and status = 'confirmado' and phone_digits <> digits;
    new_status := case when taken < inv.quantity then 'confirmado' else 'lista_espera' end;
  end if;

  insert into public.schedule_invite_responses as r
    (invite_id, phone_digits, name, cpf, worker_user_id, status)
  values (inv.id, digits, clean_name, cpf_digits, known_user, new_status)
  on conflict (invite_id, phone_digits) do update
    set name = excluded.name,
        cpf = excluded.cpf,
        status = excluded.status,
        worker_user_id = coalesce(excluded.worker_user_id, r.worker_user_id),
        updated_at = now();

  -- Vaga liberada: sobe o primeiro da lista de espera.
  if p_answer = 'recuso' then
    update public.schedule_invite_responses
    set status = 'confirmado', updated_at = now()
    where id in (
      select id from public.schedule_invite_responses
      where invite_id = inv.id and status = 'lista_espera'
      order by created_at
      limit greatest(0, inv.quantity - (
        select count(*) from public.schedule_invite_responses
        where invite_id = inv.id and status = 'confirmado'
      ))
    );
  end if;

  return jsonb_build_object('ok', true, 'status', new_status);
end;
$$;

revoke all on function public.schedule_invite_public(text) from public;
revoke all on function public.schedule_invite_respond(text, text, text, text, text) from public;
grant execute on function public.schedule_invite_public(text) to anon, authenticated;
grant execute on function public.schedule_invite_respond(text, text, text, text, text) to anon, authenticated;
