-- Free Floripa - convite de vaga com aceitar/recusar (2026-08-21)
-- PASSO 1 de 2. Execute este arquivo sozinho no SQL editor do Supabase e
-- clique em "Run" - depois disso, abra invite_flow_policies.sql e rode-o
-- como uma segunda execução separada.
--
-- Por quê em dois passos: o Postgres não deixa usar um valor novo de enum
-- (as duas linhas abaixo) na mesma transação em que ele foi criado - dá o
-- erro "unsafe use of new value ... New enum values must be committed
-- before they can be used." As políticas e o gatilho do passo 2 comparam
-- status com 'Convidada'/'Convite recusado', então só podem rodar depois
-- que este passo 1 já tiver sido commitado de verdade.
--
-- Execute depois de todos os outros arquivos em supabase/ já terem sido
-- aplicados (em especial security_hardening.sql).
--
-- Problema que isso resolve: quando uma empresa "convidava" um trabalhador
-- do banco de profissionais (inviteWorkerToJob em src/lib/store.tsx), a
-- candidatura já nascia com status 'Aprovada' na hora - o trabalhador nunca
-- tinha a chance de aceitar ou recusar, e a vaga contava como preenchida
-- sem confirmação de ninguém além da empresa.

alter type public.application_status add value if not exists 'Convidada';
alter type public.application_status add value if not exists 'Convite recusado';
