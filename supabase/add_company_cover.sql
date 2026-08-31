-- add_company_cover.sql  --  SCRIPT AVULSO (nao faz parte das migrations)
--
-- Adiciona a coluna da foto de capa (banner) do perfil da empresa.
-- A empresa passa a poder trocar essa imagem pelo app; quando vazia, o app
-- mostra um degrade da marca.
--
-- Rodar: Supabase Dashboard -> SQL Editor -> cola -> Run.

alter table public.company_profiles
  add column if not exists cover_url text;
