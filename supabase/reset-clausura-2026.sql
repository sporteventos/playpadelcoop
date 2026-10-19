-- Torneio Clausura 2026
-- Mantém jogadores, categorias, campos, telefones, patrocinadores e parceiros.
-- Remove apenas os dados competitivos e inscrições do torneio anterior.
-- Executar uma única vez no Supabase SQL Editor antes de abrir as inscrições.

begin;

delete from public.inscricoes;
delete from public.fasefinal;
delete from public.jogos;
delete from public.duplas;
delete from public.grupos;

insert into public.config (key, value)
values
  ('tornNome',             to_jsonb('Torneio Clausura'::text)),
  ('tornSubtitulo',        to_jsonb('Torneio Clausura'::text)),
  ('tornSlug',             to_jsonb('clausura-2026'::text)),
  ('tornClube',            to_jsonb('Sport Eventos'::text)),
  ('tornLocal',            to_jsonb('Maputo'::text)),
  ('tornDatas',            to_jsonb('26 de Novembro a 05 de Dezembro 2026'::text)),
  ('tornInicio',           to_jsonb('2026-11-26'::text)),
  ('tornFim',              to_jsonb('2026-12-05'::text)),
  ('dataGruposInicio',     to_jsonb('2026-11-26'::text)),
  ('dataGruposFim',        to_jsonb('2026-12-02'::text)),
  ('dataQuartos',          to_jsonb('2026-12-03'::text)),
  ('dataQuartosFim',       to_jsonb(''::text)),
  ('dataMeias',            to_jsonb('2026-12-04'::text)),
  ('dataMeiasFim',         to_jsonb(''::text)),
  ('dataFinais',           to_jsonb('2026-12-05'::text)),
  ('tornDescFooter',       to_jsonb('O padel que une Moçambique.'::text)),
  ('tornActivo',           'true'::jsonb),
  ('calendarioVisible',    'false'::jsonb),
  ('scoreboardVisible',    'false'::jsonb),
  ('classificacoesVisible','false'::jsonb),
  ('fasefinalVisible',     'false'::jsonb),
  ('jogadoresVisible',     'true'::jsonb),
  ('inscricoesVisible',    'true'::jsonb),
  ('inscritosVisible',     'true'::jsonb),
  ('estatisticasVisible',  'false'::jsonb),
  ('regulamentoVisible',   'true'::jsonb),
  ('liveStatsVisible',     'false'::jsonb),
  ('navegarVisible',       'true'::jsonb),
  ('agendaVisible',        'false'::jsonb),
  ('leaderboardVisible',   'false'::jsonb),
  ('patrocinadoresVisible','true'::jsonb),
  ('parceirosVisible',     'true'::jsonb),
  ('bannerVisible',        'false'::jsonb),
  ('bannerMsg',            to_jsonb(''::text))
on conflict (key) do update
set value = excluded.value;

-- Impede que o fallback legado volte a hidratar jogos ou inscrições antigos.
delete from public.app_state
where id = 'playpadelcoop-main';

commit;
