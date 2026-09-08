-- Dá ao painel de administração o contato completo dos trabalhadores.
--
-- Contexto: a lista de profissionais que o app carrega
-- (loadPublicWorkerProfiles em src/lib/supabaseMarketplace.ts) é a projeção
-- PÚBLICA — CPF, telefone e e-mail vêm vazios de propósito, para uma empresa
-- não ver dado pessoal de quem ainda não contratou. O admin PRECISA desses
-- dados, e telefone/e-mail ficam em public.users, cuja RLS só deixa o dono
-- ler a própria linha.
--
-- Esta função roda como security definer (ignora RLS) mas só devolve linhas
-- quando quem chama é admin/moderador (public.is_support_user(), definida em
-- close_coin_purchases.sql). O cliente cruza esses dados por worker_profiles.id
-- na visão de moderação (src/lib/supabaseModeration.ts).
--
-- Rode uma vez no SQL Editor do Supabase, depois de add_worker_cpf.sql e
-- close_coin_purchases.sql.

create or replace function public.admin_list_worker_contacts()
returns table (
  id uuid,
  user_id uuid,
  cpf text,
  phone text,
  email text
)
language sql
security definer
stable
set search_path = public
as $$
  select wp.id, wp.user_id, wp.cpf, u.phone, u.email
  from public.worker_profiles wp
  join public.users u on u.id = wp.user_id
  where public.is_support_user()
$$;

revoke all on function public.admin_list_worker_contacts() from public;
grant execute on function public.admin_list_worker_contacts() to authenticated;
