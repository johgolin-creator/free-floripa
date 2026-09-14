-- Permite que pessoa física (sem CNPJ) publique vagas como contratante.
--
-- Até aqui company_profiles.cnpj era obrigatório e único, então só empresa
-- com CNPJ conseguia se cadastrar. Agora a empresa/contratante informa CNPJ
-- OU CPF (nunca os dois vazios), e cada documento continua único quando
-- preenchido.
--
-- Idempotente: pode rodar de novo.

alter table public.company_profiles add column if not exists cpf text;
alter table public.company_profiles alter column cnpj drop not null;

do $$ begin
  alter table public.company_profiles
    add constraint company_profiles_document_required check (cnpj is not null or cpf is not null);
exception when duplicate_object then null; end $$;

-- A UNIQUE simples em cnpj vira índice parcial (só considera linhas
-- preenchidas), senão múltiplas empresas com cnpj null colidiriam.
alter table public.company_profiles drop constraint if exists company_profiles_cnpj_key;
create unique index if not exists company_profiles_cnpj_key on public.company_profiles (cnpj) where cnpj is not null;
create unique index if not exists company_profiles_cpf_key on public.company_profiles (cpf) where cpf is not null;
