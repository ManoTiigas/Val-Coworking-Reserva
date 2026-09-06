-- Mantém o banco ativo com uma operação interna, leve e auditável.
create schema if not exists private;

create table if not exists private.database_keepalive_runs (
  id bigint generated always as identity primary key,
  ran_at timestamptz not null default now()
);

create or replace function private.record_database_keepalive()
returns void
language plpgsql
security invoker
set search_path = private, pg_temp
as $$
begin
  insert into private.database_keepalive_runs default values;

  delete from private.database_keepalive_runs
  where ran_at < now() - interval '90 days';
end;
$$;

revoke all on function private.record_database_keepalive() from public, anon, authenticated;

create extension if not exists pg_cron;

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'val-coworking-database-keepalive';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'val-coworking-database-keepalive',
    '15 3 * * *',
    'select private.record_database_keepalive();'
  );
end;
$$;
