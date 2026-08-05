-- ============================================================
-- Play Padel · Fase 4 — Registo de auditoria partilhado
-- Correr no Supabase → SQL Editor (uma vez).
--
-- Antes, cada acção era guardada apenas no localStorage do browser
-- de quem a executava, por isso um admin nunca via as acções de
-- outros utilizadores (ex.: operadores). Esta tabela centraliza os
-- logs: cada acção é inserida aqui e os admins conseguem lê-los todos.
-- ============================================================

create table if not exists public.audit_logs (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid references auth.users(id) on delete set null,
  username  text,
  role      text,
  action    text not null,
  target    text,
  detail    text,
  ts        timestamptz not null default now()
);

create index if not exists audit_logs_ts_idx on public.audit_logs (ts desc);

alter table public.audit_logs enable row level security;

-- Qualquer staff autenticado pode inserir o registo da sua própria acção.
drop policy if exists audit_logs_insert on public.audit_logs;
create policy audit_logs_insert on public.audit_logs
  for insert with check (public.is_staff());

-- Só administradores conseguem ler o registo completo.
drop policy if exists audit_logs_select on public.audit_logs;
create policy audit_logs_select on public.audit_logs
  for select using (public.is_admin());

-- (Sem update/delete: registo é append-only.)
