'use strict';
/* ================================================================
   PlayPadel · auth.js
   Client-side RBAC module (localStorage persistence)
   Roles: 'admin' | 'operator'
   ================================================================ */

const Auth = (() => {

  // ── Storage keys ──────────────────────────────────────────────
  const K_USERS    = 'pp_users';
  const K_SESSIONS = 'pp_sessions';
  const K_LOGS     = 'pp_auditlog';
  const K_SESSION  = 'pp_session';   // sessionStorage only
  const TIMEOUT_MS = 45 * 60 * 1000; // 45 minutes
  const WARN_MS    = 5  * 60 * 1000; // warn 5 min before

  // ── Internal helpers ──────────────────────────────────────────
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  }

  // FNV-1a 32-bit (one pass) — used for multi-round stretching
  function _fnv(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16).padStart(8, '0');
  }

  // Password hash: FNV-1a with 5 000 iterations + salt
  function hashPwd(password, salt) {
    let v = salt + ':' + password;
    for (let i = 0; i < 5000; i++) {
      v = _fnv(v + password + salt + i);
    }
    return v;
  }

  // ── Storage accessors ─────────────────────────────────────────
  function _read(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch (e) { return []; }
  }

  function _write(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }

  // ── Current session (sessionStorage) ─────────────────────────
  function me() {
    try { return JSON.parse(sessionStorage.getItem(K_SESSION)); }
    catch (e) { return null; }
  }

  function isAuth()           { return !!me(); }
  function isAdmin()          { return me()?.role === 'admin'; }
  function hasRole(...roles)  { return roles.includes(me()?.role); }

  // Can the current user manage this category? (admin = all; operator = their allowed cats)
  function canAccessCategory(catId) {
    const u = me();
    if (!u) return false;
    if (u.role === 'admin') return true;
    const user = getUsers().find(x => x.id === u.id);
    if (!user) return false;
    // If no category restriction set, operator can access all
    if (!user.categories || user.categories.length === 0) return true;
    return user.categories.includes(catId);
  }

  // ── Audit log ─────────────────────────────────────────────────
  function log(action, target, detail) {
    const u    = me();
    const logs = _read(K_LOGS);
    logs.unshift({
      id:       uid(),
      userId:   u?.id       || 'system',
      username: u?.username || 'system',
      role:     u?.role     || '-',
      action,
      target:   target || '',
      detail:   detail || '',
      ts:       new Date().toISOString(),
    });
    _write(K_LOGS, logs.slice(0, 1000));
  }

  function getLogs() { return _read(K_LOGS); }

  // ── Users ─────────────────────────────────────────────────────
  function getUsers() { return _read(K_USERS); }

  function createUser(username, name, role, password, categories) {
    const users = getUsers();
    if (!username || !name || !role || !password)
      return { ok: false, error: 'Todos os campos são obrigatórios.' };
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase()))
      return { ok: false, error: 'Username já existe.' };
    const salt = uid() + uid();
    const u = {
      id:           uid(),
      username:     username.trim(),
      name:         name.trim(),
      role,
      salt,
      passwordHash: hashPwd(password, salt),
      active:       true,
      categories:   categories || [],   // [] = all categories
      createdAt:    new Date().toISOString(),
      createdBy:    me()?.username || 'system',
    };
    users.push(u);
    _write(K_USERS, users);
    log('CREATE_USER', 'utilizadores', `Criado "${username}" (${role})`);
    return { ok: true, user: u };
  }

  function updateUser(id, changes) {
    const users = getUsers();
    const i = users.findIndex(u => u.id === id);
    if (i === -1) return { ok: false, error: 'Utilizador não encontrado.' };

    // Check username uniqueness if changed
    if (changes.username && changes.username.toLowerCase() !== users[i].username.toLowerCase()) {
      if (users.find(u => u.username.toLowerCase() === changes.username.toLowerCase()))
        return { ok: false, error: 'Username já existe.' };
    }
    // Block role demotion of main admin
    if (users[i].username === 'admin' && changes.role && changes.role !== 'admin')
      return { ok: false, error: 'Não é possível alterar o role do admin principal.' };

    if (changes.password) {
      users[i].salt         = uid() + uid();
      users[i].passwordHash = hashPwd(changes.password, users[i].salt);
      delete changes.password;
    }
    Object.assign(users[i], changes);
    _write(K_USERS, users);
    log('UPDATE_USER', 'utilizadores', `Actualizado "${users[i].username}"`);
    return { ok: true };
  }

  function toggleUser(id) {
    const users = getUsers();
    const u = users.find(u => u.id === id);
    if (!u) return { ok: false, error: 'Não encontrado.' };
    if (u.username === 'admin')
      return { ok: false, error: 'Não é possível desactivar o admin principal.' };
    u.active = !u.active;
    _write(K_USERS, users);
    log(u.active ? 'ENABLE_USER' : 'DISABLE_USER', 'utilizadores',
        `"${u.username}" ${u.active ? 'activado' : 'desactivado'}`);
    return { ok: true, active: u.active };
  }

  function deleteUser(id) {
    const users = getUsers();
    const u = users.find(u => u.id === id);
    if (!u) return { ok: false, error: 'Não encontrado.' };
    if (u.username === 'admin')
      return { ok: false, error: 'Não é possível eliminar o admin principal.' };
    _write(K_USERS, users.filter(x => x.id !== id));
    log('DELETE_USER', 'utilizadores', `Eliminado "${u.username}"`);
    return { ok: true };
  }

  // ── Sessions ──────────────────────────────────────────────────
  function getSessions() {
    // Prune sessions with no activity in the last 24 h
    const cutoff = Date.now() - 24 * 3600 * 1000;
    const sessions = _read(K_SESSIONS).filter(
      s => new Date(s.lastActivity).getTime() > cutoff
    );
    _write(K_SESSIONS, sessions);
    return sessions;
  }

  function updateActivity() {
    const s = me();
    if (!s) return;
    const sessions = _read(K_SESSIONS);
    const i = sessions.findIndex(x => x.sessionId === s.sessionId);
    if (i !== -1) {
      sessions[i].lastActivity = new Date().toISOString();
      _write(K_SESSIONS, sessions);
    }
  }

  function forceLogout(sessionId) {
    const sessions = _read(K_SESSIONS);
    const s = sessions.find(x => x.sessionId === sessionId);
    _write(K_SESSIONS, sessions.filter(x => x.sessionId !== sessionId));
    if (s) log('FORCE_LOGOUT', 'sessoes', `Sessão encerrada: ${s.username}`);
    return { ok: true };
  }

  // ── Session Timeout ───────────────────────────────────────────
  let _timeoutTimer   = null;
  let _warnTimer      = null;
  let _onWarn         = null;
  let _onExpire       = null;

  function startTimeoutWatch(onWarn, onExpire) {
    _onWarn   = onWarn;
    _onExpire = onExpire;
    _reschedule();
  }

  function _reschedule() {
    clearTimeout(_timeoutTimer);
    clearTimeout(_warnTimer);
    const s = me();
    if (!s) return;
    const last  = new Date(s.lastActivity).getTime();
    const now   = Date.now();
    const elapsed = now - last;
    const remaining = TIMEOUT_MS - elapsed;
    if (remaining <= 0) { _onExpire && _onExpire(); return; }
    const warnIn = remaining - WARN_MS;
    if (warnIn > 0) _warnTimer = setTimeout(() => { _onWarn && _onWarn(Math.ceil(WARN_MS / 60000)); }, warnIn);
    _timeoutTimer = setTimeout(() => { _onExpire && _onExpire(); }, remaining);
  }

  function resetTimeout() {
    updateActivity();
    _reschedule();
  }

  // ── Login / Logout ────────────────────────────────────────────
  function login(username, password) {
    ensureDefaults();
    const users = getUsers();
    const user  = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user)        return { ok: false, error: 'Utilizador não encontrado.' };
    if (!user.active) return { ok: false, error: 'Conta desactivada. Contacte o administrador.' };
    if (hashPwd(password, user.salt) !== user.passwordHash)
      return { ok: false, error: 'Palavra-passe incorrecta.' };

    const sid = uid();
    const session = {
      sessionId:    sid,
      id:           user.id,
      username:     user.username,
      name:         user.name,
      role:         user.role,
      loginAt:      new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    };

    sessionStorage.setItem(K_SESSION, JSON.stringify(session));

    // Register in shared sessions list (one entry per user — replace existing)
    const sessions = _read(K_SESSIONS).filter(s => s.id !== user.id);
    sessions.push(session);
    _write(K_SESSIONS, sessions);

    log('LOGIN', 'auth', `Login: ${user.username} (${user.role})`);
    return { ok: true, user: session };
  }

  function logout() {
    const s = me();
    if (s) {
      log('LOGOUT', 'auth', `Logout: ${s.username}`);
      _write(K_SESSIONS, _read(K_SESSIONS).filter(x => x.sessionId !== s.sessionId));
    }
    sessionStorage.removeItem(K_SESSION);
  }

  // ── Bootstrap ─────────────────────────────────────────────────
  function ensureDefaults() {
    if (getUsers().length === 0) {
      const salt = uid() + uid();
      _write(K_USERS, [{
        id:           uid(),
        username:     'admin',
        name:         'Administrador',
        role:         'admin',
        salt,
        passwordHash: hashPwd('playpadel2026', salt),
        active:       true,
        createdAt:    new Date().toISOString(),
        createdBy:    'system',
      }]);
    }
  }

  // ── Public API ────────────────────────────────────────────────
  return {
    me, isAuth, isAdmin, hasRole, canAccessCategory,
    login, logout, updateActivity, resetTimeout, startTimeoutWatch,
    getUsers, createUser, updateUser, toggleUser, deleteUser,
    getSessions, forceLogout,
    getLogs, log,
    ensureDefaults,
    TIMEOUT_MS, WARN_MS,
  };

})();
