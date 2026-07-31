-- Free Floripa - email notification queue
-- Run this file in Supabase SQL Editor before connecting an email sender.

create extension if not exists "pgcrypto";

create table if not exists public.email_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid references auth.users(id) on delete set null,
  recipient_email text not null,
  recipient_name text,
  subject text not null,
  preview text not null,
  body text not null,
  event_type text not null check (
    event_type in (
      'application_status',
      'urgent_job',
      'chat_message',
      'low_coins',
      'system'
    )
  ),
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'skipped')),
  attempts integer not null default 0 check (attempts >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

alter table public.email_notifications enable row level security;

drop policy if exists "users can read own email notifications" on public.email_notifications;
drop policy if exists "authenticated users can queue email notifications" on public.email_notifications;

create policy "users can read own email notifications"
on public.email_notifications
for select
using (auth.uid() = recipient_user_id);

create policy "authenticated users can queue email notifications"
on public.email_notifications
for insert
with check (auth.role() = 'authenticated');

create index if not exists idx_email_notifications_status_created
on public.email_notifications(status, created_at);

create index if not exists idx_email_notifications_recipient_created
on public.email_notifications(recipient_user_id, created_at desc);

create index if not exists idx_email_notifications_event_created
on public.email_notifications(event_type, created_at desc);
