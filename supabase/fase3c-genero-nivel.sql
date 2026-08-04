-- Fase 3c — Género no jogador + Nível (categoria) na dupla
-- Correr no SQL Editor do Supabase depois de fase3-schema.sql.
-- Migração aditiva e idempotente (não afecta dados existentes).

-- 1) Género do jogador (relação jogador <-> género: M / F)
alter table public.jogadores
  add column if not exists genero text;

-- 2) Nível de inscrição da dupla (independente do grupo, atribuído antes dos grupos)
alter table public.duplas
  add column if not exists cat text references public.categorias(id) on delete set null;

create index if not exists duplas_cat_idx on public.duplas(cat);
