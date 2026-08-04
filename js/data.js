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
  rowId: 'playpadelcoop-main',
  keys: ['campos', 'categorias', 'grupos', 'jogadores', 'duplas', 'jogos', 'fasefinal', 'telefones', 'inscricoes', 'patrocinadores', 'parceiros', 'config'],
};
function ppCloudHeaders(prefer) {
  var h = { 'apikey': PP_CLOUD.key, 'Authorization': 'Bearer ' + PP_CLOUD.key, 'Content-Type': 'application/json' };
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
  var payload = Object.assign({}, entry, { criadoem: entry.criadoem || entry.criadoEm || null });
  if (Object.prototype.hasOwnProperty.call(payload, 'criadoEm')) delete payload.criadoEm;
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
window.ppCloudState = {
  enabled: true,
  collectLocalState: ppCollectLocalState,
  pullToLocal: async function() {
    var state = await ppCloudFetchState();
    if (state) {
      ppApplyCloudState(state);
      window.dispatchEvent(new CustomEvent('pp:datasynced', { detail: state }));
      return true;
    }
    return false;
  },
  pushFromLocal: async function() {
    var state = ppCollectLocalState();
    await ppCloudPushState(state);
    localStorage.setItem('pp__updated', state._updated);
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
