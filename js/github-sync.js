/* =============================================================
   GitHub Sync — Option A backend
   Pushes all tournament data to data.json in the GitHub repo.
   Public pages fetch data.json on load for live shared state.
   ============================================================= */

const GHSync = (() => {
  const CFG_KEY = 'pp_ghsync_cfg';
  const DIRTY_KEY = 'pp_ghsync_dirty';

  // ── Config ──────────────────────────────────────────────────
  function getCfg() {
    try { return JSON.parse(localStorage.getItem(CFG_KEY)) || {}; } catch(e) { return {}; }
  }
  function setCfg(c) { localStorage.setItem(CFG_KEY, JSON.stringify(c)); }
  function isConfigured() {
    const c = getCfg();
    return !!(c.owner && c.repo && c.token);
  }

  // ── Dirty tracking ──────────────────────────────────────────
  function markDirty()   { localStorage.setItem(DIRTY_KEY, '1'); document.dispatchEvent(new Event('ghsync:dirty')); }
  function markClean()   { localStorage.removeItem(DIRTY_KEY);   document.dispatchEvent(new Event('ghsync:clean')); }
  function isDirty()     { return !!localStorage.getItem(DIRTY_KEY); }

  // ── Collect all tournament data from localStorage ───────────
  function getAllData() {
    return {
      campos:     getData('campos'),
      categorias: getData('categorias'),
      grupos:     getData('grupos'),
      jogadores:  getData('jogadores'),
      duplas:     getData('duplas'),
      jogos:      getData('jogos'),
      fasefinal:  getData('fasefinal'),
      telefones:  getData('telefones'),
      users:      Auth.getUsers(),
      auditlog:   Auth.getLogs(),
      _updated:   new Date().toISOString()
    };
  }

  // ── GitHub API helper — get current file SHA ────────────────
  async function _getSha(owner, repo, path, token) {
    try {
      const r = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' } }
      );
      if (r.ok) return (await r.json()).sha || null;
    } catch(e) {}
    return null;
  }

  // ── Push data.json to GitHub ─────────────────────────────────
  async function push(dataObj) {
    const c = getCfg();
    if (!c.owner || !c.repo || !c.token) {
      throw new Error('GitHub Sync não configurado. Use Admin → Sync → Configurar.');
    }
    const { owner, repo, token } = c;
    const branch = c.branch || 'main';
    const path   = 'data.json';

    const payloadData = dataObj || getAllData();
    const payload = JSON.stringify(payloadData, null, 2);
    // UTF-8-safe base64 encode
    const b64 = btoa(unescape(encodeURIComponent(payload)));
    const sha  = await _getSha(owner, repo, path, token);

    const body = {
      message: `data: sync ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`,
      content: b64,
      branch
    };
    if (sha) body.sha = sha;

    const resp = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          Authorization:  `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept:         'application/vnd.github.v3+json'
        },
        body: JSON.stringify(body)
      }
    );

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.message || `Erro HTTP ${resp.status}`);
    }
    markClean();
    // Record the pushed _updated so admin won't re-import its own push on next reload
    if (payloadData._updated) localStorage.setItem('pp__updated', payloadData._updated);
    return true;
  }

  return { getCfg, setCfg, isConfigured, getAllData, push, markDirty, markClean, isDirty };
})();
