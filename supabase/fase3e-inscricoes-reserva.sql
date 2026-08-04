-- Fase 3e — Reserva de lugar (parceiro a anunciar) nas inscrições
-- Idempotente: pode correr várias vezes sem erro.

alter table public.inscricoes
  add column if not exists reservado boolean not null default false;

comment on column public.inscricoes.reservado is
  'true = pré-inscrição que reserva também o lugar do parceiro ainda por anunciar (ocupa 2 vagas)';
