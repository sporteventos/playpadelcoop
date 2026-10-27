-- Play Padel · Fase 5 — capacidade por categoria
-- Aplica a distribuição do Torneio Clausura sem remover grupos ou inscrições existentes.
-- Cada grupo tem 4 duplas = 8 jogadores.

begin;

insert into public.categorias (id, nome, tipo, nivel, raw)
values
  ('M1', 'Masculino 1', 'M', 1, '{"id":"M1","nome":"Masculino 1","tipo":"M","nivel":1,"gruposPlaneados":2,"duplasPorGrupo":4}'::jsonb),
  ('M2', 'Masculino 2', 'M', 2, '{"id":"M2","nome":"Masculino 2","tipo":"M","nivel":2,"gruposPlaneados":4,"duplasPorGrupo":4}'::jsonb),
  ('M3', 'Masculino 3', 'M', 3, '{"id":"M3","nome":"Masculino 3","tipo":"M","nivel":3,"gruposPlaneados":4,"duplasPorGrupo":4}'::jsonb),
  ('M4', 'Masculino 4', 'M', 4, '{"id":"M4","nome":"Masculino 4","tipo":"M","nivel":4,"gruposPlaneados":2,"duplasPorGrupo":4}'::jsonb),
  ('M5', 'Masculino 5', 'M', 5, '{"id":"M5","nome":"Masculino 5","tipo":"M","nivel":5,"gruposPlaneados":2,"duplasPorGrupo":4}'::jsonb),
  ('F1', 'Feminino 1',  'F', 1, '{"id":"F1","nome":"Feminino 1","tipo":"F","nivel":1,"gruposPlaneados":2,"duplasPorGrupo":4}'::jsonb),
  ('F2', 'Feminino 2',  'F', 2, '{"id":"F2","nome":"Feminino 2","tipo":"F","nivel":2,"gruposPlaneados":2,"duplasPorGrupo":4}'::jsonb),
  ('F3', 'Feminino 3',  'F', 3, '{"id":"F3","nome":"Feminino 3","tipo":"F","nivel":3,"gruposPlaneados":2,"duplasPorGrupo":4}'::jsonb)
on conflict (id) do update
set nome = excluded.nome,
    tipo = excluded.tipo,
    nivel = excluded.nivel,
    raw = coalesce(categorias.raw, '{}'::jsonb) || excluded.raw;

with planned(cat, letra) as (
  values
    ('M1','A'), ('M1','B'),
    ('M2','A'), ('M2','B'), ('M2','C'), ('M2','D'),
    ('M3','A'), ('M3','B'), ('M3','C'), ('M3','D'),
    ('M4','A'), ('M4','B'),
    ('M5','A'), ('M5','B'),
    ('F1','A'), ('F1','B'),
    ('F2','A'), ('F2','B'),
    ('F3','A'), ('F3','B')
)
insert into public.grupos (id, cat, letra, raw)
select
  cat || '-' || letra,
  cat,
  letra,
  jsonb_build_object('id', cat || '-' || letra, 'cat', cat, 'letra', letra)
from planned
on conflict (id) do update
set cat = excluded.cat,
    letra = excluded.letra,
    raw = coalesce(grupos.raw, '{}'::jsonb) || excluded.raw;

commit;
