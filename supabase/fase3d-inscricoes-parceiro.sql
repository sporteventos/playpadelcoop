-- Fase 3d — Inscrição individual do parceiro
-- Cada membro da dupla passa a ter a sua própria pré-inscrição, ligadas por parid.
-- Correr no SQL Editor do Supabase (idempotente).

-- Nome do parceiro (para exibição) e id do par (liga as duas inscrições)
alter table public.inscricoes
  add column if not exists parceiro text;

alter table public.inscricoes
  add column if not exists parid text;

create index if not exists inscricoes_parid_idx on public.inscricoes(parid);
