-- Fase 8 (parte B) · Fecho do acesso público aos contactos.
-- Aplicar só depois de o site estar a usar as vistas e funções de fase8-privacidade.sql.
-- Visitantes (e contas autenticadas sem perfil de staff) deixam de ler as tabelas
-- completas; o site público passa a usar inscricoes_publicas / jogadores_publicos.

begin;

drop policy if exists inscricoes_select on public.inscricoes;
create policy inscricoes_select on public.inscricoes for select using (public.is_staff());

drop policy if exists jogadores_select on public.jogadores;
create policy jogadores_select on public.jogadores for select using (public.is_staff());

drop policy if exists telefones_select on public.telefones;
create policy telefones_select on public.telefones for select using (public.is_staff());

drop policy if exists app_state_select on public.app_state;
create policy app_state_select on public.app_state for select using (public.is_staff());

commit;

-- Reverter (se necessário):
-- begin;
-- drop policy inscricoes_select on public.inscricoes; create policy inscricoes_select on public.inscricoes for select using (true);
-- drop policy jogadores_select on public.jogadores;   create policy jogadores_select on public.jogadores for select using (true);
-- drop policy telefones_select on public.telefones;   create policy telefones_select on public.telefones for select using (true);
-- drop policy app_state_select on public.app_state;   create policy app_state_select on public.app_state for select using (true);
-- commit;
