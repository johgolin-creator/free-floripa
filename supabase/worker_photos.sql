-- Fotos extras do perfil do trabalhador (além da foto principal em
-- worker_profiles.avatar_url). Mesma lógica de worker_function_experience:
-- publishWorkerProfile apaga tudo e reinsere na ordem atual a cada save.
--
-- Idempotente. Rode no SQL Editor do Supabase.

create extension if not exists "pgcrypto";

create table if not exists public.worker_photos (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.worker_profiles(id) on delete cascade,
  url text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists worker_photos_worker_id_idx on public.worker_photos (worker_id, position);

alter table public.worker_photos enable row level security;

drop policy if exists "worker photos public read" on public.worker_photos;
create policy "worker photos public read" on public.worker_photos for select using (true);

drop policy if exists "workers manage own photos" on public.worker_photos;
create policy "workers manage own photos" on public.worker_photos for all using (
  exists (select 1 from public.worker_profiles w where w.id = worker_id and w.user_id = auth.uid())
) with check (
  exists (select 1 from public.worker_profiles w where w.id = worker_id and w.user_id = auth.uid())
);
