-- Permite a administração excluir uma vaga (e o que depende dela).
--
-- public.jobs não tem policy de DELETE (nem o dono da empresa apaga vaga pela
-- API), então isto passa por uma função security-definer restrita ao suporte.
--
-- Depende de close_coin_purchases.sql (public.is_support_user). Rode uma vez
-- no SQL Editor.

create or replace function public.admin_delete_job(target_job_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_support_user() then
    raise exception 'Ação restrita ao suporte.';
  end if;

  -- limpa dependentes explicitamente, caso algum FK no banco não tenha
  -- ON DELETE CASCADE.
  delete from public.applications where job_id = target_job_id;
  delete from public.jobs where id = target_job_id;
end;
$$;

revoke all on function public.admin_delete_job(uuid) from public;
grant execute on function public.admin_delete_job(uuid) to authenticated;
