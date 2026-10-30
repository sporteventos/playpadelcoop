-- Fase 8 (parte A) · Privacidade dos contactos — só acrescenta, não retira acessos.
-- Cria vistas públicas sem contactos e funções de consulta para o site público.
-- O fecho do acesso directo às tabelas está em fase8b-privacidade-fecho.sql.

begin;

-- 1) Vistas públicas sem telefone, email nem observações
create or replace view public.inscricoes_publicas as
  select id, criadoem, tipo, genero, categoria, nome1, nome2, estado, parceiro, parid, reservado
  from public.inscricoes;

create or replace view public.jogadores_publicos as
  select id, nome, genero,
    coalesce(raw, '{}'::jsonb) - 'tel' - 'telefone' - 'email' as raw
  from public.jogadores;

revoke all on public.inscricoes_publicas, public.jogadores_publicos from anon, authenticated;
grant select on public.inscricoes_publicas, public.jogadores_publicos to anon, authenticated;

-- 2) Contacto conhecido de um jogador (uso interno, nunca exposto directamente)
create or replace function public.resolve_player_contact(p_nome text, p_exclude text default null)
returns table (telefone text, email text)
language plpgsql stable security definer set search_path = public
as $$
declare
  key text := lower(btrim(regexp_replace(coalesce(p_nome, ''), '\s+', ' ', 'g')));
  tel text;
  mail text;
begin
  if length(key) < 3 then return; end if;
  select nullif(btrim(i.telefone), ''), nullif(btrim(i.email), '')
    into tel, mail
    from public.inscricoes i
    where lower(btrim(regexp_replace(i.nome1, '\s+', ' ', 'g'))) = key
      and nullif(btrim(i.telefone), '') is not null
      and (p_exclude is null or i.id <> p_exclude)
    order by i.criadoem desc nulls last
    limit 1;
  if tel is null or mail is null then
    select coalesce(tel, nullif(btrim(coalesce(j.raw->>'tel', j.raw->>'telefone')), '')),
           coalesce(mail, nullif(btrim(j.raw->>'email'), ''))
      into tel, mail
      from public.jogadores j
      where lower(btrim(regexp_replace(j.nome, '\s+', ' ', 'g'))) = key
      limit 1;
  end if;
  if tel is null then
    select nullif(btrim(t.numero::text, ' "'), '') into tel
      from public.telefones t
      where lower(btrim(t.nome)) = key
      limit 1;
  end if;
  if tel is null and mail is null then return; end if;
  telefone := tel;
  email := mail;
  return next;
end;
$$;
revoke all on function public.resolve_player_contact(text, text) from public, anon, authenticated;

-- 3) Pista mascarada para o formulário (ex.: +258 •••• 456 / j•••@gmail.com)
create or replace function public.player_contact_hint(p_nome text)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  c record;
  tel text;
  mail text;
begin
  select * into c from public.resolve_player_contact(p_nome) limit 1;
  if not found or c.telefone is null then
    return jsonb_build_object('found', false);
  end if;
  tel := regexp_replace(c.telefone, '\s+', '', 'g');
  if length(tel) > 4 then tel := left(tel, 4) || ' •••• ' || right(tel, 3); end if;
  if c.email is not null and position('@' in c.email) > 1 then
    mail := left(c.email, 1) || '•••@' || split_part(c.email, '@', 2);
  end if;
  return jsonb_build_object('found', true, 'telMask', tel, 'emailMask', mail, 'hasEmail', mail is not null);
end;
$$;

-- 4) Preencher no servidor o contacto de um parceiro(a) já registado
create or replace function public.fill_known_partner_contact()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  meta jsonb;
  c record;
begin
  if nullif(btrim(coalesce(new.telefone, '')), '') is not null then return new; end if;
  begin
    meta := nullif(new.observacoes, '')::jsonb;
  exception when others then
    return new;
  end;
  if coalesce((meta->>'contactoConhecido')::boolean, false) is not true then return new; end if;
  select * into c from public.resolve_player_contact(new.nome1, new.id) limit 1;
  if found then
    new.telefone := c.telefone;
    if nullif(btrim(coalesce(new.email, '')), '') is null then new.email := c.email; end if;
  end if;
  new.observacoes := (meta - 'contactoConhecido')::text;
  return new;
end;
$$;

drop trigger if exists fill_known_partner_contact on public.inscricoes;
create trigger fill_known_partner_contact
  before insert on public.inscricoes
  for each row execute function public.fill_known_partner_contact();

-- 5) Consulta do estado por telefone ou referência (só a própria inscrição)
create or replace function public.registration_lookup(p_phone text, p_reference text)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  digits text := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 9);
  ref text := lower(btrim(coalesce(p_reference, '')));
begin
  if length(digits) < 8 and ref = '' then return '[]'::jsonb; end if;
  if ref <> '' and ref !~ '^ins-\d{10,}(-p)?$' then return '[]'::jsonb; end if;
  return coalesce((
    select jsonb_agg(to_jsonb(x) order by x.criadoem desc)
    from (
      select id, criadoem, tipo, genero, categoria, nome1, estado, parceiro, parid, reservado
      from public.inscricoes i
      where (ref = '' or i.id = ref)
        and (length(digits) < 8 or right(regexp_replace(coalesce(i.telefone, ''), '\D', '', 'g'), 9) = digits)
      order by i.criadoem desc nulls last
      limit 10
    ) x
  ), '[]'::jsonb);
end;
$$;

-- 6) Verificação de duplicados antes de submeter (devolve apenas o nome em conflito)
create or replace function public.registration_conflict(p_categoria text, p_people jsonb)
returns text
language plpgsql stable security definer set search_path = public
as $$
declare
  person jsonb;
  digits text;
  key text;
begin
  if jsonb_typeof(p_people) <> 'array' then return null; end if;
  for person in select value from jsonb_array_elements(p_people) limit 4 loop
    digits := regexp_replace(coalesce(person->>'telefone', ''), '\D', '', 'g');
    key := lower(btrim(coalesce(person->>'nome', '')));
    if exists (
      select 1 from public.inscricoes i
      where i.categoria = p_categoria
        and ((digits <> '' and regexp_replace(coalesce(i.telefone, ''), '\D', '', 'g') = digits)
             or (key <> '' and lower(btrim(i.nome1)) = key))
    ) then
      return person->>'nome';
    end if;
  end loop;
  return null;
end;
$$;

revoke all on function public.player_contact_hint(text) from public;
revoke all on function public.registration_lookup(text, text) from public;
revoke all on function public.registration_conflict(text, jsonb) from public;
grant execute on function public.player_contact_hint(text) to anon, authenticated;
grant execute on function public.registration_lookup(text, text) to anon, authenticated;
grant execute on function public.registration_conflict(text, jsonb) to anon, authenticated;

commit;
