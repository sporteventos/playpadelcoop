-- Play Padel · Fase 7 — Anúncio do parceiro em self-service
-- O jogador que reservou a vaga da dupla recebe um link privado por email e
-- anuncia o parceiro sem passar pelo backoffice. Idempotente.
begin;

-- 1) Códigos privados (nunca expostos à leitura pública; só via funções abaixo)
create table if not exists public.partner_tokens (
  registration_id text primary key references public.inscricoes(id) on delete cascade,
  token text not null unique default (
    replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
  ),
  created_at timestamptz not null default now(),
  used_at timestamptz
);
alter table public.partner_tokens enable row level security;
revoke all on public.partner_tokens from anon, authenticated;
grant select on public.partner_tokens to service_role;

create or replace function public.ensure_partner_token()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.reservado and new.id not like 'test-%' then
    insert into public.partner_tokens (registration_id) values (new.id)
    on conflict (registration_id) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public.ensure_partner_token() from public, anon, authenticated;

-- Tem de correr antes do trigger de emails (ordem alfabética dos triggers).
drop trigger if exists partner_token_on_reserve on public.inscricoes;
create trigger partner_token_on_reserve
  after insert or update of reservado on public.inscricoes
  for each row execute function public.ensure_partner_token();

insert into public.partner_tokens (registration_id)
select id from public.inscricoes where reservado and id not like 'test-%'
on conflict (registration_id) do nothing;

-- 2) Novo tipo de email: link para anunciar o parceiro (reservas já existentes)
alter table public.notification_outbox drop constraint if exists notification_outbox_event_name_check;
alter table public.notification_outbox add constraint notification_outbox_event_name_check
  check (event_name in (
    'registration_received', 'registration_waitlisted', 'registration_promoted',
    'registration_confirmed', 'registration_partner_link'
  ));

