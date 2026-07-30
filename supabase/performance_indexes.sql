-- Free Floripa - indices de performance
-- Execute este arquivo no SQL editor do Supabase depois do schema principal e do coin_wallets.sql.
-- Ele nao altera dados; apenas acelera as buscas mais usadas pelo app.

create index if not exists idx_jobs_status_shift_date
on public.jobs (status, shift_date);

create index if not exists idx_jobs_company_created
on public.jobs (company_id, created_at desc);

create index if not exists idx_jobs_function_shift_date
on public.jobs (function_name, shift_date);

create index if not exists idx_jobs_neighborhood_shift_date
on public.jobs (neighborhood, shift_date);

create index if not exists idx_jobs_urgent_shift_date
on public.jobs (urgent, shift_date)
where urgent = true;

create index if not exists idx_applications_worker_created
on public.applications (worker_id, created_at desc);

create index if not exists idx_applications_job_status
on public.applications (job_id, status);

create index if not exists idx_applications_status_created
on public.applications (status, created_at desc);

create index if not exists idx_work_shifts_worker_status
on public.work_shifts (worker_id, status);

create index if not exists idx_work_shifts_job_status
on public.work_shifts (job_id, status);

create index if not exists idx_notifications_user_created
on public.notifications (user_id, created_at desc);

create index if not exists idx_notifications_user_role_read
on public.notifications (user_id, role, read);

create index if not exists idx_worker_profiles_neighborhood
on public.worker_profiles (neighborhood);

create index if not exists idx_worker_profiles_rating
on public.worker_profiles (rating desc, completed_jobs desc);

create index if not exists idx_worker_profiles_professions
on public.worker_profiles using gin (professions);

create index if not exists idx_worker_function_experience_function
on public.worker_function_experience (function_name, level);

create index if not exists idx_company_profiles_neighborhood
on public.company_profiles (neighborhood);

create index if not exists idx_coin_transactions_user_created
on public.coin_transactions (user_id, created_at desc);

create index if not exists idx_coin_transactions_user_reason_created
on public.coin_transactions (user_id, reason, created_at desc);

create index if not exists idx_coin_unlocked_jobs_job
on public.coin_unlocked_jobs (job_id);
