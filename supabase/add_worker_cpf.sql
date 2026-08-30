-- Adds CPF to worker profiles.
--
-- The signup wizard now collects a CPF (validated digit check in
-- src/lib/validation.ts) and publishWorkerProfile
-- (src/lib/supabaseMarketplace.ts) upserts it here as 11 digits, no mask.
-- getWorkerProfileCompletion (src/lib/profileCompletion.ts) treats a
-- missing/invalid CPF as an incomplete profile, so pre-existing accounts
-- land on the "complete seu perfil" gate until they fill it in.
--
-- Run once in the Supabase SQL Editor (or via `supabase db push` if the
-- CLI is linked), after schema.sql / professional_bank.sql are applied.

alter table public.worker_profiles
  add column if not exists cpf text;

alter table public.worker_profiles
  drop constraint if exists worker_profiles_cpf_format;

alter table public.worker_profiles
  add constraint worker_profiles_cpf_format
  check (cpf is null or cpf ~ '^[0-9]{11}$');