-- 3) Prazo: até ao início do torneio (hora de Maputo)
create or replace function public.partner_deadline()
returns timestamptz language sql stable security definer set search_path = '' as $$
  select (nullif(value #>> '{}', '')::date::timestamp at time zone 'Africa/Maputo')
  from public.config where key = 'tornInicio';
$$;
revoke all on function public.partner_deadline() from public, anon, authenticated;

-- 4) Consulta pública da reserva (apenas dados essenciais)
create or replace function public.partner_reservation(p_token text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  r record;
  deadline timestamptz := public.partner_deadline();
  state text;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('status', 'invalid');
  end if;
  select i.* into r
  from public.partner_tokens t join public.inscricoes i on i.id = t.registration_id
  where t.token = p_token;
  if not found then return jsonb_build_object('status', 'invalid'); end if;

  state := case
    when not r.reservado then 'announced'
    when r.estado in ('cancelada', 'rejeitada') then 'closed'
    when deadline is not null and now() >= deadline then 'expired'
    else 'ok'
  end;
  return jsonb_build_object(
    'status', state,
    'nome', r.nome1,
    'categoria', r.categoria,
    'categoriaNome', (select nome from public.categorias where id = r.categoria),
    'genero', r.genero,
    'estado', r.estado,
    'referencia', 'PP-' || regexp_replace(r.id, '^ins-', ''),
    'parceiro', case when r.reservado then null else r.parceiro end,
    'prazo', deadline
  );
end;
$$;

-- 5) Anúncio do parceiro: cria a pré-inscrição do parceiro ligada à vaga reservada
create or replace function public.announce_partner(
  p_token text, p_nome text, p_telefone text, p_email text,
  p_tshirt_nome text, p_tshirt_tamanho text
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  r record;
  deadline timestamptz := public.partner_deadline();
  nome text := regexp_replace(btrim(coalesce(p_nome, '')), '\s+', ' ', 'g');
  telefone text := btrim(coalesce(p_telefone, ''));
  digits text := regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g');
  email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  shirt_name text := upper(btrim(coalesce(p_tshirt_nome, '')));
  shirt_size text := upper(btrim(coalesce(p_tshirt_tamanho, '')));
  meta jsonb;
  new_parid text;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('status', 'invalid');
  end if;
  select i.* into r
  from public.partner_tokens t join public.inscricoes i on i.id = t.registration_id
  where t.token = p_token
  for update of i;
  if not found then return jsonb_build_object('status', 'invalid'); end if;
  if not r.reservado then return jsonb_build_object('status', 'announced', 'parceiro', r.parceiro); end if;
  if r.estado in ('cancelada', 'rejeitada') then return jsonb_build_object('status', 'closed'); end if;
  if deadline is not null and now() >= deadline then return jsonb_build_object('status', 'expired'); end if;

  if length(nome) < 3 or length(nome) > 80 then
    return jsonb_build_object('status', 'error', 'field', 'nome', 'message', 'Indica o nome completo do(a) parceiro(a).');
  end if;
  if lower(nome) = lower(btrim(r.nome1)) then
    return jsonb_build_object('status', 'error', 'field', 'nome', 'message', 'O(a) parceiro(a) tem de ser outra pessoa.');
  end if;
  if length(digits) < 9 or length(digits) > 15 or length(telefone) > 30 then
    return jsonb_build_object('status', 'error', 'field', 'telefone', 'message', 'Indica um número de telefone válido.');
  end if;
  if digits = regexp_replace(coalesce(r.telefone, ''), '\D', '', 'g') then
    return jsonb_build_object('status', 'error', 'field', 'telefone', 'message', 'O telefone do(a) parceiro(a) tem de ser diferente do teu.');
  end if;
  if email is not null and (length(email) > 254 or email !~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$') then
    return jsonb_build_object('status', 'error', 'field', 'email', 'message', 'O email indicado não é válido.');
  end if;
  if length(shirt_name) < 1 or length(shirt_name) > 18 then
    return jsonb_build_object('status', 'error', 'field', 'tshirtNome', 'message', 'Indica o nome a imprimir na t-shirt (até 18 caracteres).');
  end if;
  if shirt_size not in ('S', 'M', 'L', 'XL', 'XXL') then
    return jsonb_build_object('status', 'error', 'field', 'tshirtTamanho', 'message', 'Selecciona o tamanho da t-shirt.');
  end if;
  if exists (
    select 1 from public.inscricoes x
    where x.categoria = r.categoria and x.id <> r.id
      and coalesce(x.estado, '') not in ('cancelada', 'rejeitada')
      and (regexp_replace(coalesce(x.telefone, ''), '\D', '', 'g') = digits
           or lower(btrim(x.nome1)) = lower(nome))
  ) then
    return jsonb_build_object('status', 'error', 'field', 'nome', 'message', 'Este(a) jogador(a) já tem uma inscrição nesta categoria. Contacta a organização.');
  end if;

  begin
    meta := nullif(r.observacoes, '')::jsonb;
  exception when others then
    meta := null;
  end;
  if meta is not null and jsonb_typeof(meta) = 'object' then
    meta := meta || jsonb_build_object('tshirts',
      coalesce(meta -> 'tshirts', '{}'::jsonb)
        || jsonb_build_object('parceiro', jsonb_build_object('nome', shirt_name, 'tamanho', shirt_size)));
  else
    meta := null;
  end if;

  new_parid := coalesce(nullif(r.parid, ''), 'par-' || regexp_replace(r.id, '^ins-', ''));

  begin
    insert into public.inscricoes (
      id, criadoem, tipo, genero, categoria, nome1, nome2, telefone, email,
      observacoes, estado, parceiro, parid, reservado
    ) values (
      r.id || '-p', now(), 'dupla', r.genero, r.categoria, nome, '', telefone, email,
      coalesce(meta::text, ''),
      case when r.estado = 'espera' then 'espera' else 'nova' end,
      r.nome1, new_parid, false
    );
  exception when unique_violation then
    return jsonb_build_object('status', 'error', 'field', 'telefone', 'message', 'Este(a) jogador(a) já tem uma inscrição nesta categoria. Contacta a organização.');
  end;

  update public.inscricoes
    set reservado = false, parceiro = nome, parid = new_parid,
        tipo = 'dupla',
        observacoes = coalesce(meta::text, observacoes)
    where id = r.id;
  update public.partner_tokens set used_at = now() where registration_id = r.id;
  insert into public.audit_logs (username, role, action, target, detail)
  values ('self-service', 'jogador', 'ANUNCIAR_PARCEIRO', 'inscricoes',
          left(r.nome1 || ' → ' || nome || ' (' || r.categoria || ', self-service)', 300));

  return jsonb_build_object('status', 'ok', 'parceiro', nome, 'categoria', r.categoria);
end;
$$;

revoke all on function public.partner_reservation(text) from public;
revoke all on function public.announce_partner(text, text, text, text, text, text) from public;
grant execute on function public.partner_reservation(text) to anon, authenticated;
grant execute on function public.announce_partner(text, text, text, text, text, text) to anon, authenticated;

-- 6) Enviar o link às reservas que já existiam antes desta funcionalidade
insert into public.notification_outbox (registration_id, event_name, recipient, payload, status)
select i.id, 'registration_partner_link', lower(btrim(i.email)),
  jsonb_build_object('name', left(i.nome1, 200), 'category', left(i.categoria, 50), 'state', i.estado),
  'pending'
from public.inscricoes i
where i.reservado and i.id not like 'test-%'
  and i.estado in ('nova', 'espera', 'confirmada')
  and nullif(btrim(i.email), '') is not null
on conflict (registration_id, event_name) do nothing;

commit;
