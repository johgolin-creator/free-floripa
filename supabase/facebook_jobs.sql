-- Publica vagas captadas do Facebook como vagas de verdade no PONT
-- (candidatura normal), com aprovação automática pro primeiro candidato e
-- liberação do contato de quem publicou o post original.
--
-- Contexto: facebook_leads.sql (rodado antes) só guarda um LEAD de vendas
-- (telefone/e-mail extraídos de um post, pra time comercial contatar depois).
-- Isto aqui é diferente: o admin cola o post em AdminLeadsPage e o app já
-- publica a vaga na hora (ver lib/facebookJobParsing.ts, lib/facebookJobs.ts
-- e createFacebookJob em lib/store.tsx).
--
-- Toda vaga no banco (public.jobs) exige uma public.company_profiles dona
-- (company_id not null), e toda company_profiles exigia um user_id (dono
-- logado) not null. Como uma vaga do Facebook não tem uma empresa real
-- cadastrada no PONT, este arquivo:
--   1. permite company_profiles.user_id nulo, só pra essa 1 linha-vitrine
--      compartilhada (id fixo, ver FACEBOOK_JOBS_COMPANY_ID em
--      lib/facebookJobs.ts) que reúne todas as vagas captadas;
--   2. insere essa linha-vitrine uma vez;
--   3. libera admin/moderador para inserir/atualizar linhas em public.jobs
--      mesmo sem serem "donos" de uma company_profiles (hoje só o dono podia)
--      - só assim dá pra publicar a vaga na hora, sem logar como a vitrine;
--   4. adiciona colunas novas em public.jobs (source, external_contact_*)
--      pra guardar de onde veio a vaga e o contato de quem publicou o post -
--      não o da empresa-vitrine, que não é uma pessoa real pra falar;
--   5. cria um trigger que aprova automaticamente a 1ª candidatura (até a
--      quantidade de vagas) numa vaga com source = 'facebook', na mesma
--      transação do insert - o worker nunca fica esperando uma empresa
--      aprovar manualmente algo que não existe.
--
-- Depende de marketplace_jobs.sql e moderator_role.sql (usa o papel
-- 'moderador') já terem rodado. Rode este arquivo inteiro de uma vez no SQL
-- Editor do Supabase.

-- 1. company_profiles.user_id pode ser nulo (só a linha-vitrine usa isso).
alter table public.company_profiles alter column user_id drop not null;

-- 2. Linha-vitrine fixa que reúne as vagas captadas do Facebook.
insert into public.company_profiles (
  id, user_id, establishment_name, responsible_name, cnpj, cpf, phone, email,
  category, address, neighborhood, description, logo_url, rating
)
values (
  '00000000-0000-4000-8000-000000000001',
  null,
  'Oportunidades encontradas no Facebook',
  'Equipe PONT',
  '00000000000001',
  null,
  '',
  'contato@pont.app',
  'Outro',
  'Florianópolis',
  'Centro',
  'Vagas vistas em grupos do Facebook e organizadas pela equipe PONT. O contato de quem publicou o anúncio original é liberado assim que a candidatura é aprovada.',
  'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=500&q=80',
  5
)
on conflict (id) do nothing;

-- 3. Só admin (não moderador comum) pode inserir/atualizar vagas sem ser dono
--    da company_profiles (necessário pra publicar sob a linha-vitrine acima).
--    Restrito a admin de propósito: publicar vaga sob a vitrine, visível pra
--    todo trabalhador sem nenhuma empresa real por trás, é uma decisão mais
--    sensível que moderação comum.
--
--    "admin" aqui espelha exatamente src/lib/auth.tsx (isAdmin): role='admin'
--    em public.users, OU o e-mail fixo em DEFAULT_ADMIN_EMAILS (hoje
--    'johgolin.ceo@gmail.com' - dono da conta, cujo public.users.role hoje é
--    'moderador', não 'admin'). Se VITE_ADMIN_EMAILS mudar no futuro, ajuste
--    a lista de e-mails abaixo junto.
drop policy if exists "companies insert jobs" on public.jobs;
create policy "companies insert jobs" on public.jobs for insert with check (
  exists (select 1 from public.company_profiles c where c.id = company_id and c.user_id = auth.uid())
  or exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and (u.role = 'admin' or lower(u.email) = 'johgolin.ceo@gmail.com')
  )
);

drop policy if exists "companies update own jobs" on public.jobs;
create policy "companies update own jobs" on public.jobs for update using (
  exists (select 1 from public.company_profiles c where c.id = company_id and c.user_id = auth.uid())
  or exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and (u.role = 'admin' or lower(u.email) = 'johgolin.ceo@gmail.com')
  )
);

-- 4. De onde veio a vaga e o contato de quem publicou o post (não o da
--    empresa-vitrine, que ninguém atende).
alter table public.jobs add column if not exists source text;
alter table public.jobs add column if not exists external_contact_name text;
alter table public.jobs add column if not exists external_contact_phone text;
alter table public.jobs add column if not exists external_contact_email text;

-- 5. Aprova automaticamente a 1ª candidatura (até a quantidade de vagas) numa
--    vaga captada do Facebook, na mesma transação do insert/update. Roda
--    depois do trg_charge_coin_for_application (coin_enforcement.sql) -
--    ordem alfabética garante que a moeda já foi cobrada com status
--    'Enviada' antes deste trigger mudar pra 'Aprovada'.
create or replace function public.auto_approve_facebook_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  job_source text;
  job_quantity integer;
  approved_count integer;
begin
  if new.status <> 'Enviada' then
    return new;
  end if;

  select j.source, j.quantity into job_source, job_quantity
  from public.jobs j
  where j.id = new.job_id;

  if job_source is distinct from 'facebook' then
    return new;
  end if;

  select count(*) into approved_count
  from public.applications
  where job_id = new.job_id
    and status in ('Aprovada', 'Trabalho concluído')
    and id <> new.id;

  if approved_count < coalesce(job_quantity, 1) then
    new.status := 'Aprovada';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_facebook_job_auto_approve on public.applications;
create trigger trg_facebook_job_auto_approve
before insert or update on public.applications
for each row execute function public.auto_approve_facebook_application();
