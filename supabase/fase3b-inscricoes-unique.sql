-- ============================================================
-- Play Padel · Chave única para pré-inscrições
-- Evita inscrições duplicadas (mesma categoria + mesmo telefone).
-- Correr no Supabase → SQL Editor (uma vez).
-- ============================================================

-- 1) Limpar duplicados já existentes (mantém o registo mais antigo)
delete from public.inscricoes a
using public.inscricoes b
where a.categoria = b.categoria
  and a.telefone  = b.telefone
  and (a.criadoem > b.criadoem
       or (a.criadoem = b.criadoem and a.ctid > b.ctid));

-- 2) Índice único = "chave privada" da inscrição
create unique index if not exists inscricoes_unica_cat_tel
  on public.inscricoes (categoria, telefone);
