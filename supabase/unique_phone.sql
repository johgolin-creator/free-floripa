-- One phone number per account.
--
-- Email is already unique (Supabase Auth + public.users.email unique). This
-- gives the phone the same guarantee:
--   * the signup wizard calls public.phone_in_use() before creating the
--     account (src/lib/signupChecks.ts), and the profile edit forms call it
--     before saving a changed number;
--   * a functional unique index on public.users is the backstop for any
--     path that skips the check (races, direct REST).
--
-- phone_in_use() also looks at auth.users.raw_user_meta_data so a phone that
-- belongs to a signup that has not confirmed its e-mail yet still counts.
--
-- Run once in the Supabase SQL Editor. If the index creation fails there are
-- already duplicate phones - the commented SELECT finds them; fix by hand
-- (or blank the phone on the older row) and re-run just the create index.

create or replace function public.normalize_phone(raw text)
returns text
language sql
immutable
as $$
  select regexp_replace(coalesce(raw, ''), '\D', '', 'g');
$$;

create or replace function public.phone_in_use(phone_digits text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.normalize_phone(phone_digits) <> ''
    and (
      exists (
        select 1 from public.users
        where public.normalize_phone(phone) = public.normalize_phone(phone_digits)
          and (auth.uid() is null or id <> auth.uid())
      )
      or exists (
        select 1 from auth.users
        where public.normalize_phone(raw_user_meta_data ->> 'phone') = public.normalize_phone(phone_digits)
          and (auth.uid() is null or id <> auth.uid())
      )
    );
$$;

grant execute on function public.phone_in_use(text) to anon, authenticated;

-- Diagnostic (run first if the index below fails):
--   select public.normalize_phone(phone) as phone, count(*), array_agg(email)
--   from public.users
--   where public.normalize_phone(phone) <> ''
--   group by 1 having count(*) > 1;

create unique index if not exists users_phone_unique
  on public.users (public.normalize_phone(phone))
  where public.normalize_phone(phone) <> '';
