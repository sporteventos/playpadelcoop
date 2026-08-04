-- ============================================================
-- Play Padel · Fase 2 — Autenticação Supabase + RLS
-- Correr no Supabase → SQL Editor (uma vez).
-- ============================================================

-- 1) Tabela de perfis (papéis/permissões), ligada a auth.users
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,          -- normalmente o email
  name        text not null,
  role        text not null default 'operator' check (role in ('admin','operator')),
  categories  text[] not null default '{}',  -- vazio = todas as categorias
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 2) Funções auxiliares (SECURITY DEFINER evita recursão de RLS)
create or replace function public.is_staff()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.active
  );
$$;

create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.active and p.role = 'admin'
  );
$$;

-- 3) Políticas RLS · profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert with check (public.is_admin());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles
  for delete using (public.is_admin());

-- 4) Políticas RLS · app_state (estado do torneio)
alter table public.app_state enable row level security;

drop policy if exists app_state_select on public.app_state;
create policy app_state_select on public.app_state
  for select using (true);                       -- leitura pública

drop policy if exists app_state_insert on public.app_state;
create policy app_state_insert on public.app_state
  for insert with check (public.is_staff());     -- escrever só staff

drop policy if exists app_state_update on public.app_state;
create policy app_state_update on public.app_state
  for update using (public.is_staff()) with check (public.is_staff());

-- 5) Políticas RLS · inscricoes
alter table public.inscricoes enable row level security;

drop policy if exists inscricoes_select on public.inscricoes;
create policy inscricoes_select on public.inscricoes
  for select using (true);                       -- leitura pública

drop policy if exists inscricoes_insert on public.inscricoes;
create policy inscricoes_insert on public.inscricoes
  for insert with check (true);                  -- inscrição pública

drop policy if exists inscricoes_update on public.inscricoes;
create policy inscricoes_update on public.inscricoes
  for update using (public.is_staff()) with check (public.is_staff());

drop policy if exists inscricoes_delete on public.inscricoes;
create policy inscricoes_delete on public.inscricoes
  for delete using (public.is_staff());

-- ============================================================
-- 6) BOOTSTRAP DO PRIMEIRO ADMIN
--    a) Authentication -> Users -> Add user
--       (define email + password; confirma o email / auto-confirm)
--    b) Depois corre isto, trocando o email pelo que criaste:
-- ------------------------------------------------------------
-- insert into public.profiles (id, username, name, role)
-- select id, email, 'Administrador', 'admin'
-- from auth.users
-- where email = 'o-teu-email@exemplo.com'
-- on conflict (id) do update set role = 'admin', active = true;
-- ============================================================
