-- ============================================================
-- Play Padel · Fase 3 — Schema relacional (espelho) do torneio
-- Correr no Supabase → SQL Editor (uma vez).
-- Cada tabela de "array" tem colunas relacionais + `raw` jsonb
-- (fidelidade total: a app é re-hidratada a partir de `raw`).
-- RLS: leitura pública, escrita só para staff (is_staff()).
-- Requer a Fase 2 (funções is_staff()/is_admin()).
-- ============================================================

-- 1) Categorias
create table if not exists public.categorias (
  id     text primary key,
  nome   text,
  tipo   text,
  nivel  int,
  raw    jsonb not null default '{}'
);

-- 2) Campos
create table if not exists public.campos (
  id      text primary key,   -- id original (número) guardado como texto; `raw` preserva o tipo
  nome    text,
  icone   text,
  activo  boolean,
  raw     jsonb not null default '{}'
);

-- 3) Jogadores
create table if not exists public.jogadores (
  id     text primary key,
  nome   text,
  genero text,
  raw    jsonb not null default '{}'
);

-- 4) Grupos  (relação real: grupos.cat -> categorias.id)
create table if not exists public.grupos (
  id     text primary key,
  cat    text references public.categorias(id) on delete cascade,
  letra  text,
  raw    jsonb not null default '{}'
);
create index if not exists grupos_cat_idx on public.grupos(cat);

-- 5) Duplas  (relações: duplas.grupo -> grupos.id, duplas.cat -> categorias.id, j1/j2 -> jogadores.id)
create table if not exists public.duplas (
  id     text primary key,
  grupo  text references public.grupos(id) on delete cascade,
  cat    text references public.categorias(id) on delete set null,
  j1     text references public.jogadores(id) on delete set null,
  j2     text references public.jogadores(id) on delete set null,
  raw    jsonb not null default '{}'
);
create index if not exists duplas_grupo_idx on public.duplas(grupo);
create index if not exists duplas_cat_idx on public.duplas(cat);

-- 6) Jogos  (grupo = referência "soft" a grupos.id — mantida como texto
--            porque a app usa strings de equipa/grupo e cria jogos fora do grupo)
create table if not exists public.jogos (
  id         text primary key,
  data       date,
  hora       text,
  campo      text,
  grupo      text,
  eq1        text,
  eq2        text,
  resultado  jsonb,
  estado     text,
  raw        jsonb not null default '{}'
);
create index if not exists jogos_grupo_idx on public.jogos(grupo);
create index if not exists jogos_data_idx  on public.jogos(data);

-- 7) Patrocinadores / Parceiros
create table if not exists public.patrocinadores (
  id text primary key, nome text, logo text, url text, ordem int,
  raw jsonb not null default '{}'
);
create table if not exists public.parceiros (
  id text primary key, nome text, logo text, url text, ordem int,
  raw jsonb not null default '{}'
);

-- 8) Fase final (bracket por categoria — estrutura encaixada em jsonb)
create table if not exists public.fasefinal (
  categoria_id text primary key,
  data         jsonb not null default '{}'
);

-- 9) Telefones (mapa nome -> número)
create table if not exists public.telefones (
  nome   text primary key,
  numero text
);

-- 10) Config (chave -> valor)
create table if not exists public.config (
  key   text primary key,
  value jsonb
);

-- ============================================================
-- RLS · leitura pública, escrita só staff
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array[
    'categorias','campos','jogadores','grupos','duplas','jogos',
    'patrocinadores','parceiros','fasefinal','telefones','config'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);

    execute format('drop policy if exists %I on public.%I;', t||'_select', t);
    execute format('create policy %I on public.%I for select using (true);', t||'_select', t);

    execute format('drop policy if exists %I on public.%I;', t||'_insert', t);
    execute format('create policy %I on public.%I for insert with check (public.is_staff());', t||'_insert', t);

    execute format('drop policy if exists %I on public.%I;', t||'_update', t);
    execute format('create policy %I on public.%I for update using (public.is_staff()) with check (public.is_staff());', t||'_update', t);

    execute format('drop policy if exists %I on public.%I;', t||'_delete', t);
    execute format('create policy %I on public.%I for delete using (public.is_staff());', t||'_delete', t);
  end loop;
end$$;
