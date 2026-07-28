-- Free Floripa - banco compartilhado de profissionais
-- Execute este arquivo no SQL editor do Supabase se o schema inicial já foi criado.

alter table public.worker_profiles
add column if not exists display_name text not null default 'Profissional Free Floripa';

drop policy if exists "users insert own" on public.users;
create policy "users insert own" on public.users for insert with check (auth.uid() = id);

drop policy if exists "workers public limited read" on public.worker_profiles;
create policy "workers public limited read" on public.worker_profiles for select using (true);

drop policy if exists "worker function experience public read" on public.worker_function_experience;
create policy "worker function experience public read" on public.worker_function_experience for select using (true);
