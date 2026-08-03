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
  config: {
    tornNome: 'Torneio Reentre',
    tornSubtitulo: 'Torneio Reentre',
    tornClube: 'Sport Eventos',
    tornLocal: 'Maputo',
    tornDatas: '10 a 19 de Setembro 2026',
    tornDescFooter: 'O padel que une Moçambique.',
    tornActivo: true,
    scoreboardVisible: true,
    classificacoesVisible: true,
    fasefinalVisible: true,
    estatisticasVisible: true,
    bannerVisible: false,
    bannerMsg: '',
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

// ---- Utilitários de data ----
function ppFormatDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${parseInt(day)} ${meses[parseInt(m)-1]}`;
}

// ── Remote data sync (Option A — GitHub Pages) ─────────────────────────────
// Fetches data.json from the deployed site, populates localStorage,
// then fires 'pp:datasynced' so public pages can re-render with live data.
(function () {
  if (typeof window === 'undefined') return;
  if (window.location.protocol === 'file:') return; // skip when opened locally
  var KEYS = ['campos', 'categorias', 'grupos', 'jogadores', 'duplas', 'jogos', 'fasefinal', 'telefones', 'inscricoes', 'users', 'config'];

  // On admin: always fetch, but only overwrite local data if remote _updated is newer.
  // Exception: 'users' is always updated from remote to ensure synced users are available on login.
  if (window.location.pathname.includes('admin') && localStorage.getItem('pp_jogos') !== null) {
    window.ppDataReady = fetch('data.json?_=' + Date.now())
      .then(function (r) { return r.ok ? r.json() : Promise.reject('404'); })
      .then(function (d) {
        // Merge remote users into local: preserve locally-created users (not yet pushed),
        // but add any remote users that don't exist locally (created on another device).
        if (Array.isArray(d['users']) && d['users'].length) {
          try {
            var localUsers  = JSON.parse(localStorage.getItem('pp_users') || '[]');
            var localIds    = new Set(localUsers.map(function(u) { return u.id; }));
            var deletedIds  = new Set(JSON.parse(localStorage.getItem('pp_users_deleted') || '[]'));
            // For users that exist in both: remote wins for auth fields (salt/passwordHash/active)
            // so password changes on one device propagate to all others.
            // For users only remote: add unless in tombstone.
            var remoteMap = {};
            d['users'].forEach(function(u) { remoteMap[u.id] = u; });
            var merged = localUsers.map(function(u) {
              var r = remoteMap[u.id];
              if (!r) return u;
              return Object.assign({}, u, { salt: r.salt, passwordHash: r.passwordHash, active: r.active, role: r.role, name: r.name });
            }).concat(d['users'].filter(function(u) {
              return !localIds.has(u.id) && !deletedIds.has(u.id);
            }));
            ppSave('users', merged);
          } catch(e) { ppSave('users', d['users']); }
        }
        // Always merge remote audit logs (deduplicate by id) so all devices see all actions
        if (Array.isArray(d.auditlog) && d.auditlog.length) {
          try {
            var localLogs = JSON.parse(localStorage.getItem('pp_auditlog') || '[]');
            var localIds  = new Set(localLogs.map(function(l) { return l.id; }));
            var merged    = localLogs.concat(d.auditlog.filter(function(r) { return !localIds.has(r.id); }));
            merged.sort(function(a, b) { return a.ts < b.ts ? 1 : -1; });
            localStorage.setItem('pp_auditlog', JSON.stringify(merged.slice(0, 1000)));
          } catch(e) {}
        }
        var stored = localStorage.getItem('pp__updated') || '0';
        var remote = d._updated || '0';
        if (remote > stored) {
          KEYS.forEach(function (k) { if (k !== 'users' && d[k] !== undefined) ppSave(k, d[k]); });
          localStorage.setItem('pp__updated', remote);
          window.dispatchEvent(new CustomEvent('pp:datasynced', { detail: d }));
        }
        return true;
      })
      .catch(function () { return false; });
    return;
  }

  window.ppDataReady = fetch('data.json?_=' + Date.now())
    .then(function (r) { return r.ok ? r.json() : Promise.reject('404'); })
    .then(function (d) {
      KEYS.forEach(function (k) {
        if (d[k] !== undefined) ppSave(k, d[k]);
      });
      if (d._updated) localStorage.setItem('pp__updated', d._updated);
      window.dispatchEvent(new CustomEvent('pp:datasynced', { detail: d }));
      return true;
    })
    .catch(function () { return false; });
}());

function ppWeekday(d) {
  if (!d) return '';
  const dias = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  return dias[new Date(d + 'T12:00:00').getDay()];
}
