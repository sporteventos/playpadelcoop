'use strict';
/* ================================================================
   PlayPadel · auth.js  (Fase 2 — Supabase Auth)
   Mantém a API pública do módulo Auth (síncrona para o admin.js)
   mas autentica contra o Supabase e guarda papéis na tabela
   `profiles`. Um "snapshot" síncrono da sessão fica em
   sessionStorage para que me()/isAdmin()/hasRole()/getUsers()
   continuem a funcionar sem alterar as dezenas de chamadas.
   Roles: 'admin' | 'operator'
   ================================================================ */

const Auth = (() => {

  // ── Config Supabase ───────────────────────────────────────────
  const SUPA_URL = 'https://jjtsqsumczbhfgbgjxsd.supabase.co';
  const SUPA_KEY = 'sb_publishable_LQ03yWZ4f-Mo0BYXWuinVw_kpWqbmIy';

  const K_SESSION = 'pp_session';    // snapshot síncrono (sessionStorage)
  const K_LOGS    = 'pp_auditlog';   // registo de auditoria (local)
  const TIMEOUT_MS = 45 * 60 * 1000; // 45 min de inactividade
  const WARN_MS    = 5  * 60 * 1000; // aviso 5 min antes

  // Cliente Supabase principal (sessão persistente + refresh automático)
  const sb = window.supabase.createClient(SUPA_URL, SUPA_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'pp_sb_auth' }
  });
  window.ppSb = sb;

  // ── Estado em memória ─────────────────────────────────────────
  let _snapshot   = _readSnap();  // sessão actual (síncrona)
  let _usersCache = [];           // lista de profiles (para getUsers)

  function _readSnap() {
    try { return JSON.parse(sessionStorage.getItem(K_SESSION)); }
    catch (e) { return null; }
  }
  function _writeSnap(s) {
    _snapshot = s || null;
    if (s) sessionStorage.setItem(K_SESSION, JSON.stringify(s));
    else   sessionStorage.removeItem(K_SESSION);
  }

  // Token partilhado com data.js para as escritas autenticadas (RLS)
  function _publishToken(session) {
    window.PP_AUTH = session
      ? { token: session.access_token, userId: session.user.id }
      : null;
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  }

  // ── Perfil (papel/categorias) ─────────────────────────────────
  async function _fetchProfile(userId) {
    const { data, error } = await sb
      .from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) throw error;
    return data;
  }

  function _snapFromProfile(session, profile) {
    return {
      id:           session.user.id,
      username:     profile?.username || session.user.email,
      email:        session.user.email,
      name:         profile?.name || session.user.email,
      role:         profile?.role || 'operator',
      categories:   profile?.categories || [],
      active:       profile?.active !== false,
      loginAt:      new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    };
  }

  // ── Acessores síncronos (a partir do snapshot) ────────────────
  function me()               { return _snapshot; }
  function isAuth()           { return !!_snapshot; }
  function isAdmin()          { return _snapshot?.role === 'admin'; }
  function hasRole(...roles)  { return roles.includes(_snapshot?.role); }

  function canAccessCategory(catId) {
    const u = _snapshot;
    if (!u) return false;
    if (u.role === 'admin') return true;
    if (!u.categories || u.categories.length === 0) return true;
    return u.categories.includes(catId);
  }

  // ── Registo de auditoria (local, inalterado) ──────────────────
  function _read(key)  { try { return JSON.parse(localStorage.getItem(key)) || []; } catch (e) { return []; } }
  function _write(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

  function log(action, target, detail) {
    const u    = _snapshot;
    const logs = _read(K_LOGS);
    const entry = {
      id:       uid(),
      userId:   u?.id       || 'system',
      username: u?.username || 'system',
      role:     u?.role     || '-',
      action,
      target:   target || '',
      detail:   detail || '',
      ts:       new Date().toISOString(),
    };
    logs.unshift(entry);
    _write(K_LOGS, logs.slice(0, 1000));
    // Write-through best-effort para o registo partilhado (audit_logs).
    // Falhas (ex.: sem sessão) são ignoradas — o log local mantém-se.
    try {
      if (typeof window.ppCloudInsertLog === 'function') {
        window.ppCloudInsertLog(entry).catch(function () {});
      }
    } catch (e) { /* ignore */ }
  }
  function getLogs() { return _read(K_LOGS); }

  // ── Login / Restore / Logout ──────────────────────────────────
  function _authErr(error) {
    const m = (error?.message || '').toLowerCase();
    if (m.includes('invalid login'))    return 'Email ou palavra-passe incorrectos.';
    if (m.includes('email not confirmed')) return 'Email não confirmado. Contacte o administrador.';
    return error?.message || 'Falha na autenticação.';
  }

  async function login(email, password) {
    const { data, error } = await sb.auth.signInWithPassword({
      email: (email || '').trim(), password
    });
    if (error) return { ok: false, error: _authErr(error) };

    const session = data.session;
    let profile = null;
    try { profile = await _fetchProfile(session.user.id); } catch (e) { profile = null; }

    if (!profile) {
      await sb.auth.signOut();
      return { ok: false, error: 'Sem permissões de acesso. Contacte o administrador.' };
    }
    if (profile.active === false) {
      await sb.auth.signOut();
      return { ok: false, error: 'Conta desactivada. Contacte o administrador.' };
    }

    _publishToken(session);
    _writeSnap(_snapFromProfile(session, profile));
    log('LOGIN', 'auth', `Login: ${_snapshot.username} (${_snapshot.role})`);
    return { ok: true, user: _snapshot };
  }

  // Restaura a sessão persistida (chamar no arranque, antes de isAuth())
  async function restore() {
    let session = null;
    try { session = (await sb.auth.getSession()).data?.session || null; } catch (e) { session = null; }
    if (!session) { _publishToken(null); _writeSnap(null); return false; }

    let profile = null;
    try { profile = await _fetchProfile(session.user.id); } catch (e) { profile = null; }
    if (!profile || profile.active === false) {
      await sb.auth.signOut();
      _publishToken(null); _writeSnap(null);
      return false;
    }

    _publishToken(session);
    const snap = _snapFromProfile(session, profile);
    const prev = _readSnap();
    if (prev && prev.id === snap.id) {
      snap.loginAt      = prev.loginAt      || snap.loginAt;
      snap.lastActivity = prev.lastActivity || snap.lastActivity;
    }
    _writeSnap(snap);
    return true;
  }

  async function logout() {
    if (_snapshot) log('LOGOUT', 'auth', `Logout: ${_snapshot.username}`);
    try { await sb.auth.signOut(); } catch (e) {}
    _publishToken(null);
    _writeSnap(null);
  }

  // ── Utilizadores (tabela profiles) ────────────────────────────
  async function refreshUsers() {
    const { data, error } = await sb
      .from('profiles').select('*').order('created_at', { ascending: true });
    if (!error && Array.isArray(data)) {
      _usersCache = data.map(p => ({
        id:         p.id,
        username:   p.username,
        name:       p.name,
        role:       p.role,
        categories: p.categories || [],
        active:     p.active,
        createdAt:  p.created_at,
      }));
    }
    return _usersCache;
  }
  function getUsers() { return _usersCache; }

  function _signupErr(error) {
    const m = (error?.message || '').toLowerCase();
    if (m.includes('already registered') || m.includes('already been registered'))
      return 'Já existe uma conta com esse email.';
    if (m.includes('password'))  return 'Palavra-passe demasiado fraca (mínimo 6 caracteres).';
    if (m.includes('signups not allowed') || m.includes('signup is disabled'))
      return 'O registo está desactivado no Supabase. Activa "Allow new users to sign up".';
    return error?.message || 'Não foi possível criar a conta.';
  }

  // Cria a conta de login (signUp num cliente secundário para não
  // rebentar a sessão do admin) e o respectivo profile.
  async function createUser(username, name, role, password, categories) {
    const mail = (username || '').trim();
    if (!mail || !name || !role || !password)
      return { ok: false, error: 'Todos os campos são obrigatórios.' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail))
      return { ok: false, error: 'O utilizador deve ser um email válido.' };

    const tmp = window.supabase.createClient(SUPA_URL, SUPA_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data, error } = await tmp.auth.signUp({ email: mail, password });
    if (error) return { ok: false, error: _signupErr(error) };

    const newId = data.user?.id;
    if (!newId)
      return { ok: false, error: 'Conta não criada — desactiva "Confirm email" no Supabase.' };

    const { error: pErr } = await sb.from('profiles').insert({
      id:         newId,
      username:   mail,
      name:       name.trim(),
      role,
      categories: role === 'operator' ? (categories || []) : [],
      active:     true,
    });
    if (pErr) return { ok: false, error: 'Conta criada mas o perfil falhou: ' + pErr.message };

    log('CREATE_USER', 'utilizadores', `Criado "${mail}" (${role})`);
    await refreshUsers();
    return { ok: true };
  }

  async function updateUser(id, changes) {
    const patch = {};
    if (changes.username   != null) patch.username   = changes.username;
    if (changes.name       != null) patch.name       = changes.name;
    if (changes.role       != null) patch.role       = changes.role;
    if (changes.categories != null) patch.categories = changes.categories;
    if (changes.active     != null) patch.active     = changes.active;

    if (Object.keys(patch).length) {
      const { error } = await sb.from('profiles').update(patch).eq('id', id);
      if (error) return { ok: false, error: error.message };
    }

    if (changes.password) {
      // A chave pública só permite alterar a própria palavra-passe.
      if (_snapshot && _snapshot.id === id) {
        const { error } = await sb.auth.updateUser({ password: changes.password });
        if (error) return { ok: false, error: error.message };
      } else {
        return { ok: false, error: 'Só podes alterar a tua própria palavra-passe. O utilizador deve usar "Esqueci-me da palavra-passe".' };
      }
    }

    log('UPDATE_USER', 'utilizadores', `Actualizado id=${id}`);
    await refreshUsers();
    return { ok: true };
  }

  async function toggleUser(id) {
    const u = _usersCache.find(x => x.id === id);
    if (!u) return { ok: false, error: 'Não encontrado.' };
    const next = !u.active;
    const { error } = await sb.from('profiles').update({ active: next }).eq('id', id);
    if (error) return { ok: false, error: error.message };
    log(next ? 'ENABLE_USER' : 'DISABLE_USER', 'utilizadores',
        `"${u.username}" ${next ? 'activado' : 'desactivado'}`);
    await refreshUsers();
    return { ok: true, active: next };
  }

  async function deleteUser(id) {
    const u = _usersCache.find(x => x.id === id);
    // A remoção da conta de login exige service_role; aqui removemos o
    // profile (o que revoga o acesso — sem perfil não passa no is_staff()).
    const { error } = await sb.from('profiles').delete().eq('id', id);
    if (error) return { ok: false, error: error.message };
    log('DELETE_USER', 'utilizadores', `Eliminado "${u?.username || id}"`);
    await refreshUsers();
    return { ok: true };
  }

  // Alterar a própria palavra-passe (verifica a actual por re-auth)
  async function changePassword(oldPass, newPass) {
    if (!_snapshot) return { ok: false, error: 'Sessão inválida.' };
    const { error: vErr } = await sb.auth.signInWithPassword({
      email: _snapshot.email, password: oldPass
    });
    if (vErr) return { ok: false, error: 'Palavra-passe actual incorrecta.' };
    const { error } = await sb.auth.updateUser({ password: newPass });
    if (error) return { ok: false, error: error.message };
    log('CHANGE_PASSWORD', 'auth', `Palavra-passe alterada: ${_snapshot.username}`);
    return { ok: true };
  }

  // ── Sessões (só a actual; multi-dispositivo não é listável no cliente) ──
  function getSessions() {
    if (!_snapshot) return [];
    return [{
      sessionId:    _snapshot.id,
      id:           _snapshot.id,
      username:     _snapshot.username,
      name:         _snapshot.name,
      role:         _snapshot.role,
      loginAt:      _snapshot.loginAt,
      lastActivity: _snapshot.lastActivity,
    }];
  }
  function forceLogout() { return { ok: true }; }

  // ── Timeout de inactividade ───────────────────────────────────
  let _timeoutTimer = null, _warnTimer = null, _onWarn = null, _onExpire = null;

  function updateActivity() {
    if (!_snapshot) return;
    _snapshot.lastActivity = new Date().toISOString();
    _writeSnap(_snapshot);
  }

  function startTimeoutWatch(onWarn, onExpire) {
    _onWarn = onWarn; _onExpire = onExpire;
    _reschedule();
  }

  function _reschedule() {
    clearTimeout(_timeoutTimer);
    clearTimeout(_warnTimer);
    const s = _snapshot;
    if (!s) return;
    const last      = new Date(s.lastActivity).getTime();
    const remaining = TIMEOUT_MS - (Date.now() - last);
    if (remaining <= 0) { _onExpire && _onExpire(); return; }
    const warnIn = remaining - WARN_MS;
    if (warnIn > 0) _warnTimer = setTimeout(() => { _onWarn && _onWarn(Math.ceil(WARN_MS / 60000)); }, warnIn);
    _timeoutTimer = setTimeout(() => { _onExpire && _onExpire(); }, remaining);
  }

  function resetTimeout() { updateActivity(); _reschedule(); }

  // ── Compatibilidade (já não fazem nada de útil) ───────────────
  function ensureDefaults() { /* contas vivem no Supabase */ }
  function verifyPassword() { return true; } // usar changePassword()

  // ── API pública ───────────────────────────────────────────────
  return {
    me, isAuth, isAdmin, hasRole, canAccessCategory,
    login, logout, restore,
    updateActivity, resetTimeout, startTimeoutWatch,
    getUsers, refreshUsers, createUser, updateUser, toggleUser, deleteUser,
    getSessions, forceLogout,
    getLogs, log,
    ensureDefaults, verifyPassword, changePassword,
    TIMEOUT_MS, WARN_MS,
  };

})();
