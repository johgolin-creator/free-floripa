-- Aviso geral com imagem (flyer) e botão "Comparecerei" (Issue #25).
-- Idempotente: pode rodar mais de uma vez sem quebrar.

-- 1. Avisos gerais criados pelo admin/moderador.
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  image_url text,
  rsvp_enabled boolean not null default false,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.announcements enable row level security;

drop policy if exists "announcements read authenticated" on public.announcements;
create policy "announcements read authenticated"
on public.announcements for select
to authenticated
using (true);

drop policy if exists "announcements support insert" on public.announcements;
create policy "announcements support insert"
on public.announcements for insert
to authenticated
with check (public.is_support_user());

drop policy if exists "announcements support delete" on public.announcements;
create policy "announcements support delete"
on public.announcements for delete
to authenticated
using (public.is_support_user());

-- 2. Respostas "Comparecerei".
create table if not exists public.announcement_responses (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

alter table public.announcement_responses enable row level security;

drop policy if exists "announcement responses read own or support" on public.announcement_responses;
create policy "announcement responses read own or support"
on public.announcement_responses for select
to authenticated
using (auth.uid() = user_id or public.is_support_user());

drop policy if exists "announcement responses insert own" on public.announcement_responses;
create policy "announcement responses insert own"
on public.announcement_responses for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.announcements a
    where a.id = announcement_id and a.rsvp_enabled
  )
);

drop policy if exists "announcement responses delete own" on public.announcement_responses;
create policy "announcement responses delete own"
on public.announcement_responses for delete
to authenticated
using (auth.uid() = user_id);

-- 3. Notificação aponta para o aviso e carrega a imagem.
alter table public.notifications add column if not exists image_url text;
alter table public.notifications
  add column if not exists announcement_id uuid references public.announcements(id) on delete set null;

-- 4. Lista de confirmados para o admin (nome, telefone, e-mail).
create or replace function public.admin_list_announcement_responses(target_announcement_id uuid)
returns table (
  user_id uuid,
  display_name text,
  phone text,
  email text,
  responded_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select r.user_id, wp.display_name, u.phone, u.email, r.created_at
  from public.announcement_responses r
  join public.users u on u.id = r.user_id
  left join public.worker_profiles wp on wp.user_id = r.user_id
  where r.announcement_id = target_announcement_id
    and public.is_support_user()
  order by r.created_at;
$$;

revoke all on function public.admin_list_announcement_responses(uuid) from public;
grant execute on function public.admin_list_announcement_responses(uuid) to authenticated;
