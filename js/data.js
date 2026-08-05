// ============================================
//  PLAY PADEL — Dados Partilhados
//  Carregado por todas as páginas (público + admin)
// ============================================

const DEFAULTS = {
  campos: [
    { id: 1, nome: 'Play Padel',    icone: '??', activo: true },
    { id: 2, nome: 'TVCabo',        icone: '??', activo: true },
    { id: 3, nome: 'Stella Artois', icone: '??', activo: true },
  ],
  categorias: [
    { id:'M1', nome:'Masculino 1', tipo:'M', nivel:1 },
    { id:'M2', nome:'Masculino 2', tipo:'M', nivel:2 },
    { id:'M3', nome:'Masculino 3', tipo:'M', nivel:3 },
    { id:'M4', nome:'Masculino 4', tipo:'M', nivel:4 },
    { id:'M5', nome:'Masculino 5', tipo:'M', nivel:5 },
    { id:'F1', nome:'Feminino 1',  tipo:'F', nivel:1 },
    { id:'F2', nome:'Feminino 2',  tipo:'F', nivel:2 },
    { id:'F3', nome:'Feminino 3',  tipo:'F', nivel:3 },
  ],
  grupos: [],
  jogadores: [],
  duplas: [],
  jogos: [],
  fasefinal: {},
  telefones: {},
  inscricoes: [],
  patrocinadores: [
    { id: 'jetour',          nome: 'Jetour',           logo: 'patrocinadores/jetour.png',           url: '' },
    { id: 'stellaartois',    nome: 'Stella Artois',    logo: 'patrocinadores/stellaartois.png',     url: '' },
    { id: 'bonaqua',         nome: 'Bona Aqua',        logo: 'patrocinadores/bonaqua.png',          url: '' },
    { id: 'tvcabo',          nome: 'TV Cabo',          logo: 'patrocinadores/tvcabo.png',           url: '' },
    { id: 'alcanceeditores', nome: 'Alcance Editores', logo: 'patrocinadores/alcanceeditores.png',  url: '' },
    { id: 'eclipse',         nome: 'Eclipse',          logo: 'patrocinadores/Eclipse.png',          url: '' },
  ],
  parceiros: [
    { id: 'fisiolab',   nome: 'Fisiolab',         logo: 'parceiros/fisiolab.png',            url: '' },
    { id: 'montebelo',  nome: 'Montebelo Hotéis', logo: 'parceiros/montebelo hoteis.png',   url: '' },
    { id: 'tempo',      nome: 'Tempo',            logo: 'parceiros/tempo.png',               url: '' },
    { id: 'matchpoint', nome: 'Match Point',      logo: 'parceiros/matchpoint.JPG',         url: '' },
    { id: 'fitclo',     nome: 'Fitclo',           logo: 'parceiros/fitclo.JPG',             url: '' },
    { id: 'babycity',   nome: 'Baby City',        logo: 'parceiros/babycity.JPG',           url: '' },
    { id: 'makimono',   nome: 'Makimono',         logo: 'parceiros/makimono.JPG',           url: '' },
  ],
  config: {
    tornNome: 'Torneio Reentre',
    tornSubtitulo: 'Torneio Reentre',
    tornClube: 'Sport Eventos',
    tornLocal: 'Maputo',
    tornDatas: '10 a 19 de Setembro 2026',
    tornDescFooter: 'O padel que une Moçambique.',
    tornActivo: true,
    scoreboardVisible: true,
    calendarioVisible: true,
    classificacoesVisible: true,
    fasefinalVisible: true,
    jogadoresVisible: true,
    inscricoesVisible: true,
    inscritosVisible: true,
    estatisticasVisible: true,
    regulamentoVisible: true,
    liveStatsVisible: true,
    navegarVisible: true,
    agendaVisible: true,
    leaderboardVisible: true,
    patrocinadoresVisible: true,
    parceirosVisible: true,
    bannerVisible: false,
    bannerMsg: '',
    tornTelOrg: '',
    maxDuplas: '88',
    maxJogadoresM: '120',
    maxJogadoresF: '48',
    sbRefreshMins: '15',
    sbRecentCount: '16',
  },
};

