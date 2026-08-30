-- reset_accounts.sql  --  SCRIPT AVULSO (nao faz parte das migrations, nao roda no CI)
--
-- O que faz:
--   * Remove TODAS as contas (trabalhadores e empresas) e tudo que esta
--     amarrado a elas -- perfis, vagas, candidaturas, escalas, avaliacoes,
--     carteiras e historico de moedas, favoritos, notificacoes -- por
--     cascata a partir de auth.users.
--   * Mantem apenas a(s) conta(s) de administrador listada(s) em
--     `admin_emails` abaixo.
--   * Limpa public.app_state_snapshots (cache de estado do cliente; todas as
--     linhas ficam orfas depois do delete e o app as reconstroi sozinho).
--
-- As "vagas fake" (job-1..job-6) so existem no codigo como fixture de modo
-- offline -- os ids nao sao UUID, entao nunca chegam na tabela public.jobs.
-- Qualquer vaga de teste real criada por uma conta removida sai junto na
-- cascata abaixo.
--
-- COMO RODAR:
--   1. Ajuste `admin_emails` com o e-mail exato do admin (o mesmo que esta
--      em VITE_ADMIN_EMAILS no Render / no painel).
--   2. Supabase Dashboard -> Database -> Backups: tire um snapshot.
--   3. Supabase Dashboard -> SQL Editor -> cole este arquivo -> Run.
--      (alternativa por CLI: supabase db execute --file supabase/reset_accounts.sql)
--
-- IRREVERSIVEL. So rode com o backup feito.

begin;

do $$
declare
  admin_emails text[] := array['johgolin.ceo@gmail.com'];  -- conta admin mantida
  kept int;
  removed int;
begin
  admin_emails := array(select lower(trim(e)) from unnest(admin_emails) as e);

  select count(*) into kept
  from auth.users
  where lower(email) = any (admin_emails);

  if kept = 0 then
    raise exception
      'Nenhuma conta em auth.users bate com % -- abortado para nao apagar o admin.',
      admin_emails;
  end if;

  delete from auth.users
  where email is null
     or lower(email) <> all (admin_emails);
  get diagnostics removed = row_count;

  raise notice 'Contas mantidas: %  |  contas removidas: %', kept, removed;
end $$;

-- Cache de estado do cliente (blob por usuario). Sem dono depois do delete.
truncate table public.app_state_snapshots;

-- Opcional: zerar relatos de bug e fila de e-mail deixados pelos testes.
-- delete from public.bug_reports;
-- delete from public.email_notifications;

-- Opcional: leads de prospeccao (dados do admin, nao de contas de usuario).
-- delete from public.company_leads;

commit;

-- Observacao: arquivos de avatar/logo enviados pelas contas removidas
-- continuam nos buckets de Storage (avatars). Sao inofensivos; se quiser
-- limpar, faca pelo painel de Storage ou por um script separado.
