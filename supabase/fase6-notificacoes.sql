-- Executar no SQL Editor depois das fases 2, 3d e 3e.
-- Não envia nem cria eventos retroativos para inscrições existentes.
begin;

create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  registration_id text not null references public.inscricoes(id) on delete cascade,
  event_name text not null check (event_name in (
    'registration_received', 'registration_waitlisted',
    'registration_promoted', 'registration_confirmed'
  )),
  recipient text,
  payload jsonb not null,
  rendered_content jsonb,
  idempotency_key uuid not null default gen_random_uuid() unique,
  status text not null check (status in (
    'pending', 'processing', 'accepted', 'delivered', 'failed',
    'skipped_no_email', 'skipped_stale', 'suppressed'
  )),
  attempts integer not null default 0,
  provider_id text,
  last_error text,
  next_attempt_at timestamptz not null default now(),
  locked_until timestamptz,
  lease_id uuid,
  accepted_at timestamptz,
  checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (registration_id, event_name)
);

alter table public.notification_outbox enable row level security;
revoke all on public.notification_outbox from anon, authenticated;
grant select, insert, update, delete on public.notification_outbox to service_role;
create index if not exists notification_outbox_pending_idx
  on public.notification_outbox (next_attempt_at) where status in ('pending', 'processing');
create index if not exists notification_outbox_recipient_idx
  on public.notification_outbox (recipient, created_at);

create or replace function public.enqueue_registration_email()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  event text;
  email_address text := nullif(lower(btrim(new.email)), '');
  initial_status text;
begin
  if new.id like 'test-%' then return new; end if;
  if tg_op = 'UPDATE' then
    if new.estado is not distinct from old.estado
       and new.email is not distinct from old.email then return new; end if;
  end if;

  case new.estado
    when 'confirmada' then event := 'registration_confirmed';
    when 'espera' then event := 'registration_waitlisted';
    when 'nova' then
      if tg_op = 'UPDATE' then
        if old.estado = 'espera' then event := 'registration_promoted'; end if;
      end if;
      event := coalesce(event, 'registration_received');
    else return new;
  end case;

  initial_status := case when email_address is null then 'skipped_no_email' else 'pending' end;
  if email_address is not null then
    if length(email_address) > 254 or email_address !~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$' then
      initial_status := 'suppressed';
    else
      -- Serializa a quota por destinatário e a quota global, inclusive em inserts concorrentes.
      perform pg_catalog.pg_advisory_xact_lock(6012026);
      if (select count(*) from public.notification_outbox
          where recipient = email_address and created_at > now() - interval '1 hour'
          and status not in ('suppressed', 'skipped_no_email')) >= 5
         or (select count(*) from public.notification_outbox
             where created_at > now() - interval '1 day'
             and status not in ('suppressed', 'skipped_no_email')) >= 1000 then
        initial_status := 'suppressed';
      end if;
    end if;
  end if;

  insert into public.notification_outbox (registration_id, event_name, recipient, payload, status, last_error)
  values (
    new.id, event, email_address,
    jsonb_build_object('name', left(new.nome1, 200), 'category', left(new.categoria, 50), 'state', new.estado),
    initial_status,
    case when initial_status = 'suppressed' then 'invalid_email_or_send_quota' end
  )
  on conflict (registration_id, event_name) do update
    set recipient = excluded.recipient, payload = excluded.payload,
        status = excluded.status, last_error = excluded.last_error, updated_at = now()
    where notification_outbox.status = 'skipped_no_email';
  return new;
end;
$$;

revoke all on function public.enqueue_registration_email() from public, anon, authenticated;
drop trigger if exists registration_email_events on public.inscricoes;
create trigger registration_email_events
  after insert or update of estado, email on public.inscricoes
  for each row execute function public.enqueue_registration_email();

create or replace function public.claim_registration_emails(batch_size integer default 3)
returns setof public.notification_outbox
language sql security definer set search_path = '' as $$
  with eligible as (
    select id from public.notification_outbox
    where (status = 'pending' and next_attempt_at <= now())
       or (status = 'processing' and locked_until < now())
    order by created_at, id
    for update skip locked
    limit greatest(1, least(batch_size, 5))
  )
  update public.notification_outbox n
    set status = 'processing', attempts = attempts + 1,
        locked_until = now() + interval '5 minutes',
        lease_id = gen_random_uuid(), updated_at = now()
    from eligible where n.id = eligible.id
    returning n.*;
$$;
revoke all on function public.claim_registration_emails(integer) from public, anon, authenticated;
grant execute on function public.claim_registration_emails(integer) to service_role;

commit;
