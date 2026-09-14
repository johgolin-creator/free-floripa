-- Prospecção pessoal do vendedor: contatos que ele está trabalhando, ainda
-- sem conta no PONT. Separado de sales_rep_my_companies() (indicações que já
-- viraram conta) e de public.sales (vendas fechadas) — dá ao vendedor
-- controle de "quem falta contatar".
--
-- Idempotente. Depende de sales_reps.sql (public.sales_reps, public.is_support_user)
-- e de sales.sql (função public.set_updated_at, já criada lá).

create extension if not exists "pgcrypto";

create table if not exists public.sales_rep_leads (
  id uuid primary key default gen_random_uuid(),
  sales_rep_id uuid not null references public.sales_reps(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  notes text,
  status text not null default 'a_contatar'
    check (status in ('a_contatar', 'contatado', 'negociando', 'convertido', 'perdido')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sales_rep_leads_rep_idx on public.sales_rep_leads (sales_rep_id, status);

drop trigger if exists sales_rep_leads_updated_at on public.sales_rep_leads;
create trigger sales_rep_leads_updated_at before update on public.sales_rep_leads
for each row execute function public.set_updated_at();

alter table public.sales_rep_leads enable row level security;

drop policy if exists "sales rep leads support read" on public.sales_rep_leads;
create policy "sales rep leads support read" on public.sales_rep_leads for select
using (public.is_support_user());

drop policy if exists "sales rep leads self manage" on public.sales_rep_leads;
create policy "sales rep leads self manage" on public.sales_rep_leads for all
using (
  exists (select 1 from public.sales_reps r where r.id = sales_rep_leads.sales_rep_id and r.user_id = auth.uid())
)
with check (
  exists (select 1 from public.sales_reps r where r.id = sales_rep_leads.sales_rep_id and r.user_id = auth.uid())
);

grant select, insert, update, delete on public.sales_rep_leads to authenticated;