// ---- Storage helpers ----
function ppLoad(key) {
  try { const r = localStorage.getItem('pp_' + key); return r ? JSON.parse(r) : null; } catch { return null; }
}
function ppSave(key, data) { localStorage.setItem('pp_' + key, JSON.stringify(data)); }
function ppGet(key)  { return ppLoad(key) ?? JSON.parse(JSON.stringify(DEFAULTS[key] ?? [])); }

// ---- Cloud state (Supabase) ----
const PP_CLOUD = {
  url: 'https://jjtsqsumczbhfgbgjxsd.supabase.co',
  key: 'sb_publishable_LQ03yWZ4f-Mo0BYXWuinVw_kpWqbmIy',
  table: 'app_state',
  inscricoesTable: 'inscricoes',
  logsTable: 'audit_logs',
  rowId: 'playpadelcoop-main',
  keys: ['campos', 'categorias', 'grupos', 'jogadores', 'duplas', 'jogos', 'fasefinal', 'telefones', 'inscricoes', 'patrocinadores', 'parceiros', 'config'],
};
function ppCloudHeaders(prefer) {
  var token = (window.PP_AUTH && window.PP_AUTH.token) ? window.PP_AUTH.token : PP_CLOUD.key;
  var h = { 'apikey': PP_CLOUD.key, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
  if (prefer) h.Prefer = prefer;
  return h;
}
function ppCollectLocalState() {
  var out = {};
  PP_CLOUD.keys.forEach(function (k) { out[k] = ppGet(k); });
  out.users = ppLoad('users') || [];
  out.auditlog = ppLoad('auditlog') || [];
  out._updated = new Date().toISOString();
  return out;
}
function ppApplyCloudState(state) {
  if (!state || typeof state !== 'object') return;
  PP_CLOUD.keys.forEach(function (k) { if (state[k] !== undefined) ppSave(k, state[k]); });
  if (Array.isArray(state.users)) ppSave('users', state.users);
  if (Array.isArray(state.auditlog)) ppSave('auditlog', state.auditlog);
  if (state._updated) localStorage.setItem('pp__updated', state._updated);
}
async function ppCloudFetchState() {
  var endpoint = PP_CLOUD.url + '/rest/v1/' + encodeURIComponent(PP_CLOUD.table) +
    '?select=data,updated_at&id=eq.' + encodeURIComponent(PP_CLOUD.rowId) + '&limit=1';
  var r = await fetch(endpoint, { headers: ppCloudHeaders() });
  if (!r.ok) throw new Error('Cloud fetch failed: ' + r.status);
  var rows = await r.json();
  if (!Array.isArray(rows) || !rows.length) return null;
  var state = rows[0].data || {};
  if (!state._updated && rows[0].updated_at) state._updated = rows[0].updated_at;
  return state;
}
async function ppCloudPushState(stateObj) {
  // Escrever o estado do torneio exige um staff autenticado (RLS).
  if (!(window.PP_AUTH && window.PP_AUTH.token)) return false;
  var payloadState = stateObj || ppCollectLocalState();
  var endpoint = PP_CLOUD.url + '/rest/v1/' + encodeURIComponent(PP_CLOUD.table) + '?on_conflict=id';
  var body = [{
    id: PP_CLOUD.rowId,
    data: payloadState,
    updated_at: payloadState._updated || new Date().toISOString(),
  }];
  var r = await fetch(endpoint, {
    method: 'POST',
    headers: ppCloudHeaders('resolution=merge-duplicates,return=minimal'),
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error('Cloud push failed: ' + r.status);
}
async function ppCloudFetchInscricoes() {
  var endpoint = PP_CLOUD.url + '/rest/v1/' + encodeURIComponent(PP_CLOUD.inscricoesTable) + '?select=*&order=criadoem.desc';
  var r = await fetch(endpoint, { headers: ppCloudHeaders() });
  if (!r.ok) throw new Error('Cloud inscricoes fetch failed: ' + r.status);
  var rows = await r.json();
  return Array.isArray(rows) ? rows : [];
}
async function ppCloudUpsertInscricao(entry) {
  var endpoint = PP_CLOUD.url + '/rest/v1/' + encodeURIComponent(PP_CLOUD.inscricoesTable) + '?on_conflict=id';
  // A tabela tem colunas estritas — enviar campos locais (ex.: confirmadoem,
  // canceladoem, clube) que não existem na BD faz o PostgREST devolver 400.
  // Por isso enviamos apenas as colunas conhecidas.
  var COLS = ['id','criadoem','tipo','genero','categoria','nome1','nome2','telefone','email','observacoes','estado','parceiro','parid','reservado'];
  var payload = {};
  COLS.forEach(function (k) { if (Object.prototype.hasOwnProperty.call(entry, k)) payload[k] = entry[k]; });
  payload.criadoem = entry.criadoem || entry.criadoEm || null;
  var r = await fetch(endpoint, {
    method: 'POST',
    headers: ppCloudHeaders('resolution=merge-duplicates,return=minimal'),
    body: JSON.stringify([payload]),
  });
  if (!r.ok) throw new Error('Cloud inscricao upsert failed: ' + r.status);
}
async function ppCloudDeleteInscricao(id) {
  var endpoint = PP_CLOUD.url + '/rest/v1/' + encodeURIComponent(PP_CLOUD.inscricoesTable) + '?id=eq.' + encodeURIComponent(id);
  var r = await fetch(endpoint, { method: 'DELETE', headers: ppCloudHeaders('return=minimal') });
  if (!r.ok) throw new Error('Cloud inscricao delete failed: ' + r.status);
}
// ---- Registo de auditoria partilhado (audit_logs) ----
async function ppCloudInsertLog(entry) {
  // Só staff autenticado pode inserir (RLS). Sem token, guardamos só local.
  if (!(window.PP_AUTH && window.PP_AUTH.token)) return false;
  var payload = {
    user_id:  (window.PP_AUTH && window.PP_AUTH.userId) || null,
    username: entry.username || null,
    role:     entry.role || null,
    action:   entry.action || '',
    target:   entry.target || null,
    detail:   entry.detail || null,
    ts:       entry.ts || new Date().toISOString(),
  };
  var endpoint = PP_CLOUD.url + '/rest/v1/' + encodeURIComponent(PP_CLOUD.logsTable);
  var r = await fetch(endpoint, {
    method: 'POST',
    headers: ppCloudHeaders('return=minimal'),
    body: JSON.stringify([payload]),
  });
  if (!r.ok) throw new Error('Cloud log insert failed: ' + r.status);
  return true;
}
async function ppCloudFetchLogs(limit) {
  var lim = limit || 1000;
  var endpoint = PP_CLOUD.url + '/rest/v1/' + encodeURIComponent(PP_CLOUD.logsTable) +
    '?select=*&order=ts.desc&limit=' + lim;
  var r = await fetch(endpoint, { headers: ppCloudHeaders() });
  if (!r.ok) throw new Error('Cloud logs fetch failed: ' + r.status);
  var rows = await r.json();
  return Array.isArray(rows) ? rows : [];
}
// ---- Normalized relational tables (Fase 3) ----
var PP_ENTITIES = [
  // ordem = segura para FKs (pais antes de filhos)
  { key: 'categorias',     table: 'categorias',     idKey: 'id', map: function (r) { return { nome: r.nome, tipo: r.tipo, nivel: r.nivel }; } },
  { key: 'campos',         table: 'campos',         idKey: 'id', map: function (r) { return { nome: r.nome, icone: r.icone, activo: r.activo }; } },
  { key: 'jogadores',      table: 'jogadores',      idKey: 'id', map: function (r) { return { nome: r.nome, genero: r.genero || null }; } },
  { key: 'grupos',         table: 'grupos',         idKey: 'id', map: function (r) { return { cat: r.cat, letra: r.letra }; } },
  { key: 'duplas',         table: 'duplas',         idKey: 'id', map: function (r) { return { grupo: r.grupo || null, cat: r.cat || null, j1: r.j1 || null, j2: r.j2 || null }; } },
  { key: 'jogos',          table: 'jogos',          idKey: 'id', map: function (r) { return { data: r.data || null, hora: r.hora || null, campo: r.campo || null, grupo: r.grupo || null, eq1: r.eq1 || null, eq2: r.eq2 || null, resultado: r.resultado || null, estado: r.estado || null }; } },
  { key: 'patrocinadores', table: 'patrocinadores', idKey: 'id', map: function (r) { return { nome: r.nome, logo: r.logo, url: r.url, ordem: r.ordem != null ? r.ordem : null }; } },
  { key: 'parceiros',      table: 'parceiros',      idKey: 'id', map: function (r) { return { nome: r.nome, logo: r.logo, url: r.url, ordem: r.ordem != null ? r.ordem : null }; } },
];

async function ppTableUpsert(table, rows, conflictCol) {
  if (!rows || !rows.length) return;
  var ep = PP_CLOUD.url + '/rest/v1/' + table + '?on_conflict=' + (conflictCol || 'id');
  var r = await fetch(ep, { method: 'POST', headers: ppCloudHeaders('resolution=merge-duplicates,return=minimal'), body: JSON.stringify(rows) });
  if (!r.ok) throw new Error('upsert ' + table + ' ' + r.status + ' ' + (await r.text()));
}

// Apaga apenas as linhas que já não existem localmente (diff preciso, em lotes)
async function ppTableDeleteMissing(table, localIds, idCol) {
  idCol = idCol || 'id';
  var r = await fetch(PP_CLOUD.url + '/rest/v1/' + table + '?select=' + idCol, { headers: ppCloudHeaders() });
  if (!r.ok) throw new Error('list ' + table + ' ' + r.status);
  var existing = (await r.json()).map(function (x) { return String(x[idCol]); });
  var localSet = {}; (localIds || []).forEach(function (id) { localSet[String(id)] = 1; });
  var stale = existing.filter(function (id) { return !localSet[id]; });
  for (var i = 0; i < stale.length; i += 50) {
    var batch = stale.slice(i, i + 50).map(function (v) { return '"' + v.replace(/"/g, '') + '"'; }).join(',');
    var ep = PP_CLOUD.url + '/rest/v1/' + table + '?' + idCol + '=in.(' + encodeURIComponent(batch) + ')';
    var dr = await fetch(ep, { method: 'DELETE', headers: ppCloudHeaders('return=minimal') });
    if (!dr.ok) throw new Error('delete ' + table + ' ' + dr.status);
  }
}

async function ppTablePull(table) {
  var r = await fetch(PP_CLOUD.url + '/rest/v1/' + table + '?select=raw', { headers: ppCloudHeaders() });
  if (!r.ok) throw new Error('pull ' + table + ' ' + r.status);
  return (await r.json()).map(function (x) { return x.raw; });
}

// Singletons (fasefinal / telefones / config)
async function ppPullMap(table, keyCol, valCol) {
  var r = await fetch(PP_CLOUD.url + '/rest/v1/' + table + '?select=' + keyCol + ',' + valCol, { headers: ppCloudHeaders() });
  if (!r.ok) throw new Error('pull ' + table + ' ' + r.status);
  var out = {}; (await r.json()).forEach(function (x) { out[x[keyCol]] = x[valCol]; }); return out;
}
async function ppUpsertMap(table, keyCol, valCol, obj, deleteMissing) {
  var keys = Object.keys(obj || {});
  var rows = keys.map(function (k) { var o = {}; o[keyCol] = k; o[valCol] = obj[k]; return o; });
  await ppTableUpsert(table, rows, keyCol);
  if (deleteMissing) await ppTableDeleteMissing(table, keys, keyCol);
}

function ppApplyNormalizedState(state) {
  PP_ENTITIES.forEach(function (e) { if (Array.isArray(state[e.key])) ppSave(e.key, state[e.key]); });
  if (state.fasefinal) ppSave('fasefinal', state.fasefinal);
  if (state.telefones) ppSave('telefones', state.telefones);
  if (state.config && Object.keys(state.config).length) {
    var merged = Object.assign({}, DEFAULTS.config, ppLoad('config') || {}, state.config);
    ppSave('config', merged);
  }
}

async function ppNormalizedPull() {
  var results = await Promise.all(PP_ENTITIES.map(function (e) { return ppTablePull(e.table); }));
  var state = {};
  PP_ENTITIES.forEach(function (e, i) { state[e.key] = results[i]; });
  var trio = await Promise.all([
    ppPullMap('fasefinal', 'categoria_id', 'data'),
    ppPullMap('telefones', 'nome', 'numero'),
    ppPullMap('config', 'key', 'value'),
  ]);
  state.fasefinal = trio[0];
  state.telefones = trio[1];
  state.config = trio[2];
  var hasAny = PP_ENTITIES.some(function (e) { return (state[e.key] || []).length; })
    || Object.keys(state.fasefinal).length || Object.keys(state.telefones).length || Object.keys(state.config).length;
  return hasAny ? state : null;
}

async function ppNormalizedPush(state) {
  // upserts (ordem pai->filho)
  for (var i = 0; i < PP_ENTITIES.length; i++) {
    var e = PP_ENTITIES[i];
    var arr = state[e.key] || [];
    var rows = arr.map(function (r) { var o = e.map(r); o.id = String(r[e.idKey]); o.raw = r; return o; });
    await ppTableUpsert(e.table, rows, 'id');
  }
  await ppUpsertMap('fasefinal', 'categoria_id', 'data', state.fasefinal || {}, false);
  await ppUpsertMap('telefones', 'nome', 'numero', state.telefones || {}, false);
  await ppUpsertMap('config', 'key', 'value', state.config || {}, false);
  // delete-missing (ordem filho->pai)
  var rev = PP_ENTITIES.slice().reverse();
  for (var k = 0; k < rev.length; k++) {
    var e2 = rev[k];
    var ids = (state[e2.key] || []).map(function (r) { return String(r[e2.idKey]); });
    await ppTableDeleteMissing(e2.table, ids, 'id');
  }
  await ppTableDeleteMissing('fasefinal', Object.keys(state.fasefinal || {}), 'categoria_id');
  await ppTableDeleteMissing('telefones', Object.keys(state.telefones || {}), 'nome');
}

window.ppCloudState = {
  enabled: true,
  collectLocalState: ppCollectLocalState,
  pullToLocal: async function () {
    // 1) Tabelas normalizadas (fonte de verdade)
    try {
      var state = await ppNormalizedPull();
      if (state) {
        ppApplyNormalizedState(state);
        window.dispatchEvent(new CustomEvent('pp:datasynced', { detail: state }));
        return true;
      }
    } catch (e) { /* cai para o backup app_state */ }
    // 2) Fallback: blob app_state
    try {
      var legacy = await ppCloudFetchState();
      if (legacy) {
        ppApplyCloudState(legacy);
        window.dispatchEvent(new CustomEvent('pp:datasynced', { detail: legacy }));
        return true;
      }
    } catch (e2) {}
    return false;
  },
  pushFromLocal: async function () {
    // Escrever exige staff autenticado (RLS)
    if (!(window.PP_AUTH && window.PP_AUTH.token)) return false;
    var state = ppCollectLocalState();
    // Salvaguarda: nunca reconciliar (apagar) a partir de um estado local em branco
    var totalRows = PP_ENTITIES.reduce(function (n, e) { return n + ((state[e.key] || []).length); }, 0)
      + Object.keys(state.fasefinal || {}).length + Object.keys(state.telefones || {}).length;
    if (totalRows === 0) return false;
    var err = null;
    try { await ppNormalizedPush(state); }
    catch (e) { err = e; }
    // Backup: blob app_state (mantém users/auditlog e serve de rede de segurança)
    try { await ppCloudPushState(state); localStorage.setItem('pp__updated', state._updated); } catch (e2) { if (!err) err = e2; }
    if (err) throw err;
    return true;
  },
  fetchInscricoes: ppCloudFetchInscricoes,
  upsertInscricao: ppCloudUpsertInscricao,
  deleteInscricao: ppCloudDeleteInscricao,
};

// ---- Utilitários de data ----
function ppFormatDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${parseInt(day)} ${meses[parseInt(m)-1]}`;
}

// ── Remote data sync (Supabase state) ───────────────────────────────────────
// Pulls a single JSON state row from Supabase and populates localStorage.
// Fallback: if cloud state is unavailable, reads local data.json once.
(function () {
  if (typeof window === 'undefined') return;
  if (window.location.protocol === 'file:') return; // skip when opened locally
  window.ppDataReady = (async function () {
    try {
      var pulled = await window.ppCloudState.pullToLocal();
      if (pulled) return true;
    } catch (_) {}
    try {
      var r = await fetch('data.json?_=' + Date.now());
      if (!r.ok) return false;
      var d = await r.json();
      ppApplyCloudState(d);
      window.dispatchEvent(new CustomEvent('pp:datasynced', { detail: d }));
      try { await window.ppCloudState.pushFromLocal(); } catch (_) {}
      return true;
    } catch (_) {
      return false;
    }
  }());
}());

function ppWeekday(d) {
  if (!d) return '';
  const dias = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  return dias[new Date(d + 'T12:00:00').getDay()];
}
