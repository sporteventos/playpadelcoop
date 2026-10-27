-- Ativar APENAS depois de configurar os secrets e publicar a Edge Function.
-- Em Database > Extensions, ativar pg_cron e pg_net.
-- No Vault, criar registration_emails_worker_secret com o mesmo valor
-- de NOTIFY_WORKER_SECRET (NÃO é o secret OAuth do IDM).

create or replace function public.dispatch_registration_emails()
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  worker_secret text;
  request_id bigint;
begin
  select decrypted_secret into worker_secret
  from vault.decrypted_secrets where name = 'registration_emails_worker_secret';
  if worker_secret is null or length(worker_secret) < 32 then
    raise exception 'Missing registration_emails_worker_secret in Vault';
  end if;
  select net.http_post(
    url := 'https://jjtsqsumczbhfgbgjxsd.supabase.co/functions/v1/registration-emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || worker_secret, 'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 150000
  ) into request_id;
  return request_id;
end;
$$;
revoke all on function public.dispatch_registration_emails() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'registration-emails-every-minute';
select cron.schedule(
  'registration-emails-every-minute',
  '* * * * *',
  'select public.dispatch_registration_emails();'
);
