-- Fase 9: promoção automática da lista de espera.
-- Quando uma vaga fica livre numa categoria (cancelamento, remoção, mudança de
-- categoria ou aumento de capacidade), sobe a inscrição mais antiga em espera
-- dessa categoria, por ordem estrita (Espera #1 primeiro). Uma dupla sobe inteira;
-- se a #1 precisar de mais vagas do que as livres, ninguém lhe passa à frente.
-- A passagem 'espera' -> 'nova' dispara o email registration_promoted (fase 6).
-- A capacidade segue a mesma regra de js/data.js (ppCategoryCapacity).

create or replace function public.promote_waitlist(p_categoria text)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  planned int;
  per_group int;
  free_slots int;
  unit record;
  promoted int := 0;
begin
  if p_categoria is null or p_categoria = '' then return 0; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('waitlist:' || p_categoria));

  select case when c.raw->>'gruposPlaneados' ~ '^\d+$' then (c.raw->>'gruposPlaneados')::int end,
         case when c.raw->>'duplasPorGrupo' ~ '^\d+$' then (c.raw->>'duplasPorGrupo')::int end
    into planned, per_group
    from public.categorias c where c.id = p_categoria;
  if not found then return 0; end if;
  if planned is null or planned < 1 then
    select count(*) into planned from public.grupos g where g.cat = p_categoria;
  end if;
  if planned is null or planned < 1 then
    planned := case p_categoria when 'M2' then 4 when 'M3' then 4 else 2 end;
  end if;
  if per_group is null or per_group < 1 then per_group := 4; end if;

  select planned * per_group * 2 - coalesce(sum(
           1 + case when i.reservado or (coalesce(i.nome2, '') <> '' and coalesce(i.parid, '') = '') then 1 else 0 end), 0)
    into free_slots
    from public.inscricoes i
   where i.categoria = p_categoria
     and coalesce(i.estado, '') not in ('espera', 'cancelada', 'rejeitada');

  for unit in
    select coalesce(nullif(i.parid, ''), i.id) as unit_key,
           min(i.criadoem) as first_at,
           sum(1 + case when i.reservado or (coalesce(i.nome2, '') <> '' and coalesce(i.parid, '') = '') then 1 else 0 end)::int as slots,
           array_agg(i.id) as ids
      from public.inscricoes i
     where i.categoria = p_categoria and i.estado = 'espera'
     group by 1
     order by 2 nulls last, 1
  loop
    exit when free_slots < unit.slots;
    update public.inscricoes set estado = 'nova' where id = any(unit.ids) and estado = 'espera';
    free_slots := free_slots - unit.slots;
    promoted := promoted + 1;
  end loop;
  return promoted;
end;
$$;

revoke all on function public.promote_waitlist(text) from public, anon, authenticated;

create or replace function public.auto_promote_waitlist()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'categorias' then
    perform public.promote_waitlist(new.id);
  elsif tg_op = 'DELETE' then
    perform public.promote_waitlist(old.categoria);
  else
    perform public.promote_waitlist(old.categoria);
    if new.categoria is distinct from old.categoria then
      perform public.promote_waitlist(new.categoria);
    end if;
  end if;
  return null;
end;
$$;

revoke all on function public.auto_promote_waitlist() from public, anon, authenticated;

-- Diferido para o fim da transacção: anunciar um parceiro (actualizar a reserva e
-- inserir o parceiro) é avaliado já com a dupla completa.
drop trigger if exists waitlist_auto_promote on public.inscricoes;
create constraint trigger waitlist_auto_promote
  after delete or update of estado, categoria, reservado, nome2, parid on public.inscricoes
  deferrable initially deferred
  for each row execute function public.auto_promote_waitlist();

drop trigger if exists waitlist_auto_promote on public.categorias;
create constraint trigger waitlist_auto_promote
  after insert or update of raw on public.categorias
  deferrable initially deferred
  for each row execute function public.auto_promote_waitlist();

-- Rollback:
-- drop trigger if exists waitlist_auto_promote on public.inscricoes;
-- drop trigger if exists waitlist_auto_promote on public.categorias;
-- drop function if exists public.auto_promote_waitlist();
-- drop function if exists public.promote_waitlist(text);
