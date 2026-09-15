-- Inscrições de push notification do navegador (Web Push). Cada linha é um
-- dispositivo/navegador que a pessoa ativou notificações. Uma conta pode ter
-- mais de uma (celular + computador, por exemplo).
--
-- Lido pela Edge Function send-job-push (supabase/functions/send-job-push),
-- disparada por um Database Webhook em public.jobs (INSERT e UPDATE),
-- configurado manualmente no Supabase Dashboard.
--
-- Idempotente. Rode no SQL Editor do Supabase.

create extension if not exists "pgcrypto";

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists push_subscriptions_endpoint_key on public.push_subscriptions (endpoint);
create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "users manage own push subscriptions" on public.push_subscriptions;
create policy "users manage own push subscriptions" on public.push_subscriptions for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- A Edge Function usa a service role (contorna RLS) para ler todas as
-- inscrições dos trabalhadores na hora de mandar o push - não precisa de
-- policy extra para isso.
