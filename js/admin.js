// ============================================
//  PLAY PADEL — Admin Backoffice
//  Dados iniciais + lógica completa
// ============================================

// ---- Estado global ----
const APP = {
  currentView: 'dashboard',
  editingId: null,
  ffEditing: null,            // { catId, jogoId } when editing a knockout game
  jogadoresSort: { col: 'nome', dir: 'asc' },
  duplasSort:    { col: null,   dir: 'asc' },
};

// DEFAULTS, ppGet, ppSave, ppLoad, ppFormatDate, ppWeekday
// definidos em js/data.js — carregado antes deste ficheiro.

// Compatibilidade interna
const getData = ppGet;
const setData = (k, v) => { ppSave(k, v); if (typeof GHSync !== 'undefined') GHSync.markDirty(); };
const formatDate = ppFormatDate;

// ============================================
//  ENTITY HELPERS (jogadores / duplas)
// ============================================
function _nextEntityId(store, prefix) {
  const items = getData(store) || [];
  const maxN = items.reduce((m, x) => {
    const n = parseInt((x.id || '').replace(/\D/g, ''));
    return Math.max(m, isNaN(n) ? 0 : n);
  }, 0);
  return prefix + (maxN + 1);
}
function getJogador(id)  { return (getData('jogadores') || []).find(j => j.id === id); }
function getDupla(id)    { return (getData('duplas') || []).find(d => d.id === id); }
function getDuplaNomes(d) {
  const j1 = getJogador(d.j1), j2 = getJogador(d.j2);
  return { p1: j1?.nome || d.j1 || '?', p2: j2?.nome || d.j2 || '?' };
}
function getDuplaLabel(idOrObj) {
  const d = typeof idOrObj === 'string' ? getDupla(idOrObj) : idOrObj;
  if (!d) return (typeof idOrObj === 'string' ? idOrObj : '') || '?';
  const { p1, p2 } = getDuplaNomes(d);
  return `${p1} & ${p2}`;
}
function getDuplasByGrupo(grupoId) {
  return (getData('duplas') || []).filter(d => d.grupo === grupoId);
}
function _eqStrToDuplaId(eqStr, grupoId) {
  const jogs = getData('jogadores') || [];
  for (const d of getDuplasByGrupo(grupoId)) {
    const j1 = jogs.find(j => j.id === d.j1);
    const j2 = jogs.find(j => j.id === d.j2);
    if (`${j1?.nome || ''} & ${j2?.nome || ''}` === eqStr) return d.id;
  }
  return '';
}

// ============================================
//  IMPORT LOCAL JSON (for file:// protocol)
// ============================================
window.importLocalJson = function(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const d = JSON.parse(e.target.result);
      const KEYS = ['campos','categorias','grupos','jogadores','duplas','jogos','fasefinal','telefones'];
      KEYS.forEach(function(k) { if (d[k] !== undefined) ppSave(k, d[k]); });
      if (d._updated) localStorage.setItem('pp__updated', d._updated);
      toast('data.json importado com sucesso! A recarregar…', 'success');
      setTimeout(function() { location.reload(); }, 1200);
    } catch(err) {
      toast('Erro ao ler JSON: ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
};

// ============================================
//  WHATSAPP HELPERS
// ============================================
function getTelefone(nome) { const t = getData('telefones') || {}; return t[nome] || ''; }
function setTelefone(nome, tel) {
  const t = getData('telefones') || {};
  if (tel) t[nome] = tel; else delete t[nome];
  setData('telefones', t);
}
function waLink(phone, text) {
  const clean = phone.replace(/\D/g, '');
  return 'https://wa.me/' + clean + '?text=' + encodeURIComponent(text);
}
function waMsgJogo(j) {
  return '\u{1F3BE} *Play Padel \u00b7 Torneio 2.\u00ba Anivers\u00e1rio*\n\n' +
    '\ud83d\udcc5 ' + ppWeekday(j.data) + ', ' + formatDate(j.data) + ' | \u23f0 ' + j.hora + '\n' +
    '\ud83c\udfd9\ufe0f Campo: ' + j.campo + ' | \ud83c\udff7\ufe0f ' + j.grupo + '\n\n' +
    '\ud83c\udfc6 *' + j.eq1 + '*\nvs\n*' + j.eq2 + '*\n\nBoa sorte! \ud83c\udfc6';
}
function waMsgFFJogo(j, catId) {
  const fase = j.fase === 'F' ? 'Final' : j.fase === 'SF' ? 'Meia-Final ' + j.num : 'Quarto de Final ' + j.num;
  return '\u{1F3BE} *Play Padel \u00b7 Torneio 2.\u00ba Anivers\u00e1rio*\n\ud83c\udfc6 *' + catId + ' \u2014 ' + fase + '*\n\n' +
    '\ud83d\udcc5 ' + (j.data ? ppWeekday(j.data) + ', ' + formatDate(j.data) : 'A definir') + ' | \u23f0 ' + (j.hora || 'A definir') + '\n\n' +
    '\ud83c\udfc6 *' + (j.eq1 || 'A definir') + '*\nvs\n*' + (j.eq2 || 'A definir') + '*\n\nBoa sorte! \ud83c\udfc6';
}
function waMsgBundle(jogos) {
  const byData = {};
  jogos.forEach(j => { byData[j.data] = byData[j.data] || []; byData[j.data].push(j); });
  let msg = '\u{1F3BE} *Play Padel \u00b7 Torneio 2.\u00ba Anivers\u00e1rio*\n\ud83d\udccb *Programa de Jogos*\n';
  Object.keys(byData).sort().forEach(d => {
    msg += '\n\ud83d\udcc5 *' + ppWeekday(d) + ', ' + formatDate(d) + '*\n';
    byData[d].sort((a, b) => a.hora.localeCompare(b.hora)).forEach(j => {
      msg += '\u23f0 ' + j.hora + ' | ' + j.campo + ' | ' + j.grupo + '\n   ' + j.eq1 + ' vs ' + j.eq2 + '\n';
    });
  });
  return msg;
}
function getTeamWaBtns(eq1, eq2, jogo) {
  const msg = waMsgJogo(jogo);
  return [eq1, eq2].flatMap(team =>
    team.split('&').map(n => n.trim()).map(n => {
      const tel = getTelefone(n);
      if (!tel) return '';
      return '<a class="btn-icon" style="color:#25D366" href="' + waLink(tel, msg) + '" target="_blank" title="Notificar ' + n + '"><i class="ph ph-whatsapp-logo"></i></a>';
    })
  ).filter(Boolean).join('');
}
window.notificarDia = function() {
  const filtroData  = document.getElementById('filtroDataJogos').value;
  const filtroCampo = document.getElementById('filtroCampoJogos').value;
  const filtroGrupo = document.getElementById('filtroGrupoJogos')?.value || 'todos';
  let jogos = getAllJogosNormalized().filter(j => !j.resultado);
  if (filtroData  !== 'todos') jogos = jogos.filter(j => j.data  === filtroData);
  if (filtroCampo !== 'todos') jogos = jogos.filter(j => j.campo === filtroCampo);
  if (filtroGrupo !== 'todos') jogos = jogos.filter(j => j.grupo === filtroGrupo);
  if (!jogos.length) return toast('Sem jogos pendentes para o filtro actual.', 'error');
  toast('A gerar ' + jogos.length + ' imagem(ns)…', 'success');
  const items = new Array(jogos.length).fill(null);
  let pending = jogos.length;
  jogos.forEach((j, i) => {
    _buildGameCanvas(j, canvas => {
      canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        items[i] = { blob, name: 'jogo-' + (j.id || (i + 1)) + '.png', url, j };
        if (--pending === 0) {
          (APP._bundleUrls || []).forEach(u => URL.revokeObjectURL(u));
          APP._bundleItems = items;
          APP._bundleUrls  = items.map(x => x.url);
          const info = document.getElementById('bundleShareInfo');
          const grid = document.getElementById('bundleImgGrid');
          if (info) info.textContent = items.length + (items.length === 1 ? ' imagem gerada' : ' imagens geradas') + ' · jogos pendentes';
          if (grid) grid.innerHTML = items.map((b, idx) => `
            <div style="background:var(--preto-card);border:1px solid var(--preto-borda);border-radius:8px;overflow:hidden">
              <img src="${b.url}" style="width:100%;display:block">
              <div style="padding:.35rem .6rem;font-size:.68rem;color:var(--cinza-texto);line-height:1.4">${escHtml(b.j.grupo||'—')} · ${formatDate(b.j.data)||'—'} ${b.j.hora||''}</div>
              <div style="padding:.3rem .5rem .5rem;display:flex;gap:.35rem">
                <button class="btn btn-ghost btn-sm" style="flex:1;font-size:.65rem" onclick="_bundleDownloadOne(${idx})"><i class="ph ph-download-simple"></i> Guardar</button>
                <button class="btn btn-sm" style="flex:1;font-size:.65rem;background:#25D366;color:#fff;border:none" onclick="_bundleShareOne(${idx})"><i class="ph ph-share-network"></i></button>
              </div>
            </div>
          `).join('');
          openModal('modalBundleShare');
        }
      }, 'image/png');
    });
  });
};

window._bundleDownloadOne = function(idx) {
  const item = (APP._bundleItems || [])[idx];
  if (!item) return;
  const a = document.createElement('a'); a.href = item.url; a.download = item.name; a.click();
};

window._bundleShareOne = async function(idx) {
  const item = (APP._bundleItems || [])[idx];
  if (!item) return;
  const file = new File([item.blob], item.name, { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Play Padel · Torneio Aniversário 2026' }); }
    catch (err) { if (err.name !== 'AbortError') _bundleDownloadOne(idx); }
  } else { _bundleDownloadOne(idx); }
};

window._bundleDownloadAll = function() {
  (APP._bundleItems || []).forEach((item, i) => {
    setTimeout(() => { const a = document.createElement('a'); a.href = item.url; a.download = item.name; a.click(); }, i * 300);
  });
};

window._bundleShareAll = async function() {
  const items = APP._bundleItems || [];
  if (!items.length) return;
  const files = items.map(b => new File([b.blob], b.name, { type: 'image/png' }));
  if (navigator.canShare && navigator.canShare({ files })) {
    try { await navigator.share({ files, title: 'Play Padel · Torneio Aniversário 2026' }); }
    catch (err) { if (err.name !== 'AbortError') _bundleDownloadAll(); }
  } else { _bundleDownloadAll(); }
};

// ============================================
//  PARTILHAR PANFLETO (utilitário partilhado)
// ============================================
window._panfletoShare = function(canvas, filename) {
  canvas.toBlob(function(blob) {
    APP._panfletoBlob     = blob;
    APP._panfletoFilename = filename;
    document.getElementById('panfletoShareFilename').textContent = filename;
    openModal('modalPanfletoShare');
    toast('Panfleto gerado!', 'success');
  }, 'image/png');
};

window._panfletoDownload = function() {
  const blob     = APP._panfletoBlob;
  const filename = APP._panfletoFilename;
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.download = filename;
  a.href     = url;
  a.click();
  URL.revokeObjectURL(url);
};

window._panfletoWhatsapp = async function() {
  const blob     = APP._panfletoBlob;
  const filename = APP._panfletoFilename;
  if (!blob) return;
  const file = new File([blob], filename, { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Play Padel Coop \u00B7 Torneio Anivers\u00E1rio 2026' });
    } catch (err) {
      if (err.name !== 'AbortError') _panfletoDownload();
    }
  } else {
    window.open('https://wa.me/?text=' + encodeURIComponent('Play Padel Coop \u00B7 Torneio Anivers\u00E1rio 2026'), '_blank');
  }
};

// ============================================
//  GAME IMAGE CANVAS BUILDER (shared)
// ============================================
window._buildGameCanvas = function(j, onDone) {
  const CAT_CLR = { M1:'#4A9EFF', M2:'#00C37B', M3:'#39FF8F', M4:'#F5C518', M5:'#FF9A3C', F1:'#FF6BB0', F2:'#C97BFF' };
  function draw(logoImg) {
    const W = 700, H = 820, PAD = 44;
    const LOGO_SZ = 88, LOGO_X = PAD, LOGO_Y = 20;
    const TEXT_X = PAD + LOGO_SZ + 16;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    const cat = (j._cat || j.grupo || 'M1').split('-')[0].replace(/\s.*/, '');
    const clr = CAT_CLR[cat] || '#00C37B';

    function trunc(text, maxW) {
      let t = String(text);
      if (ctx.measureText(t).width <= maxW) return t;
      while (t.length > 1 && ctx.measureText(t + '\u2026').width > maxW) t = t.slice(0, -1);
      return t + '\u2026';
    }

    // Background
    ctx.fillStyle = '#0A0F0D';
    ctx.fillRect(0, 0, W, H);

    // Top gradient bar
    let g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, clr); g.addColorStop(1, '#39FF8F');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, 8);

    // Header zone
    ctx.fillStyle = '#0D1411';
    ctx.fillRect(0, 8, W, 128);

    // Logo (circular clip)
    if (logoImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(LOGO_X + LOGO_SZ / 2, LOGO_Y + LOGO_SZ / 2, LOGO_SZ / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(logoImg, LOGO_X, LOGO_Y, LOGO_SZ, LOGO_SZ);
      ctx.restore();
    }

    // PLAY PADEL title
    ctx.fillStyle = clr;
    ctx.font = 'bold 40px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('PLAY PADEL', TEXT_X, 66);

    // Subtitle
    ctx.fillStyle = '#8AA396';
    ctx.font = '18px Arial, sans-serif';
    ctx.fillText('TORNEIO ANIVERSÁRIO 2026', TEXT_X, 100);

    // Category / phase pill (top right) + ID badge
    const grpText = j.grupo.toUpperCase();
    ctx.font = 'bold 14px Arial, sans-serif';
    const gpw = ctx.measureText(grpText).width + 28;
    const gph = 34, gpx = W - PAD - gpw, gpy = 55;
    ctx.fillStyle = clr + '28';
    ctx.beginPath(); ctx.roundRect(gpx, gpy, gpw, gph, 6); ctx.fill();
    ctx.strokeStyle = clr + '88'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(gpx, gpy, gpw, gph, 6); ctx.stroke();
    ctx.fillStyle = clr; ctx.textAlign = 'center';
    ctx.fillText(grpText, gpx + gpw / 2, gpy + gph * 0.72);

    // Game ID badge (below group pill)
    if (j.id && !j._ff) {
      const idText = '#' + j.id;
      ctx.font = 'bold 12px "Courier New", monospace';
      const idw = ctx.measureText(idText).width + 18;
      const idh = 22, idx2 = W - PAD - idw, idy = gpy + gph + 6;
      ctx.fillStyle = 'rgba(138,163,150,.12)';
      ctx.beginPath(); ctx.roundRect(idx2, idy, idw, idh, 4); ctx.fill();
      ctx.fillStyle = '#8AA396'; ctx.textAlign = 'center';
      ctx.fillText(idText, idx2 + idw / 2, idy + 15);
    }

    // Separator
    ctx.fillStyle = '#1C2620'; ctx.fillRect(0, 136, W, 2);

    // Info bar
    ctx.fillStyle = '#0D1411'; ctx.fillRect(0, 138, W, 62);
    const dateStr = j.data ? ppWeekday(j.data) + ', ' + formatDate(j.data) : 'Data a definir';
    const timeStr = j.hora || '—';
    const campoStr = j.campo || '—';
    ctx.fillStyle = '#8AA396'; ctx.font = '17px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('\uD83D\uDCC5  ' + dateStr + '   \u00B7   \u23F0  ' + timeStr + '   \u00B7   \uD83C\uDFDF  ' + campoStr, W / 2, 176);

    // Separator
    ctx.fillStyle = '#1C2620'; ctx.fillRect(0, 200, W, 2);

    // Match zone background
    ctx.fillStyle = '#0A0F0D'; ctx.fillRect(0, 202, W, 378);

    // Subtle diagonal accent lines
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.strokeStyle = clr; ctx.lineWidth = 60;
    ctx.beginPath(); ctx.moveTo(-100, 500); ctx.lineTo(500, -100); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(200, 800); ctx.lineTo(800, 200); ctx.stroke();
    ctx.restore();

    // Team name helper
    function drawTeam(parts, centerY, mainColor) {
      const maxW = W - PAD * 2 - 10;
      if (parts.length === 2) {
        ctx.fillStyle = mainColor;
        ctx.font = 'bold 34px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(trunc(parts[0], maxW), W / 2, centerY - 20);
        ctx.fillStyle = '#C8DDD5';
        ctx.font = 'bold 30px Arial, sans-serif';
        ctx.fillText(trunc(parts[1], maxW), W / 2, centerY + 22);
      } else {
        ctx.fillStyle = mainColor;
        ctx.font = 'bold 36px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(trunc(parts[0], maxW), W / 2, centerY);
      }
    }

    const eq1Parts = (j.eq1 || 'Equipa 1').split('&').map(s => s.trim());
    const eq2Parts = (j.eq2 || 'Equipa 2').split('&').map(s => s.trim());

    drawTeam(eq1Parts, 315, '#F0F7F3');

    // VS divider
    const vsY = 400;
    ctx.strokeStyle = '#1C2620'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(PAD, vsY); ctx.lineTo(W / 2 - 36, vsY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W / 2 + 36, vsY); ctx.lineTo(W - PAD, vsY); ctx.stroke();
    ctx.fillStyle = '#4A6058';
    ctx.font = 'bold 22px Arial, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('VS', W / 2, vsY + 8);

    drawTeam(eq2Parts, 480, '#F0F7F3');

    ctx.textAlign = 'left';

    // Score (if result exists)
    if (j.resultado) {
      const r = j.resultado;
      const sets = [[r.s1eq1, r.s1eq2], [r.s2eq1, r.s2eq2], [r.s3eq1, r.s3eq2]]
        .filter(([a]) => a !== null && a !== undefined);
      let w1 = 0, w2 = 0;
      sets.forEach(([a, b]) => { if (a > b) w1++; else if (b > a) w2++; });
      const setsStr = sets.map(([a, b]) => a + '\u2013' + b).join('  ');

      const sbH = 56, sbW = 230, sbX = W / 2 - 115, sbY = 574;
      ctx.fillStyle = 'rgba(0,195,123,0.12)';
      ctx.beginPath(); ctx.roundRect(sbX, sbY, sbW, sbH, 10); ctx.fill();
      ctx.strokeStyle = 'rgba(0,195,123,0.40)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(sbX, sbY, sbW, sbH, 10); ctx.stroke();
      ctx.fillStyle = '#39FF8F';
      ctx.font = 'bold 26px "Courier New", monospace'; ctx.textAlign = 'center';
      ctx.fillText(w1 + ' \u2013 ' + w2, W / 2, sbY + 36);
      ctx.fillStyle = '#8AA396'; ctx.font = '13px Arial, sans-serif';
      ctx.fillText(setsStr, W / 2, sbY + sbH + 18);
      ctx.textAlign = 'left';
    }

    // Message zone — lembrete do clube (pending games)
    if (!j.resultado) {
      const mY = 580;
      ctx.fillStyle = '#0D1411'; ctx.fillRect(0, mY, W, 160);
      ctx.fillStyle = '#1C2620'; ctx.fillRect(0, mY, W, 1);

      // Header band
      const bW = W - PAD * 2, bH = 38, bX = PAD, bY = mY + 12;
      ctx.fillStyle = clr + '1A';
      ctx.beginPath(); ctx.roundRect(bX, bY, bW, bH, 6); ctx.fill();
      ctx.strokeStyle = clr + '55'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(bX, bY, bW, bH, 6); ctx.stroke();
      ctx.fillStyle = clr; ctx.font = 'bold 13px Arial, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('LEMBRETE DO CLUBE', W / 2, bY + 26);

      // Content lines
      ctx.fillStyle = '#C8DDD5'; ctx.font = '14px Arial, sans-serif';
      ctx.fillText('O vosso jogo est\u00e1 marcado para:', W / 2, mY + 72);
      const ds2 = j.data ? ppWeekday(j.data) + ', ' + formatDate(j.data) : 'Data a definir';
      ctx.fillStyle = clr; ctx.font = 'bold 15px Arial, sans-serif';
      ctx.fillText(ds2 + '   \u00B7   ' + (j.hora || '\u2014') + '   \u00B7   ' + (j.campo || '\u2014'), W / 2, mY + 96);
      ctx.fillStyle = '#F5C518'; ctx.font = '13px Arial, sans-serif';
      ctx.fillText('\u26A0  Os hor\u00e1rios s\u00e3o estimativas \u2014 dependem do jogo anterior', W / 2, mY + 122);
      ctx.fillStyle = '#8AA396'; ctx.font = '13px Arial, sans-serif';
      ctx.fillText('Chegue 15 minutos antes  \u00B7  Contamos com a sua presen\u00e7a!', W / 2, mY + 145);
    }

    // Footer
    const fy = H - 78;
    ctx.fillStyle = '#111815'; ctx.fillRect(0, fy, W, 78);
    ctx.fillStyle = '#1C2620'; ctx.fillRect(0, fy, W, 1);
    ctx.fillStyle = '#4A6058'; ctx.font = '17px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Play Padel  \u00B7  Torneio Aniversário 2026', W / 2, fy + 44);

    // Bottom gradient bar
    g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, clr); g.addColorStop(1, '#39FF8F');
    ctx.fillStyle = g; ctx.fillRect(0, H - 6, W, 6);

    ctx.textAlign = 'left';
    onDone(canvas);
  }

  // Load logo then draw
  const logo = new Image();
  logo.onload = () => draw(logo);
  logo.onerror = () => draw(null);
  logo.src = 'playpadellogo.jpg';
};

// ============================================
//  GAME IMAGE (WA IMAGE SHARE)
// ============================================
window.waImageJogo = function(jogoId, isFF, catId) {
  let j;
  if (isFF) {
    const ff = ffLoad();
    j = (ff[catId]?.jogos || []).find(g => String(g.id) === String(jogoId));
    if (!j) return toast('Jogo não encontrado.', 'error');
    const faseLabel = j.fase === 'F' ? 'Final' : j.fase === 'SF' ? 'Meia-Final' + (j.num > 1 ? ' ' + j.num : '') : 'Quarto de Final' + (j.num ? ' ' + j.num : '');
    j = { ...j, grupo: catId + ' — ' + faseLabel, campo: j.campo || '—', _cat: catId };
  } else {
    j = (getData('jogos') || []).find(g => String(g.id) === String(jogoId));
    if (!j) return toast('Jogo não encontrado.', 'error');
  }
  _buildGameCanvas(j, canvas => _panfletoShare(canvas, 'jogo-' + jogoId + '.png'));
};

// ============================================
//  BANNER INSTALAÇÃO APP
// ============================================
window.gerarBannerInstalacao = function() {
  function draw(logoImg) {
    const W = 700, H = 980, PAD = 44;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#0A0F0D';
    ctx.fillRect(0, 0, W, H);

    // Top gradient bar
    let g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, '#00C37B'); g.addColorStop(1, '#39FF8F');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, 8);

    // Header zone
    ctx.fillStyle = '#0D1411'; ctx.fillRect(0, 8, W, 120);

    // Logo
    if (logoImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(PAD + 44, 8 + 60, 44, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(logoImg, PAD, 24, 88, 88);
      ctx.restore();
    }

    // Title
    ctx.fillStyle = '#00C37B'; ctx.font = 'bold 36px Arial, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('PLAY PADEL', PAD + 104, 65);
    ctx.fillStyle = '#8AA396'; ctx.font = '17px Arial, sans-serif';
    ctx.fillText('TORNEIO 2.º ANIVERSÁRIO 2026', PAD + 104, 94);

    // Separator
    ctx.fillStyle = '#1C2620'; ctx.fillRect(0, 128, W, 2);

    // Main headline
    ctx.textAlign = 'center';
    ctx.fillStyle = '#F0F7F3'; ctx.font = 'bold 32px Arial, sans-serif';
    ctx.fillText('Acompanha o torneio', W / 2, 185);
    ctx.fillStyle = '#00C37B'; ctx.font = 'bold 36px Arial, sans-serif';
    ctx.fillText('em tempo real!', W / 2, 232);

    // Subtitle
    ctx.fillStyle = '#8AA396'; ctx.font = '17px Arial, sans-serif';
    ctx.fillText('Resultados, classificações e calendário', W / 2, 270);
    ctx.fillText('actualizados ao minuto.', W / 2, 294);

    // Features list
    const features = [
      { icon: '\uD83D\uDCC5', label: 'Calendário completo de jogos' },
      { icon: '\uD83C\uDFC6', label: 'Classificações ao vivo' },
      { icon: '\uD83E\uDD4A', label: 'Fase Final — bracket eliminatório' },
      { icon: '\uD83D\uDC65', label: 'Perfil de cada jogador e dupla' },
    ];
    let fy = 348;
    features.forEach(f => {
      // Card
      ctx.fillStyle = '#111815';
      ctx.beginPath(); ctx.roundRect(PAD, fy - 26, W - PAD * 2, 52, 8); ctx.fill();
      ctx.strokeStyle = '#1C2620'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(PAD, fy - 26, W - PAD * 2, 52, 8); ctx.stroke();
      ctx.textAlign = 'left';
      ctx.font = '22px Arial, sans-serif'; ctx.fillStyle = '#F0F7F3';
      ctx.fillText(f.icon + '  ' + f.label, PAD + 18, fy + 8);
      fy += 68;
    });

    // Separator
    ctx.fillStyle = '#1C2620'; ctx.fillRect(PAD, fy + 4, W - PAD * 2, 1);
    fy += 24;

    // Install instructions header
    ctx.textAlign = 'center';
    ctx.fillStyle = '#F5C518'; ctx.font = 'bold 20px Arial, sans-serif';
    ctx.fillText('\uD83D\uDCF2  Como instalar como App gratuita', W / 2, fy + 20);
    fy += 52;

    // Android block
    const bw = (W - PAD * 2 - 16) / 2;
    function drawBlock(bx, bw2, title, lines, clr) {
      ctx.fillStyle = clr + '18';
      ctx.beginPath(); ctx.roundRect(bx, fy, bw2, 158, 10); ctx.fill();
      ctx.strokeStyle = clr + '55'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(bx, fy, bw2, 158, 10); ctx.stroke();
      ctx.fillStyle = clr; ctx.font = 'bold 15px Arial, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(title, bx + bw2 / 2, fy + 26);
      ctx.fillStyle = '#C8DDD5'; ctx.font = '13.5px Arial, sans-serif';
      lines.forEach((l, i) => ctx.fillText(l, bx + bw2 / 2, fy + 56 + i * 26));
    }
    drawBlock(PAD, bw, 'Android (Chrome)', ['Menu  ⋮  (3 pontos)', '"Instalar app" ou', '"Adicionar ao ecrã"'], '#4A9EFF');
    drawBlock(PAD + bw + 16, bw, 'iPhone (Safari)', ['Botão Partilhar  ↑', '"Adicionar ao ecrã', 'de início"'], '#C97BFF');
    fy += 174;

    // URL
    ctx.textAlign = 'center';
    ctx.fillStyle = '#39FF8F'; ctx.font = 'bold 15px "Courier New", monospace';
    ctx.fillText('sporteventos.github.io/playpadelcoop', W / 2, fy + 18);

    // Bottom bar
    const by = H - 52;
    ctx.fillStyle = '#111815'; ctx.fillRect(0, by, W, 52);
    ctx.fillStyle = '#1C2620'; ctx.fillRect(0, by, W, 1);
    ctx.fillStyle = '#4A6058'; ctx.font = '15px Arial, sans-serif';
    ctx.fillText('Play Padel Coop  ·  Torneio 2.º Aniversário 2026  ·  Maputo', W / 2, by + 32);

    // Bottom gradient bar
    g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, '#00C37B'); g.addColorStop(1, '#39FF8F');
    ctx.fillStyle = g; ctx.fillRect(0, H - 6, W, 6);

    _panfletoShare(canvas, 'instalar-app-playpadel.png');
  }

  const logo = new Image();
  logo.onload = () => draw(logo);
  logo.onerror = () => draw(null);
  logo.src = 'playpadellogo.jpg';
};

window.gerarPanfleto = function(periodo) {
  const filtroData  = document.getElementById('filtroDataJogos').value;
  const filtroCampo = document.getElementById('filtroCampoJogos').value;
  const filtroGrupo = document.getElementById('filtroGrupoJogos')?.value || 'todos';
  let jogos = getData('jogos');
  if (filtroData  !== 'todos') jogos = jogos.filter(j => j.data  === filtroData);
  if (filtroCampo !== 'todos') jogos = jogos.filter(j => j.campo === filtroCampo);
  if (filtroGrupo !== 'todos') jogos = jogos.filter(j => j.grupo === filtroGrupo);

  // Split by morning / afternoon
  if (periodo === 'manha')  jogos = jogos.filter(j => j.hora && j.hora < '12:00');
  if (periodo === 'tarde')  jogos = jogos.filter(j => j.hora && j.hora >= '12:00');

  if (!jogos.length) return toast(
    periodo === 'manha'  ? 'Sem jogos de manhã para o filtro actual.' :
    periodo === 'tarde'  ? 'Sem jogos de tarde para o filtro actual.'  :
    'Sem jogos para o filtro actual.', 'error');
  jogos = [...jogos].sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora) || a.campo.localeCompare(b.campo));

  const periodoLabel = periodo === 'manha' ? 'MANHÃ (até 12h)' : periodo === 'tarde' ? 'TARDE (12h+)' : null;
  const filenameSuffix = periodo === 'manha' ? '-manha' : periodo === 'tarde' ? '-tarde' : '';

  const W      = 1080;
  const PAD    = 44;
  const ROW_H  = 82;
  const HEAD_H = 218;
  const FOOT_H = 64;
  const H      = HEAD_H + jogos.length * ROW_H + FOOT_H;

  function draw(logoImg) {
  const canvas  = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // ── helpers ──────────────────────────────────────────────
  function trunc(text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    while (text.length && ctx.measureText(text + '\u2026').width > maxW) text = text.slice(0, -1);
    return text + '\u2026';
  }
  function drawTeamName(text, x, rowY, maxW, align) {
    const parts = text.split(' & ');
    ctx.font = '19px Arial, sans-serif';
    ctx.textAlign = align || 'left';
    if (parts.length === 1) {
      ctx.fillText(trunc(parts[0], maxW), x, rowY + ROW_H * 0.57);
    } else {
      ctx.fillText(trunc(parts[0], maxW), x, rowY + ROW_H * 0.40);
      ctx.fillText(trunc(parts[1], maxW), x, rowY + ROW_H * 0.72);
    }
    ctx.textAlign = 'left';
  }
  function badge(x, y, w, h, r, bg, fg, text, fs) {
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
    ctx.fillStyle = fg;
    ctx.font = `bold ${fs}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(text, x + w / 2, y + h * 0.69);
    ctx.textAlign = 'left';
  }

  const COURT_CLR = { 'Play Padel':'#00C37B', 'TVCabo':'#4A9EFF', 'Stella Artois':'#F5C518' };
  const CAT_CLR   = { M1:'#4A9EFF', M2:'#00C37B', M3:'#39FF8F', M4:'#F5C518', M5:'#FF9A3C', F1:'#FF6BB0', F2:'#C97BFF' };

  // ── Background ───────────────────────────────────────────
  ctx.fillStyle = '#0A0F0D';
  ctx.fillRect(0, 0, W, H);

  // ── Gradient top bar ─────────────────────────────────────
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, '#00C37B'); grad.addColorStop(1, '#007A4E');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 10);

  // ── Header text ──────────────────────────────────────────
  ctx.fillStyle = '#00C37B';
  ctx.font = 'bold 52px Arial, sans-serif';
  ctx.fillText('PLAY PADEL', PAD, 72);
  ctx.fillStyle = '#F0F7F3';
  ctx.font = '32px Arial, sans-serif';
  ctx.fillText('TORNEIO ANIVERSÁRIO 2026', PAD, 112);

  const dayLabel = filtroData !== 'todos'
    ? (typeof ppWeekday === 'function' ? ppWeekday(filtroData).toUpperCase() + '  \u00B7  ' : '')
      + filtroData.split('-').reverse().join('/')
    : 'TODOS OS JOGOS';
  ctx.fillStyle = '#8AA396';
  ctx.font = '22px Arial, sans-serif';
  ctx.fillText(dayLabel, PAD, 146);

  // Period label (Manhã / Tarde) if applicable
  if (periodoLabel) {
    const plX = PAD + ctx.measureText(dayLabel).width + 18;
    ctx.fillStyle = '#F5C518';
    ctx.font = 'bold 18px Arial, sans-serif';
    ctx.fillText('\u00B7  ' + periodoLabel, plX, 146);
  }

  ctx.fillStyle = '#F0F7F3';
  ctx.font = 'bold 18px Arial, sans-serif';
  ctx.fillText(`${jogos.length} JOGO${jogos.length !== 1 ? 'S' : ''}`, PAD, 173);

  // ── Divider ──────────────────────────────────────────────
  ctx.fillStyle = '#1C2620';
  ctx.fillRect(PAD, 185, W - PAD * 2, 2);

  // ── Logo (top-right of header) ────────────────────────────
  if (logoImg) {
    const LOGO_SZ = 80, LOGO_X = W - PAD - 80, LOGO_Y = 18;
    ctx.save();
    ctx.beginPath();
    ctx.arc(LOGO_X + LOGO_SZ / 2, LOGO_Y + LOGO_SZ / 2, LOGO_SZ / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logoImg, LOGO_X, LOGO_Y, LOGO_SZ, LOGO_SZ);
    ctx.restore();
  }

  // ── Column headers ───────────────────────────────────────
  const CX = { data: PAD, hora: PAD+66, campo: PAD+148, grupo: PAD+322, eq1r: PAD+634, vs: PAD+649, eq2: PAD+665 };
  ctx.fillStyle = '#4A6058';
  ctx.font = 'bold 13px Arial, sans-serif';
  ctx.fillText('DATA',     CX.data,        205);
  ctx.fillText('HORA',     CX.hora,        205);
  ctx.textAlign = 'center';
  ctx.fillText('CAMPO',    CX.campo + 78,  205);
  ctx.fillText('GRUPO',    CX.grupo + 40,  205);
  ctx.textAlign = 'right';
  ctx.fillText('EQUIPA 1', CX.eq1r,        205);
  ctx.textAlign = 'left';
  ctx.fillText('EQUIPA 2', CX.eq2,         205);

  // ── Rows ─────────────────────────────────────────────────
  let lastData = null;
  jogos.forEach((j, i) => {
    const y   = HEAD_H + i * ROW_H;
    const cat = j.grupo.split('-')[0];
    const cc  = COURT_CLR[j.campo] || '#8AA396';
    const gc  = CAT_CLR[cat]       || '#8AA396';

    ctx.fillStyle = i % 2 === 0 ? '#111815' : '#0D1410';
    ctx.fillRect(0, y, W, ROW_H);

    if (j.data !== lastData && i > 0) {
      ctx.fillStyle = '#1C2620'; ctx.fillRect(0, y, W, 1);
    }
    lastData = j.data;

    ctx.fillStyle = cc; ctx.fillRect(0, y + 1, 6, ROW_H - 2);

    const cy = y + ROW_H / 2 + 9;

    // Date
    ctx.fillStyle = '#8AA396';
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillText(j.data ? j.data.split('-').slice(1).reverse().join('/') : '', CX.data, cy);

    // Hora
    ctx.fillStyle = '#F0F7F3';
    ctx.font = 'bold 22px "Courier New", monospace';
    ctx.fillText(j.hora, CX.hora, cy);

    badge(CX.campo, y + (ROW_H - 30) / 2, 156, 30, 6, cc + '28', cc, j.campo, 13);
    badge(CX.grupo, y + (ROW_H - 30) / 2,  80, 30, 6, gc + '28', gc, j.grupo, 13);

    ctx.fillStyle = '#F0F7F3';    // will be overridden below if result exists
    drawTeamName(j.eq1, CX.eq1r, y, 228, 'right');

    ctx.fillStyle = '#4A6058';
    ctx.font = 'bold 15px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VS', CX.vs, cy);
    ctx.textAlign = 'left';

    if (j.resultado) {
      if (j.resultado.wo) {
        // WO: highlight winner green, loser red, show W.O. badge on right
        const woTeam = j.resultado.wo; // 'eq1' | 'eq2'
        ctx.fillStyle = woTeam === 'eq2' ? '#39FF8F' : '#FF4A4A';
        drawTeamName(j.eq1, CX.eq1r, y, 228, 'right');
        ctx.fillStyle = woTeam === 'eq1' ? '#39FF8F' : '#FF4A4A';
        drawTeamName(j.eq2, CX.eq2, y, 220, 'left');
        // W.O. badge
        const woBW = 62, woBH = 26, woBX = W - PAD - woBW, woBY = y + (ROW_H - woBH) / 2;
        ctx.fillStyle = 'rgba(255,74,74,0.15)';
        ctx.beginPath(); ctx.roundRect(woBX, woBY, woBW, woBH, 5); ctx.fill();
        ctx.fillStyle = '#FF4A4A'; ctx.textAlign = 'right';
        ctx.font = 'bold 15px Arial, sans-serif';
        ctx.fillText('W.O.', W - PAD - 6, woBY + woBH * 0.72);
        ctx.textAlign = 'left';
      } else {
        const { w1, w2 } = matchSetsScore(j.resultado);
        const winner = w1 > w2 ? 1 : 2;
        const r = j.resultado;
        const _tbS = [[r.tb1eq1,r.tb1eq2],[r.tb2eq1,r.tb2eq2],[r.tb3eq1,r.tb3eq2]];
        const setsStr = [[r.s1eq1,r.s1eq2],[r.s2eq1,r.s2eq2],[r.s3eq1,r.s3eq2]]
          .filter(([a]) => a != null).map(([a, b], i) => { const [ta,tb] = _tbS[i]; return `${a}-${b}${ta != null ? ` (${ta}-${tb})` : ''}`; }).join(' ');
        // Re-draw eq1 with winner colour
        ctx.fillStyle = winner === 1 ? '#39FF8F' : '#8AA396';
        drawTeamName(j.eq1, CX.eq1r, y, 228, 'right');
        ctx.fillStyle = winner === 2 ? '#39FF8F' : '#8AA396';
        drawTeamName(j.eq2, CX.eq2, y, 220, 'left');
        // Match score (big) + sets (small) at right edge
        ctx.textAlign = 'right';
        ctx.font = 'bold 18px "Courier New", monospace';
        ctx.fillStyle = '#39FF8F';
        ctx.fillText(`${w1}-${w2}`, W - PAD, cy - 8);
        ctx.font = '13px Arial, sans-serif';
        ctx.fillStyle = '#8AA396';
        ctx.fillText(setsStr, W - PAD, cy + 10);
        ctx.textAlign = 'left';
      }
    } else if (j.adiado) {
      // Adiado: teams in muted blue, show 📅 + motivo on right
      ctx.fillStyle = '#6B9CF7';
      drawTeamName(j.eq1, CX.eq1r, y, 228, 'right');
      drawTeamName(j.eq2, CX.eq2, y, 220, 'left');
      ctx.textAlign = 'right';
      ctx.font = 'bold 15px Arial, sans-serif';
      ctx.fillStyle = '#6B9CF7';
      ctx.fillText('\uD83D\uDCC5 Adiado', W - PAD, cy - (j.adiado.motivo ? 8 : 0));
      if (j.adiado.motivo) {
        ctx.font = '12px Arial, sans-serif';
        ctx.fillStyle = '#8AA396';
        const mot = j.adiado.motivo.length > 28 ? j.adiado.motivo.substring(0, 28) + '\u2026' : j.adiado.motivo;
        ctx.fillText(mot, W - PAD, cy + 10);
      }
      ctx.textAlign = 'left';
    } else if (j.suspenso) {
      // Suspended: teams in white, show ⏸ + partial sets on right
      ctx.fillStyle = '#F0F7F3';
      drawTeamName(j.eq1, CX.eq1r, y, 228, 'right');
      drawTeamName(j.eq2, CX.eq2, y, 220, 'left');
      const s = j.suspenso;
      const partial = [s.s1eq1!=null?`${s.s1eq1}-${s.s1eq2}`:null, s.s2eq1!=null?`${s.s2eq1}-${s.s2eq2}`:null, s.s3eq1!=null?`${s.s3eq1}-${s.s3eq2}`:null].filter(Boolean).join(' ');
      ctx.textAlign = 'right';
      ctx.font = 'bold 15px Arial, sans-serif';
      ctx.fillStyle = '#FF9A3C';
      ctx.fillText('\u23f8 Interrompido', W - PAD, cy - (partial ? 8 : 0));
      if (partial) {
        ctx.font = '13px "Courier New", monospace';
        ctx.fillStyle = '#FF9A3C';
        ctx.fillText(partial, W - PAD, cy + 10);
      }
      ctx.textAlign = 'left';
    } else {
      ctx.fillStyle = '#F0F7F3';
      drawTeamName(j.eq2, CX.eq2, y, 250, 'left');
    }
  });

  // ── Footer ───────────────────────────────────────────────
  const fy = H - FOOT_H;
  ctx.fillStyle = '#111815'; ctx.fillRect(0, fy, W, FOOT_H);
  ctx.fillStyle = '#1C2620'; ctx.fillRect(0, fy, W, 1);
  ctx.fillStyle = '#4A6058';
  ctx.font = '17px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Play Padel  \u00B7  Torneio Aniversário 2026', W / 2, fy + 38);
  ctx.textAlign = 'left';

  _panfletoShare(canvas, `jogos-${filtroData !== 'todos' ? filtroData : 'todos'}${filenameSuffix}.png`);
  } // end draw()

  const logo = new Image();
  logo.onload  = () => draw(logo);
  logo.onerror = () => draw(null);
  logo.src = 'playpadellogo.jpg';
};

// ============================================
//  PANFLETO COM FOTO
// ============================================
window.abrirPanfletoFoto = function(jogoId, isFF, catId) {
  let jogo;
  if (isFF === true || isFF === 'true') {
    const ff = ffLoad();
    jogo = ff[catId]?.jogos.find(j => j.id === jogoId);
    if (jogo) jogo = { ...jogo, _isFF: true, _cat: catId,
      grupo: catId + '-' + (jogo.fase === 'F' ? 'Final' : jogo.fase),
      campo: jogo.campo || '—' };
  } else {
    jogo = getData('jogos').find(j => String(j.id) === String(jogoId));
  }
  if (!jogo) return toast('Jogo não encontrado.', 'error');
  if (!jogo.resultado) return toast('Este jogo ainda não tem resultado.', 'error');
  if (jogo.resultado.wo) { _gerarPanfletoWO(jogo); return; }

  APP._fotoFlyer = { jogo };

  const { w1, w2 } = matchSetsScore(jogo.resultado);
  const r = jogo.resultado;
  const _tbSI = [[r.tb1eq1,r.tb1eq2],[r.tb2eq1,r.tb2eq2],[r.tb3eq1,r.tb3eq2]];
  const sets = r.wo ? 'W.O.' : [[r.s1eq1,r.s1eq2],[r.s2eq1,r.s2eq2],[r.s3eq1,r.s3eq2]]
    .filter(([a]) => a !== null).map(([a, b], i) => { const [ta,tb] = _tbSI[i]; return `${a}-${b}${ta != null ? ` (${ta}-${tb})` : ''}`; }).join('  /  ');
  const eq1Won = w1 > w2;

  document.getElementById('fotoFlyerInfo').innerHTML =
    `<strong style="color:var(--branco)">${escHtml(jogo.grupo)}</strong>` +
    (jogo.data ? `  ·  ${formatDate(jogo.data)}` : '') +
    (jogo.hora ? `  ${jogo.hora}` : '') +
    `<br><span style="color:${eq1Won ? 'var(--verde-neon)' : 'var(--cinza-texto)'}">${escHtml(jogo.eq1)}</span>` +
    `<span style="color:var(--branco);font-weight:700;margin:0 .6rem">${w1} – ${w2}</span>` +
    `<span style="color:${eq1Won ? 'var(--cinza-texto)' : 'var(--verde-neon)'}">${escHtml(jogo.eq2)}</span>` +
    `<br><span style="font-size:.72rem">${sets}</span>`;

  document.getElementById('fotoFlyerInput').value = '';
  document.getElementById('fotoFlyerPreview').style.display = 'none';
  // Reset zoom/pan sliders
  const zEl = document.getElementById('fotoFlyerZoom');
  if (zEl) { zEl.value = 100; const lbl = document.getElementById('fotoFlyerZoomLbl'); if (lbl) lbl.textContent = '100%'; }
  const pxEl = document.getElementById('fotoFlyerPanX'); if (pxEl) pxEl.value = 0;
  const pyEl = document.getElementById('fotoFlyerPanY'); if (pyEl) pyEl.value = 0;
  openModal('modalFotoFlyer');
};

// ============================================
//  PANFLETO WO (sem foto)
// ============================================
window._gerarPanfletoWO = function(jogo) {
  const W = 1080, H = 1350;
  const CAT_CLR = { M1:'#4A9EFF', M2:'#00C37B', M3:'#39FF8F', M4:'#F5C518', M5:'#FF9A3C', F1:'#FF6BB0', F2:'#C97BFF' };
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const woTeam  = jogo.resultado.wo;          // 'eq1' | 'eq2'
  const winner  = woTeam === 'eq1' ? jogo.eq2 : jogo.eq1;
  const cat     = (jogo.grupo || '').split(/[-\s]/)[0];
  const catClr  = CAT_CLR[cat] || '#8AA396';

  function drawWoCanvas(logoImg) {
    // Background
    ctx.fillStyle = '#080D0B';
    ctx.fillRect(0, 0, W, H);
    // Grid pattern
    ctx.save();
    ctx.strokeStyle = 'rgba(255,74,74,0.035)';
    ctx.lineWidth = 1;
    for (let y = 0; y < H; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    for (let x = 0; x < W; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    ctx.restore();

    // Logo
    const LOGO_SZ = 68, LX = (W - LOGO_SZ) / 2, LY = 52;
    if (logoImg) {
      ctx.save();
      ctx.beginPath(); ctx.arc(LX + LOGO_SZ/2, LY + LOGO_SZ/2, LOGO_SZ/2, 0, Math.PI*2); ctx.clip();
      ctx.drawImage(logoImg, LX, LY, LOGO_SZ, LOGO_SZ);
      ctx.restore();
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = '#00C37B'; ctx.font = 'bold 32px Arial, sans-serif';
    ctx.fillText('PLAY PADEL COOP', W/2, LY + LOGO_SZ + 44);
    ctx.fillStyle = '#8AA396'; ctx.font = '21px Arial, sans-serif';
    ctx.fillText('TORNEIO ANIVERSÁRIO 2026', W/2, LY + LOGO_SZ + 76);
    const sepY = LY + LOGO_SZ + 102;
    ctx.strokeStyle = 'rgba(255,74,74,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(80, sepY); ctx.lineTo(W-80, sepY); ctx.stroke();

    // WO Badge circle
    const cx = W/2, cBY = sepY + 148, RR = 112;
    const radGrad = ctx.createRadialGradient(cx, cBY, 0, cx, cBY, RR + 60);
    radGrad.addColorStop(0, 'rgba(255,74,74,0.18)'); radGrad.addColorStop(1, 'rgba(255,74,74,0)');
    ctx.fillStyle = radGrad; ctx.fillRect(cx-RR-60, cBY-RR-60, (RR+60)*2, (RR+60)*2);
    ctx.beginPath(); ctx.arc(cx, cBY, RR, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,74,74,0.10)'; ctx.fill();
    ctx.strokeStyle = '#FF4A4A'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#FF4A4A'; ctx.textAlign = 'center';
    ctx.font = 'bold 86px Arial, sans-serif'; ctx.fillText('W.O.', cx, cBY + 30);
    ctx.font = 'bold 42px Arial, sans-serif'; ctx.fillText('WALKOVER', cx, cBY + RR + 58);
    ctx.fillStyle = '#8AA396'; ctx.font = '22px Arial, sans-serif';
    ctx.fillText('Equipa não compareceu', cx, cBY + RR + 92);

    // Match meta
    const MIY = cBY + RR + 152;
    const bw = ctx.measureText((jogo.grupo||'').toUpperCase()).width + 44;
    ctx.fillStyle = catClr + '28';
    ctx.beginPath(); ctx.roundRect((W-bw)/2, MIY, bw, 40, 8); ctx.fill();
    ctx.fillStyle = catClr; ctx.font = 'bold 20px Arial, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText((jogo.grupo||'').toUpperCase(), W/2, MIY + 27);
    const meta = [jogo.data ? ppFormatDate(jogo.data) : '', jogo.hora, (jogo.campo && jogo.campo !== '—') ? jogo.campo : ''].filter(Boolean).join('  ·  ');
    ctx.fillStyle = '#8AA396'; ctx.font = '20px Arial, sans-serif';
    ctx.fillText(meta, W/2, MIY + 74);

    // Teams
    const PAD = 60, TY = MIY + 168;
    const eq1IsWinner = woTeam === 'eq2';

    function drawTeam(name, xBase, align, isWinner) {
      const parts = name.split(' & ');
      ctx.fillStyle = isWinner ? '#39FF8F' : '#FF4A4A';
      ctx.textAlign = align;
      ctx.font = `bold ${parts.length === 2 ? 31 : 35}px Arial, sans-serif`;
      if (parts.length === 2) { ctx.fillText(parts[0], xBase, TY - 16); ctx.fillText(parts[1], xBase, TY + 26); }
      else { ctx.fillText(name, xBase, TY + 6); }
    }
    drawTeam(jogo.eq1, PAD, 'left', eq1IsWinner);
    drawTeam(jogo.eq2, W-PAD, 'right', !eq1IsWinner);
    ctx.fillStyle = '#8AA396'; ctx.font = '20px Arial, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('VS', W/2, TY + 6);

    // WO badge below loser team
    const isEq1Loser = woTeam === 'eq1';
    const wbW = 74, wbH = 28;
    const wbX = isEq1Loser ? PAD : W - PAD - wbW;
    ctx.fillStyle = 'rgba(255,74,74,0.18)';
    ctx.beginPath(); ctx.roundRect(wbX, TY + 40, wbW, wbH, 6); ctx.fill();
    ctx.fillStyle = '#FF4A4A'; ctx.font = 'bold 16px Arial, sans-serif';
    ctx.textAlign = isEq1Loser ? 'left' : 'right';
    ctx.fillText('WO', isEq1Loser ? PAD + 10 : W - PAD - 10, TY + 58);

    // Footer band
    const BAND_H = 190, BY = H - BAND_H;
    const gr2 = ctx.createLinearGradient(0, 0, W, 0);
    gr2.addColorStop(0, '#FF4A4A'); gr2.addColorStop(1, '#A01818');
    ctx.fillStyle = gr2; ctx.fillRect(0, BY, W, 5);
    ctx.fillStyle = 'rgba(10,15,13,0.96)'; ctx.fillRect(0, BY+5, W, BAND_H-5);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#F5C518'; ctx.font = 'bold 22px Arial, sans-serif';
    ctx.fillText('VITÓRIA POR WALKOVER', W/2, BY + 52);
    const wParts = winner.split(' & ');
    ctx.fillStyle = '#F0F7F3';
    if (wParts.length === 2) {
      ctx.font = 'bold 30px Arial, sans-serif';
      ctx.fillText(wParts[0], W/2, BY + 96);
      ctx.fillText(wParts[1], W/2, BY + 136);
    } else {
      ctx.font = 'bold 34px Arial, sans-serif';
      ctx.fillText(winner, W/2, BY + 114);
    }

    _panfletoShare(canvas, `wo-jogo-${jogo.id || 'x'}.png`);
  }

  const logo = new Image();
  logo.onload = () => drawWoCanvas(logo);
  logo.onerror = () => drawWoCanvas(null);
  logo.src = 'playpadellogo.jpg';
};

// ── Panfleto: Jogo Suspenso ───────────────────────────────────
window._gerarPanfletoSuspenso = function(jogo) {
  const W = 1080, H = 1350;
  const CAT_CLR = { M1:'#4A9EFF', M2:'#00C37B', M3:'#39FF8F', M4:'#F5C518', M5:'#FF9A3C', F1:'#FF6BB0', F2:'#C97BFF' };
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const ORANGE = '#FF9A3C';

  const s   = jogo.suspenso || {};
  const cat = (jogo.grupo || '').split(/[-\s]/)[0];
  const catClr = CAT_CLR[cat] || '#8AA396';

  function draw(logoImg) {
    // Background
    ctx.fillStyle = '#080D0B';
    ctx.fillRect(0, 0, W, H);
    // Grid pattern
    ctx.save();
    ctx.strokeStyle = 'rgba(255,154,60,0.04)';
    ctx.lineWidth = 1;
    for (let y = 0; y < H; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    for (let x = 0; x < W; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    ctx.restore();

    // Logo
    const LOGO_SZ = 68, LX = (W - LOGO_SZ) / 2, LY = 52;
    if (logoImg) {
      ctx.save();
      ctx.beginPath(); ctx.arc(LX + LOGO_SZ/2, LY + LOGO_SZ/2, LOGO_SZ/2, 0, Math.PI*2); ctx.clip();
      ctx.drawImage(logoImg, LX, LY, LOGO_SZ, LOGO_SZ);
      ctx.restore();
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = '#00C37B'; ctx.font = 'bold 32px Arial, sans-serif';
    ctx.fillText('PLAY PADEL COOP', W/2, LY + LOGO_SZ + 44);
    ctx.fillStyle = '#8AA396'; ctx.font = '21px Arial, sans-serif';
    ctx.fillText('TORNEIO ANIVERSÁRIO 2026', W/2, LY + LOGO_SZ + 76);
    const sepY = LY + LOGO_SZ + 102;
    ctx.strokeStyle = 'rgba(255,154,60,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(80, sepY); ctx.lineTo(W-80, sepY); ctx.stroke();

    // ⏸ Badge circle
    const cx = W/2, cBY = sepY + 148, RR = 112;
    const radGrad = ctx.createRadialGradient(cx, cBY, 0, cx, cBY, RR + 60);
    radGrad.addColorStop(0, 'rgba(255,154,60,0.18)'); radGrad.addColorStop(1, 'rgba(255,154,60,0)');
    ctx.fillStyle = radGrad; ctx.fillRect(cx-RR-60, cBY-RR-60, (RR+60)*2, (RR+60)*2);
    ctx.beginPath(); ctx.arc(cx, cBY, RR, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,154,60,0.10)'; ctx.fill();
    ctx.strokeStyle = ORANGE; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = ORANGE; ctx.textAlign = 'center';
    ctx.font = 'bold 82px Arial, sans-serif'; ctx.fillText('⏸', cx, cBY + 30);
    ctx.font = 'bold 40px Arial, sans-serif'; ctx.fillText('INTERROMPIDO', cx, cBY + RR + 56);
    ctx.fillStyle = '#8AA396'; ctx.font = '22px Arial, sans-serif';
    ctx.fillText('Jogo suspenso — será retomado', cx, cBY + RR + 92);

    // Match meta (grupo, data, hora, campo)
    const MIY = cBY + RR + 152;
    const bw = ctx.measureText((jogo.grupo||'').toUpperCase()).width + 44;
    ctx.fillStyle = catClr + '28';
    ctx.beginPath(); ctx.roundRect((W-bw)/2, MIY, bw, 40, 8); ctx.fill();
    ctx.fillStyle = catClr; ctx.font = 'bold 20px Arial, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText((jogo.grupo||'').toUpperCase(), W/2, MIY + 27);
    const meta = [jogo.data ? ppFormatDate(jogo.data) : '', jogo.hora, (jogo.campo && jogo.campo !== '—') ? jogo.campo : ''].filter(Boolean).join('  ·  ');
    ctx.fillStyle = '#8AA396'; ctx.font = '20px Arial, sans-serif';
    ctx.fillText(meta, W/2, MIY + 74);

    // Teams
    const PAD = 60, TY = MIY + 168;
    function drawTeam(name, xBase, align) {
      const parts = name.split(' & ');
      ctx.fillStyle = '#F0F7F3';
      ctx.textAlign = align;
      ctx.font = `bold ${parts.length === 2 ? 31 : 35}px Arial, sans-serif`;
      if (parts.length === 2) { ctx.fillText(parts[0], xBase, TY - 16); ctx.fillText(parts[1], xBase, TY + 26); }
      else { ctx.fillText(name, xBase, TY + 6); }
    }
    drawTeam(jogo.eq1, PAD, 'left');
    drawTeam(jogo.eq2, W-PAD, 'right');
    ctx.fillStyle = '#8AA396'; ctx.font = '20px Arial, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('VS', W/2, TY + 6);

    // Partial scores
    const SCRY = TY + 70;
    const setLines = [
      s.s1eq1 != null ? `1.º Set:  ${s.s1eq1} – ${s.s1eq2}` : null,
      s.s2eq1 != null ? `2.º Set:  ${s.s2eq1} – ${s.s2eq2}` : null,
      s.s3eq1 != null ? `3.º Set:  ${s.s3eq1} – ${s.s3eq2}` : null,
    ].filter(Boolean);
    if (setLines.length) {
      ctx.fillStyle = 'rgba(255,154,60,0.10)';
      const bh = setLines.length * 36 + 20;
      ctx.beginPath(); ctx.roundRect(W/2 - 160, SCRY, 320, bh, 8); ctx.fill();
      ctx.strokeStyle = 'rgba(255,154,60,0.3)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(W/2 - 160, SCRY, 320, bh, 8); ctx.stroke();
      ctx.fillStyle = ORANGE; ctx.textAlign = 'center'; ctx.font = 'bold 22px Arial, sans-serif';
      setLines.forEach((line, i) => ctx.fillText(line, W/2, SCRY + 28 + i * 36));
    }

    // Serve indicator
    let serveY = setLines.length ? SCRY + setLines.length * 36 + 38 : SCRY + 20;
    if (s.serve && s.serve !== 'eq1' && s.serve !== 'eq2') {
      const label = '\u26a1 A servir: ';
      const name  = s.serve;
      // Measure both parts at their respective fonts so we can center the combined string
      ctx.font = '20px Arial, sans-serif';
      const labelW = ctx.measureText(label).width;
      ctx.font = 'bold 20px Arial, sans-serif';
      const nameW  = ctx.measureText(name).width;
      const totalW = labelW + nameW;
      const startX = W/2 - totalW/2;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#8AA396'; ctx.font = '20px Arial, sans-serif';
      ctx.fillText(label, startX, serveY);
      ctx.fillStyle = ORANGE; ctx.font = 'bold 20px Arial, sans-serif';
      ctx.fillText(name, startX + labelW, serveY);
      ctx.textAlign = 'center';
      serveY += 36;
    }

    // Footer band
    const BAND_H = 190, BY = H - BAND_H;
    const gr2 = ctx.createLinearGradient(0, 0, W, 0);
    gr2.addColorStop(0, ORANGE); gr2.addColorStop(1, '#A05010');
    ctx.fillStyle = gr2; ctx.fillRect(0, BY, W, 5);
    ctx.fillStyle = 'rgba(10,15,13,0.96)'; ctx.fillRect(0, BY+5, W, BAND_H-5);
    ctx.textAlign = 'center';
    ctx.fillStyle = ORANGE; ctx.font = 'bold 22px Arial, sans-serif';
    ctx.fillText('JOGO INTERROMPIDO', W/2, BY + 52);
    if (s.nota) {
      ctx.fillStyle = '#8AA396'; ctx.font = '20px Arial, sans-serif';
      // Wrap nota if too long
      const maxW = W - 160;
      const words = s.nota.split(' ');
      let line = '', lineY = BY + 92;
      words.forEach(w => {
        const test = line + (line ? ' ' : '') + w;
        if (ctx.measureText(test).width > maxW && line) {
          ctx.fillText(line, W/2, lineY); line = w; lineY += 30;
        } else { line = test; }
      });
      if (line) ctx.fillText(line, W/2, lineY);
    } else {
      ctx.fillStyle = '#8AA396'; ctx.font = '20px Arial, sans-serif';
      ctx.fillText('Aguardar nova data para retoma', W/2, BY + 92);
    }

    _panfletoShare(canvas, `suspenso-jogo-${jogo.id || 'x'}.png`);
  }

  const logo = new Image();
  logo.onload = () => draw(logo);
  logo.onerror = () => draw(null);
  logo.src = 'playpadellogo.jpg';
};

// ── Panfleto: Jogo Adiado ─────────────────────────────────────
window._gerarPanfletoAdiado = function(jogo) {
  if (!jogo) return toast('Jogo não encontrado.', 'error');
  const W = 1080, H = 1350;
  const CAT_CLR = { M1:'#4A9EFF', M2:'#00C37B', M3:'#39FF8F', M4:'#F5C518', M5:'#FF9A3C', F1:'#FF6BB0', F2:'#C97BFF' };
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const BLUE = '#6B9CF7';

  const a   = jogo.adiado || {};
  const cat = (jogo.grupo || '').split(/[-\s]/)[0];
  const catClr = CAT_CLR[cat] || '#8AA396';

  function draw(logoImg) {
    // Background
    ctx.fillStyle = '#080D0B';
    ctx.fillRect(0, 0, W, H);
    // Grid
    ctx.save();
    ctx.strokeStyle = 'rgba(107,156,247,0.04)';
    ctx.lineWidth = 1;
    for (let y = 0; y < H; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    for (let x = 0; x < W; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    ctx.restore();

    // Logo
    const LOGO_SZ = 68, LX = (W - LOGO_SZ) / 2, LY = 52;
    if (logoImg) {
      ctx.save();
      ctx.beginPath(); ctx.arc(LX + LOGO_SZ/2, LY + LOGO_SZ/2, LOGO_SZ/2, 0, Math.PI*2); ctx.clip();
      ctx.drawImage(logoImg, LX, LY, LOGO_SZ, LOGO_SZ);
      ctx.restore();
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = '#00C37B'; ctx.font = 'bold 32px Arial, sans-serif';
    ctx.fillText('PLAY PADEL COOP', W/2, LY + LOGO_SZ + 44);
    ctx.fillStyle = '#8AA396'; ctx.font = '21px Arial, sans-serif';
    ctx.fillText('TORNEIO ANIVERSÁRIO 2026', W/2, LY + LOGO_SZ + 76);
    const sepY = LY + LOGO_SZ + 102;
    ctx.strokeStyle = 'rgba(107,156,247,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(80, sepY); ctx.lineTo(W-80, sepY); ctx.stroke();

    // 📅 Badge circle
    const cx = W/2, cBY = sepY + 148, RR = 112;
    const radGrad = ctx.createRadialGradient(cx, cBY, 0, cx, cBY, RR + 60);
    radGrad.addColorStop(0, 'rgba(107,156,247,0.18)'); radGrad.addColorStop(1, 'rgba(107,156,247,0)');
    ctx.fillStyle = radGrad; ctx.fillRect(cx-RR-60, cBY-RR-60, (RR+60)*2, (RR+60)*2);
    ctx.beginPath(); ctx.arc(cx, cBY, RR, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(107,156,247,0.10)'; ctx.fill();
    ctx.strokeStyle = BLUE; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = BLUE; ctx.textAlign = 'center';
    ctx.font = 'bold 82px Arial, sans-serif'; ctx.fillText('📅', cx, cBY + 30);
    ctx.font = 'bold 40px Arial, sans-serif'; ctx.fillText('ADIADO', cx, cBY + RR + 56);
    ctx.fillStyle = '#8AA396'; ctx.font = '22px Arial, sans-serif';
    ctx.fillText('Jogo adiado — nova data a confirmar', cx, cBY + RR + 92);

    // Match meta
    const MIY = cBY + RR + 152;
    const bw = ctx.measureText((jogo.grupo||'').toUpperCase()).width + 44;
    ctx.fillStyle = catClr + '28';
    ctx.beginPath(); ctx.roundRect((W-bw)/2, MIY, bw, 40, 8); ctx.fill();
    ctx.fillStyle = catClr; ctx.font = 'bold 20px Arial, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText((jogo.grupo||'').toUpperCase(), W/2, MIY + 27);
    const meta = [jogo.data ? ppFormatDate(jogo.data) : '', jogo.hora, (jogo.campo && jogo.campo !== '—') ? jogo.campo : ''].filter(Boolean).join('  ·  ');
    ctx.fillStyle = '#8AA396'; ctx.font = '20px Arial, sans-serif';
    ctx.fillText(meta + (meta ? '  ·  Cancelado' : 'Data original cancelada'), W/2, MIY + 74);

    // Teams
    const PAD = 60, TY = MIY + 168;
    function drawTeam(name, xBase, align) {
      const parts = name.split(' & ');
      ctx.fillStyle = '#F0F7F3';
      ctx.textAlign = align;
      ctx.font = `bold ${parts.length === 2 ? 31 : 35}px Arial, sans-serif`;
      if (parts.length === 2) { ctx.fillText(parts[0], xBase, TY - 16); ctx.fillText(parts[1], xBase, TY + 26); }
      else { ctx.fillText(name, xBase, TY + 6); }
    }
    drawTeam(jogo.eq1 || '?', PAD, 'left');
    drawTeam(jogo.eq2 || '?', W-PAD, 'right');
    ctx.fillStyle = '#8AA396'; ctx.font = '20px Arial, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('VS', W/2, TY + 6);

    // Motivo box
    if (a.motivo) {
      const MOY = TY + 80;
      ctx.fillStyle = 'rgba(107,156,247,0.10)';
      ctx.beginPath(); ctx.roundRect(W/2 - 240, MOY, 480, 66, 8); ctx.fill();
      ctx.strokeStyle = 'rgba(107,156,247,0.3)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(W/2 - 240, MOY, 480, 66, 8); ctx.stroke();
      ctx.fillStyle = '#8AA396'; ctx.font = '18px Arial, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Motivo', W/2, MOY + 24);
      ctx.fillStyle = BLUE; ctx.font = 'bold 22px Arial, sans-serif';
      // Wrap if too long
      const maxW = 440;
      const words = a.motivo.split(' ');
      let line = '', lineY = MOY + 52;
      words.forEach(w => {
        const test = line + (line ? ' ' : '') + w;
        if (ctx.measureText(test).width > maxW && line) {
          ctx.fillText(line, W/2, lineY); line = w; lineY += 28;
        } else { line = test; }
      });
      if (line) ctx.fillText(line, W/2, lineY);
    }

    // Footer band
    const BAND_H = 190, BY = H - BAND_H;
    const gr2 = ctx.createLinearGradient(0, 0, W, 0);
    gr2.addColorStop(0, BLUE); gr2.addColorStop(1, '#2A3A7A');
    ctx.fillStyle = gr2; ctx.fillRect(0, BY, W, 5);
    ctx.fillStyle = 'rgba(10,15,13,0.96)'; ctx.fillRect(0, BY+5, W, BAND_H-5);
    ctx.textAlign = 'center';
    ctx.fillStyle = BLUE; ctx.font = 'bold 22px Arial, sans-serif';
    ctx.fillText('JOGO ADIADO', W/2, BY + 52);
    ctx.fillStyle = '#8AA396'; ctx.font = '20px Arial, sans-serif';
    ctx.fillText('Aguardar confirmação de nova data e hora', W/2, BY + 92);

    _panfletoShare(canvas, `adiado-jogo-${jogo.id || 'x'}.png`);
  }

  const logo = new Image();
  logo.onload = () => draw(logo);
  logo.onerror = () => draw(null);
  logo.src = 'playpadellogo.jpg';
};

function _buildFotoFlyer(img) {
  const jogo = APP._fotoFlyer?.jogo;
  if (!jogo || !jogo.resultado) return;

  const W = 1080, H = 1350, BAND_H = 340, PAD = 52;
  const CAT_CLR = { M1:'#4A9EFF', M2:'#00C37B', M3:'#39FF8F', M4:'#F5C518', M5:'#FF9A3C', F1:'#FF6BB0', F2:'#C97BFF' };

  const canvas = document.getElementById('fotoFlyerCanvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Store img reference for re-render on zoom/pan change
  if (APP._fotoFlyer) APP._fotoFlyer.img = img;

  // Photo with zoom + pan
  const zoomFactor = (parseInt(document.getElementById('fotoFlyerZoom')?.value ?? 100)) / 100;
  const panX = parseInt(document.getElementById('fotoFlyerPanX')?.value ?? 0) / 100;
  const panY = parseInt(document.getElementById('fotoFlyerPanY')?.value ?? 0) / 100;
  const baseScl = Math.max(W / img.naturalWidth, H / img.naturalHeight);
  const scl = baseScl * zoomFactor;
  const iw = img.naturalWidth * scl, ih = img.naturalHeight * scl;
  const baseX = (W - iw) / 2, baseY = (H - ih) / 2;
  ctx.drawImage(img, baseX * (1 - panX), baseY * (1 - panY), iw, ih);

  // Gradient overlay photo → dark band
  const grad = ctx.createLinearGradient(0, H - BAND_H - 260, 0, H);
  grad.addColorStop(0, 'rgba(10,15,13,0)');
  grad.addColorStop(0.45, 'rgba(10,15,13,0.72)');
  grad.addColorStop(1, 'rgba(10,15,13,0.98)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, H - BAND_H - 260, W, BAND_H + 260);

  // Green top stripe
  const bandY = H - BAND_H;
  const grd = ctx.createLinearGradient(0, 0, W, 0);
  grd.addColorStop(0, '#00C37B'); grd.addColorStop(1, '#007A4E');
  ctx.fillStyle = grd; ctx.fillRect(0, bandY, W, 7);

  // Band background
  ctx.fillStyle = 'rgba(10,15,13,0.95)';
  ctx.fillRect(0, bandY + 7, W, BAND_H - 7);

  function drawBand(logoImg) {
    const LOGO_SZ = 56;
    const textX = logoImg ? PAD + LOGO_SZ + 14 : PAD;

    // Logo circle in band
    if (logoImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(PAD + LOGO_SZ / 2, bandY + 16 + LOGO_SZ / 2, LOGO_SZ / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(logoImg, PAD, bandY + 16, LOGO_SZ, LOGO_SZ);
      ctx.restore();
    }

    const { w1, w2 } = matchSetsScore(jogo.resultado);
    const r = jogo.resultado;
    const _tbScores = [[r.tb1eq1,r.tb1eq2],[r.tb2eq1,r.tb2eq2],[r.tb3eq1,r.tb3eq2]];
    const sets = r.wo ? 'Walkover (W.O.)' : [[r.s1eq1,r.s1eq2],[r.s2eq1,r.s2eq2],[r.s3eq1,r.s3eq2]]
      .filter(([a]) => a !== null)
      .map(([a, b], i) => { const [ta,tb] = _tbScores[i]; return `${a}-${b}${ta != null ? ` (${ta}-${tb})` : ''}`; })
      .join('  /  ');
    const eq1Won = w1 > w2;

    // Branding line
    ctx.textAlign = 'left';
    ctx.fillStyle = '#00C37B';
    ctx.font = 'bold 27px Arial, sans-serif';
    ctx.fillText('PLAY PADEL COOP', textX, bandY + 50);
    const ppw = ctx.measureText('PLAY PADEL COOP').width;
    ctx.fillStyle = '#8AA396';
    ctx.font = '20px Arial, sans-serif';
    ctx.fillText('· TORNEIO ANIVERSÁRIO 2026', textX + ppw + 12, bandY + 50);

    // Category badge
    const cat = (jogo.grupo || 'M1').split('-')[0];
    const catClr = CAT_CLR[cat] || '#8AA396';
    const bw = ctx.measureText(jogo.grupo.toUpperCase()).width + 36;
    ctx.fillStyle = catClr + '28';
    ctx.beginPath(); ctx.roundRect(textX, bandY + 66, bw, 36, 6); ctx.fill();
    ctx.fillStyle = catClr;
    ctx.font = 'bold 17px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(jogo.grupo.toUpperCase(), textX + bw / 2, bandY + 89);
    ctx.textAlign = 'left';

    // Date / campo
    ctx.fillStyle = '#8AA396';
    ctx.font = '18px Arial, sans-serif';
    const dateStr = (jogo.data ? ppFormatDate(jogo.data) : '') +
      (jogo.hora ? '  ·  ' + jogo.hora : '') +
      (jogo.campo && jogo.campo !== '—' ? '  ·  ' + jogo.campo : '');
    ctx.fillText(dateStr, textX + bw + 18, bandY + 89);

    // Teams + score
    const scoreY = bandY + 200;

    function drawTeam(name, x, align, won) {
      const parts = name.split(' & ');
      ctx.fillStyle = won ? '#39FF8F' : '#8AA396';
      ctx.textAlign = align;
      if (parts.length === 2) {
        ctx.font = 'bold 30px Arial, sans-serif';
        ctx.fillText(parts[0], x, scoreY - 20);
        ctx.fillText(parts[1], x, scoreY + 18);
      } else {
        ctx.font = 'bold 33px Arial, sans-serif';
        ctx.fillText(name, x, scoreY);
      }
      ctx.textAlign = 'left';
    }

    drawTeam(jogo.eq1, PAD, 'left', eq1Won);
    drawTeam(jogo.eq2, W - PAD, 'right', !eq1Won);

    // Score
    ctx.fillStyle = '#F0F7F3';
    ctx.font = 'bold 80px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${w1} – ${w2}`, W / 2, scoreY + 10);

    // Sets detail
    ctx.fillStyle = '#8AA396';
    ctx.font = '19px Arial, sans-serif';
    ctx.fillText(sets, W / 2, scoreY + 50);

    // Winner row
    const winner = eq1Won ? jogo.eq1 : jogo.eq2;
    ctx.fillStyle = '#F5C518';
    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.fillText('🏆  VENCEDOR', W / 2, bandY + BAND_H - 48);
    ctx.fillStyle = '#F0F7F3';
    ctx.font = 'bold 26px Arial, sans-serif';
    ctx.fillText(winner, W / 2, bandY + BAND_H - 16);
    ctx.textAlign = 'left';

    document.getElementById('fotoFlyerPreview').style.display = 'block';
  }

  // Load logo then draw the band overlay
  const logo = new Image();
  logo.onload = () => drawBand(logo);
  logo.onerror = () => drawBand(null);
  logo.src = 'playpadellogo.jpg';
}

window._rebuildFotoFlyer = function() {
  const img = APP._fotoFlyer?.img;
  if (img) _buildFotoFlyer(img);
};

window._downloadFotoFlyer = function() {
  const canvas = document.getElementById('fotoFlyerCanvas');
  const jogo = APP._fotoFlyer?.jogo;
  const a = document.createElement('a');
  a.download = `resultado-${jogo ? String(jogo.id).replace(/[^a-z0-9]/gi, '-') : 'jogo'}.png`;
  a.href = canvas.toDataURL('image/png');
  a.click();
};

window._shareWhatsapp = async function() {
  const canvas = document.getElementById('fotoFlyerCanvas');
  const jogo = APP._fotoFlyer?.jogo;
  if (!jogo) return;
  const filename = `resultado-${String(jogo.id).replace(/[^a-z0-9]/gi, '-')}.png`;
  canvas.toBlob(async blob => {
    const file = new File([blob], filename, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Resultado Play Padel Coop' });
      } catch (err) {
        if (err.name !== 'AbortError') _downloadFotoFlyer();
      }
    } else {
      // Fallback: open WhatsApp web with text result
      const { w1, w2 } = matchSetsScore(jogo.resultado);
      const r = jogo.resultado;
      const _tbSW = [[r.tb1eq1,r.tb1eq2],[r.tb2eq1,r.tb2eq2],[r.tb3eq1,r.tb3eq2]];
      const sets = r.wo ? 'W.O.' : [[r.s1eq1,r.s1eq2],[r.s2eq1,r.s2eq2],[r.s3eq1,r.s3eq2]]
        .filter(([a]) => a !== null).map(([a, b], i) => { const [ta,tb] = _tbSW[i]; return `${a}-${b}${ta != null ? ` (${ta}-${tb})` : ''}`; }).join(' / ');
      const winner = w1 > w2 ? jogo.eq1 : jogo.eq2;
      const texto = `\u{1F3BE} *Play Padel Coop \u00B7 Torneio Anivers\u00E1rio*\n\n` +
        `\u{1F3C6} *${escHtml(jogo.grupo)}*\n` +
        `${jogo.data ? ppFormatDate(jogo.data) : ''}${jogo.hora ? ' \u00B7 ' + jogo.hora : ''}\n\n` +
        `*${jogo.eq1}*  ${w1} \u2013 ${w2}  *${jogo.eq2}*\n` +
        `Sets: ${sets}\n\n` +
        `\u{1F3C6} Vencedor: *${winner}*`;
      window.open('https://wa.me/?text=' + encodeURIComponent(texto), '_blank');
    }
  }, 'image/png');
};

// ============================================
//  PANFLETO RESULTADOS
// ============================================
window.gerarPanfletoResultados = function() {
  const filtroData = document.getElementById('filtroDataRes').value;
  let jogos = getData('jogos').filter(j => j.resultado);
  if (filtroData !== 'todos') jogos = jogos.filter(j => j.data === filtroData);
  if (!jogos.length) return toast('Sem resultados para o filtro actual.', 'error');
  jogos = [...jogos].sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora) || a.campo.localeCompare(b.campo));

  const W = 1080, PAD = 44, ROW_H = 88, HEAD_H = 218, FOOT_H = 64;
  const H = HEAD_H + jogos.length * ROW_H + FOOT_H;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  function rTrunc(text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    while (text.length && ctx.measureText(text + '\u2026').width > maxW) text = text.slice(0, -1);
    return text + '\u2026';
  }
  function rDrawTeam(text, x, rowY, maxW, align) {
    const parts = text.split(' & ');
    ctx.font = '18px Arial, sans-serif';
    ctx.textAlign = align || 'left';
    if (parts.length === 1) {
      ctx.fillText(rTrunc(parts[0], maxW), x, rowY + ROW_H * 0.57);
    } else {
      ctx.fillText(rTrunc(parts[0], maxW), x, rowY + ROW_H * 0.40);
      ctx.fillText(rTrunc(parts[1], maxW), x, rowY + ROW_H * 0.72);
    }
    ctx.textAlign = 'left';
  }
  function rBadge(x, y, w, h, r, bg, fg, text, fs) {
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
    ctx.fillStyle = fg;
    ctx.font = `bold ${fs}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(text, x + w / 2, y + h * 0.69);
    ctx.textAlign = 'left';
  }

  const COURT_CLR = { 'Play Padel': '#00C37B', 'TVCabo': '#4A9EFF', 'Stella Artois': '#F5C518' };
  const CAT_CLR   = { M1: '#4A9EFF', M2: '#00C37B', M3: '#39FF8F', M4: '#F5C518', M5: '#FF9A3C', F1: '#FF6BB0', F2: '#C97BFF' };
  const CX = { data: PAD, hora: PAD + 66, campo: PAD + 148, grupo: PAD + 322, eq1r: 604, score_cx: 664, eq2: 726 };

  // Background
  ctx.fillStyle = '#0A0F0D';
  ctx.fillRect(0, 0, W, H);

  // Top bar
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, '#00C37B'); grad.addColorStop(1, '#007A4E');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, 10);

  // Header
  ctx.fillStyle = '#00C37B';
  ctx.font = 'bold 52px Arial, sans-serif';
  ctx.fillText('PLAY PADEL', PAD, 72);
  ctx.fillStyle = '#F0F7F3';
  ctx.font = '32px Arial, sans-serif';
  ctx.fillText('TORNEIO ANIVERSÁRIO 2026', PAD, 112);
  const dayStr = filtroData !== 'todos'
    ? filtroData.split('-').reverse().join('/')
    : 'TODOS OS DIAS';
  ctx.fillStyle = '#8AA396';
  ctx.font = '22px Arial, sans-serif';
  ctx.fillText(dayStr, PAD, 146);
  ctx.fillStyle = '#F0F7F3';
  ctx.font = 'bold 20px Arial, sans-serif';
  ctx.fillText(`RESULTADOS  \u00B7  ${jogos.length} JOGO${jogos.length !== 1 ? 'S' : ''}`, PAD, 176);

  // Divider
  ctx.fillStyle = '#1C2620'; ctx.fillRect(PAD, 188, W - PAD * 2, 2);

  // Column headers
  ctx.fillStyle = '#4A6058'; ctx.font = 'bold 13px Arial, sans-serif';
  ctx.fillText('DATA',      CX.data,  205);
  ctx.fillText('HORA',      CX.hora,  205);
  ctx.textAlign = 'center';
  ctx.fillText('CAMPO',     CX.campo + 78, 205);
  ctx.fillText('GRUPO',     CX.grupo + 40, 205);
  ctx.textAlign = 'right';
  ctx.fillText('EQUIPA 1',  CX.eq1r,  205);
  ctx.textAlign = 'center';
  ctx.fillText('RESULTADO', CX.score_cx, 205);
  ctx.textAlign = 'left';
  ctx.fillText('EQUIPA 2',  CX.eq2,   205);

  // Rows
  jogos.forEach((j, i) => {
    const y = HEAD_H + i * ROW_H;
    const cat = j.grupo.split('-')[0];
    const cc = COURT_CLR[j.campo] || '#8AA396';
    const gc = CAT_CLR[cat] || '#8AA396';

    const r = j.resultado;
    const { w1, w2 } = matchSetsScore(r);
    const winner = w1 > w2 ? 1 : 2;
    const setsArr = r.wo ? [] : [[r.s1eq1, r.s1eq2], [r.s2eq1, r.s2eq2], [r.s3eq1, r.s3eq2]].filter(([a]) => a != null);
    const setsStr = r.wo ? 'W.O.' : setsArr.map(([a, b]) => `${a}-${b}`).join('  ');

    ctx.fillStyle = i % 2 === 0 ? '#111815' : '#0D1410';
    ctx.fillRect(0, y, W, ROW_H);
    ctx.fillStyle = cc; ctx.fillRect(0, y + 1, 6, ROW_H - 2);

    const cy = y + ROW_H / 2 + 9;

    // Date
    ctx.fillStyle = '#8AA396';
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillText(j.data ? j.data.split('-').slice(1).reverse().join('/') : '', CX.data, cy);

    // Time
    ctx.fillStyle = '#F0F7F3';
    ctx.font = 'bold 22px "Courier New", monospace';
    ctx.fillText(j.hora, CX.hora, cy);

    rBadge(CX.campo, y + (ROW_H - 30) / 2, 156, 30, 6, cc + '28', cc, j.campo, 13);
    rBadge(CX.grupo, y + (ROW_H - 30) / 2,  80, 30, 6, gc + '28', gc, j.grupo, 13);

    // Eq1 (right-aligned, bright if winner)
    ctx.fillStyle = winner === 1 ? '#39FF8F' : '#8AA396';
    rDrawTeam(j.eq1, CX.eq1r, y, 196, 'right');

    // Score badge
    const sbW = 112, sbH = 32;
    const sbX = CX.score_cx - sbW / 2;
    const sbY = y + (ROW_H - sbH) / 2;
    ctx.fillStyle = 'rgba(0,195,123,0.12)';
    ctx.beginPath(); ctx.roundRect(sbX, sbY, sbW, sbH, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(0,195,123,0.40)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(sbX, sbY, sbW, sbH, 6); ctx.stroke();
    ctx.fillStyle = '#39FF8F';
    ctx.font = 'bold 15px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(setsStr, CX.score_cx, sbY + sbH * 0.70);
    ctx.textAlign = 'left';

    // Eq2 (left-aligned, bright if winner)
    ctx.fillStyle = winner === 2 ? '#39FF8F' : '#8AA396';
    rDrawTeam(j.eq2, CX.eq2, y, 308, 'left');
  });

  // Footer
  const fy = H - FOOT_H;
  ctx.fillStyle = '#111815'; ctx.fillRect(0, fy, W, FOOT_H);
  ctx.fillStyle = '#1C2620'; ctx.fillRect(0, fy, W, 1);
  ctx.fillStyle = '#4A6058'; ctx.font = '17px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Play Padel  \u00B7  Torneio Aniversário 2026', W / 2, fy + 38);
  ctx.textAlign = 'left';

  _panfletoShare(canvas, `resultados-${filtroData !== 'todos' ? filtroData : 'todos'}.png`);
};

// ============================================
//  DADOS INICIAIS (mantidos em data.js)
// ============================================
const _UNUSED_DEFAULTS = {
  campos: [
    { id: 1, nome: 'Play Padel',    icone: '🎾', cor: '#00C37B', activo: true },
    { id: 2, nome: 'TVCabo',        icone: '🎾', cor: '#4A9EFF', activo: true },
    { id: 3, nome: 'Stella Artois', icone: '🎾', cor: '#F5C518', activo: true },
  ],
  categorias: [
    { id:'M1', nome:'Masculino 1', tipo:'M', nivel:1 },
    { id:'M2', nome:'Masculino 2', tipo:'M', nivel:2 },
    { id:'M3', nome:'Masculino 3', tipo:'M', nivel:3 },
    { id:'M4', nome:'Masculino 4', tipo:'M', nivel:4 },
    { id:'M5', nome:'Masculino 5', tipo:'M', nivel:5 },
    { id:'F1', nome:'Feminino 1',  tipo:'F', nivel:1 },
    { id:'F2', nome:'Feminino 2',  tipo:'F', nivel:2 },
  ],
  grupos: [
    { id:'M1-A', cat:'M1', letra:'A' }, { id:'M1-B', cat:'M1', letra:'B' }, { id:'M1-C', cat:'M1', letra:'C' },
    { id:'M2-A', cat:'M2', letra:'A' }, { id:'M2-B', cat:'M2', letra:'B' }, { id:'M2-C', cat:'M2', letra:'C' },
    { id:'M3-A', cat:'M3', letra:'A' }, { id:'M3-B', cat:'M3', letra:'B' }, { id:'M3-C', cat:'M3', letra:'C' }, { id:'M3-D', cat:'M3', letra:'D' },
    { id:'M4-A', cat:'M4', letra:'A' }, { id:'M4-B', cat:'M4', letra:'B' }, { id:'M4-C', cat:'M4', letra:'C' }, { id:'M4-D', cat:'M4', letra:'D' },
    { id:'M5-A', cat:'M5', letra:'A' }, { id:'M5-B', cat:'M5', letra:'B' },
    { id:'F1-A', cat:'F1', letra:'A' }, { id:'F1-B', cat:'F1', letra:'B' }, { id:'F1-C', cat:'F1', letra:'C' },
    { id:'F2-A', cat:'F2', letra:'A' }, { id:'F2-B', cat:'F2', letra:'B' }, { id:'F2-C', cat:'F2', letra:'C' },
  ],
  jogadores: [
    // Pré-carregados automaticamente a partir dos jogos
  ],
  jogos: [
    // ---- 5 JUN (CAMPO PLAY PADEL) ----
    { id:1,  data:'2026-06-05', hora:'17:30', campo:'Play Padel',    grupo:'M3-B', eq1:'Edson Uamusse & Salomão',           eq2:'Ivandro Remane & João Peixoto',        resultado:null },
    { id:2,  data:'2026-06-05', hora:'18:30', campo:'Play Padel',    grupo:'F1-A', eq1:'Stacey & Marlou',                   eq2:'Cynthia Cavalcanti & Kátia Sousa',     resultado:null },
    { id:3,  data:'2026-06-05', hora:'19:30', campo:'Play Padel',    grupo:'M1-B', eq1:'Gonçalo Nascimento & João Catela',  eq2:'Naim Hassan & Sidik',                  resultado:null },
    { id:4,  data:'2026-06-05', hora:'20:30', campo:'Play Padel',    grupo:'M1-B', eq1:'Karim Kanifani & Octávio Barros',   eq2:'Rehan Fayaz & Reehan M.',              resultado:null },
    { id:5,  data:'2026-06-05', hora:'21:30', campo:'Play Padel',    grupo:'M2-C', eq1:'Feizan Omar & Filipe Lobo',         eq2:'Ricardo Oliveira & Vasco Silva',       resultado:null },
    // ---- 5 JUN (TVCABO) ----
    { id:6,  data:'2026-06-05', hora:'17:30', campo:'TVCabo',        grupo:'F2-A', eq1:'Cris Vasconcelos & Beatriz Madeira',eq2:'Florence & Jinane',                    resultado:null },
    { id:7,  data:'2026-06-05', hora:'18:30', campo:'TVCabo',        grupo:'F2-A', eq1:'Donatella Detto & Julianna',        eq2:'Ilária & Monica',                      resultado:null },
    { id:8,  data:'2026-06-05', hora:'19:30', campo:'TVCabo',        grupo:'M1-C', eq1:'Ahmad & Uzeir',                    eq2:'Carlos Cardeano & José Santos',        resultado:null },
    { id:9,  data:'2026-06-05', hora:'20:30', campo:'TVCabo',        grupo:'M2-A', eq1:'Luis Trigo de Morais & Ricky Kamissa', eq2:'Frederico Jonet & Francisco Ferreira', resultado:null },
    { id:10, data:'2026-06-05', hora:'21:30', campo:'TVCabo',        grupo:'M2-C', eq1:'Felipe Moniz & José Cossa',        eq2:'Faheem Adamo & Yann Trivellin',        resultado:null },
    // ---- 5 JUN (STELLA ARTOIS) ----
    { id:11, data:'2026-06-05', hora:'17:30', campo:'Stella Artois', grupo:'F2-C', eq1:'Nilda & Lize',                     eq2:'Dalila & Tatiana',                     resultado:null },
    { id:12, data:'2026-06-05', hora:'18:30', campo:'Stella Artois', grupo:'M1-A', eq1:'Bruno Gaspar & Manuel Pinto Abreu',eq2:'Luis Antunes & Manuel Neto',           resultado:null },
    { id:13, data:'2026-06-05', hora:'19:30', campo:'Stella Artois', grupo:'F2-C', eq1:'Saira Sale & Sónia Caravela',      eq2:'Steph & Ronell',                       resultado:null },
    { id:14, data:'2026-06-05', hora:'20:30', campo:'Stella Artois', grupo:'F1-B', eq1:'Maria Tomaz & Isabel Ribeiro',     eq2:'Érica Capela & Sarah Taillon',         resultado:null },
    { id:15, data:'2026-06-05', hora:'21:30', campo:'Stella Artois', grupo:'M3-B', eq1:'Shueb & Sahad',                    eq2:'Ugo Gião & Nuno Henriques',            resultado:null },
    // ---- 6 JUN (CAMPO PLAY PADEL) ----
    { id:16, data:'2026-06-06', hora:'07:00', campo:'Play Padel',    grupo:'F2-B', eq1:'Glória & Luciana Lauriano',        eq2:'Paty & Mila',                          resultado:null },
    { id:17, data:'2026-06-06', hora:'08:00', campo:'Play Padel',    grupo:'M2-B', eq1:'Jameel & Tahir',                   eq2:'Dej Cruz & Fabio Damato',              resultado:null },
    { id:18, data:'2026-06-06', hora:'09:00', campo:'Play Padel',    grupo:'F1-A', eq1:'Helen Khumalo & Narcisa Nhamitambo',eq2:'Caironice & Carmen',                  resultado:null },
    { id:19, data:'2026-06-06', hora:'10:00', campo:'Play Padel',    grupo:'F1-B', eq1:'Inês Pires & Daniela Duarte',      eq2:'Celine Sieu & Ana Pezarat',            resultado:null },
    { id:20, data:'2026-06-06', hora:'12:00', campo:'Play Padel',    grupo:'F1-C', eq1:'Marta Botelho & Ana Oliveira',     eq2:'Diana Carvalho & Ilga João',           resultado:null },
    { id:21, data:'2026-06-06', hora:'13:00', campo:'Play Padel',    grupo:'M1-A', eq1:'Bruno Gaspar & Manuel Pinto Abreu',eq2:'João Alberty & Manel Alberty',         resultado:null },
    { id:22, data:'2026-06-06', hora:'14:00', campo:'Play Padel',    grupo:'F1-C', eq1:'Anouk Fumane & Letícia',           eq2:'Ohmar Fernandes & Claudia',            resultado:null },
    { id:23, data:'2026-06-06', hora:'15:00', campo:'Play Padel',    grupo:'M3-D', eq1:'Sueil & Ahmed Riaze',              eq2:'Elves & Uweizy',                       resultado:null },
    { id:24, data:'2026-06-06', hora:'16:00', campo:'Play Padel',    grupo:'M1-B', eq1:'Rehan Fayaz & Reehan M.',          eq2:'Naim Hassan & Sidik',                  resultado:null },
    { id:25, data:'2026-06-06', hora:'17:00', campo:'Play Padel',    grupo:'M2-A', eq1:'Rui Lourenço & Francisco Pegado',  eq2:'Shezane Arif & Razeen',                resultado:null },
    { id:26, data:'2026-06-06', hora:'18:00', campo:'Play Padel',    grupo:'M1-B', eq1:'Karim Kanifani & Octávio Barros',  eq2:'Gonçalo Nascimento & João Catela',     resultado:null },
    { id:27, data:'2026-06-06', hora:'19:00', campo:'Play Padel',    grupo:'M1-C', eq1:'Tayab & Badru Rosa',               eq2:'Carlos Cardeano & José Santos',        resultado:null },
    { id:28, data:'2026-06-06', hora:'20:00', campo:'Play Padel',    grupo:'M3-C', eq1:'Rui Veríssimo & Pedro Martins',    eq2:'Sharik Omar & Muhamad Mussagy',        resultado:null },
    { id:29, data:'2026-06-06', hora:'21:00', campo:'Play Padel',    grupo:'M3-C', eq1:'Keiss Chiraze & Saif Issa',        eq2:'Akil & Kalil',                         resultado:null },
    // ---- 6 JUN (TVCABO) ----
    { id:30, data:'2026-06-06', hora:'07:00', campo:'TVCabo',        grupo:'M4-D', eq1:'Jason & Bosch',                    eq2:'Luis Vaz & Sérgio Gomes',              resultado:null },
    { id:31, data:'2026-06-06', hora:'08:00', campo:'TVCabo',        grupo:'F2-B', eq1:'Shanel & Kaitlynn',                eq2:'Karina Darsan & Bethany',              resultado:null },
    { id:32, data:'2026-06-06', hora:'09:00', campo:'TVCabo',        grupo:'M5-A', eq1:'Tito Ferrinho & Valdir Jetha',     eq2:'Alcy Heim & Gabriel Heim',             resultado:null },
    { id:33, data:'2026-06-06', hora:'10:00', campo:'TVCabo',        grupo:'M2-B', eq1:'José Moreira & Nuno L. Pereira',   eq2:'João Henriques & Bruno Morais',        resultado:null },
    { id:34, data:'2026-06-06', hora:'14:00', campo:'TVCabo',        grupo:'M2-C', eq1:'Feizan Omar & Filipe Lobo',        eq2:'Faheem Adamo & Yann Trivellin',        resultado:null },
    { id:35, data:'2026-06-06', hora:'15:00', campo:'TVCabo',        grupo:'F2-A', eq1:'Florence & Jinane',                eq2:'Ilária & Monica',                      resultado:null },
    { id:36, data:'2026-06-06', hora:'16:00', campo:'TVCabo',        grupo:'M5-B', eq1:'Mizzy & Zayan Imitiaz',            eq2:'Filipe Ferreira & Paulo Baldaia',      resultado:null },
    { id:37, data:'2026-06-06', hora:'17:00', campo:'TVCabo',        grupo:'F2-A', eq1:'Cris Vasconcelos & Beatriz Madeira',eq2:'Donatella Detto & Julianna',          resultado:null },
    { id:38, data:'2026-06-06', hora:'18:00', campo:'TVCabo',        grupo:'F1-A', eq1:'Stacey & Marlou',                  eq2:'Helen Khumalo & Narcisa Nhamitambo',   resultado:null },
    { id:39, data:'2026-06-06', hora:'19:00', campo:'TVCabo',        grupo:'M4-B', eq1:'Andrea & Mikel Álvarez',           eq2:'Alao Almeida & Ayaan Mussa',           resultado:null },
    // ---- 6 JUN (STELLA ARTOIS) ----
    { id:40, data:'2026-06-06', hora:'07:00', campo:'Stella Artois', grupo:'M3-D', eq1:'Alexandre Salazar & Pedro Gonzalez', eq2:'Gonçalo Marques & Pedro Gonçalves', resultado:null },
    { id:41, data:'2026-06-06', hora:'08:00', campo:'Stella Artois', grupo:'M2-C', eq1:'Felipe Moniz & José Cossa',        eq2:'Ricardo Oliveira & Vasco Silva',       resultado:null },
    { id:42, data:'2026-06-06', hora:'09:00', campo:'Stella Artois', grupo:'M3-A', eq1:'Abdul Ibraimo & Guilherme Godinho',eq2:'Dejan Petrovic & Isidro Simões',       resultado:null },
    { id:43, data:'2026-06-06', hora:'14:00', campo:'Stella Artois', grupo:'F2-C', eq1:'Saira Sale & Sónia Caravela',      eq2:'Nilda & Lize',                         resultado:null },
    { id:44, data:'2026-06-06', hora:'15:00', campo:'Stella Artois', grupo:'F2-C', eq1:'Dalila & Tatiana',                 eq2:'Steph & Ronell',                       resultado:null },
    { id:45, data:'2026-06-06', hora:'16:00', campo:'Stella Artois', grupo:'M5-B', eq1:'Rayhan & Arsheel',                 eq2:'Faheem Aboobakar & Mikaeel Taibo',     resultado:null },
    { id:46, data:'2026-06-06', hora:'17:00', campo:'Stella Artois', grupo:'M3-A', eq1:'José Mestre & Koenraad',           eq2:'Burhan Hassan & Sarfaraz',             resultado:null },
    { id:47, data:'2026-06-06', hora:'18:00', campo:'Stella Artois', grupo:'M4-C', eq1:'Paul & Xander',                   eq2:'Shiraz & Kheizar',                     resultado:null },
    { id:48, data:'2026-06-06', hora:'19:00', campo:'Stella Artois', grupo:'M4-C', eq1:'Fádhil Khan & Kelyo',              eq2:'Reihan Adamo & Nabil Manga',           resultado:null },
    // ---- 7 JUN (CAMPO PLAY PADEL) ----
    { id:49, data:'2026-06-07', hora:'07:00', campo:'Play Padel',    grupo:'M4-A', eq1:'João Pignatelli & Joel Almeida',   eq2:'Pablo & Galo Rivera',                  resultado:null },
    { id:50, data:'2026-06-07', hora:'08:00', campo:'Play Padel',    grupo:'F1-B', eq1:'Maria Tomaz & Isabel Ribeiro',     eq2:'Celine Sieu & Ana Pezarat',            resultado:null },
    { id:51, data:'2026-06-07', hora:'09:00', campo:'Play Padel',    grupo:'M3-C', eq1:'Sharik Omar & Muhamad Mussagy',    eq2:'Akil & Kalil',                         resultado:null },
    { id:52, data:'2026-06-07', hora:'10:00', campo:'Play Padel',    grupo:'M5-A', eq1:'Alcy Heim & Gabriel Heim',         eq2:'Hamdan & Huzeifah',                    resultado:null },
    { id:53, data:'2026-06-07', hora:'11:00', campo:'Play Padel',    grupo:'F1-C', eq1:'Omar Fernandes & Claudia',         eq2:'Diana Carvalho & Ilga João',           resultado:null },
    { id:54, data:'2026-06-07', hora:'12:00', campo:'Play Padel',    grupo:'M1-A', eq1:'Bruno Gaspar & Manuel Pinto Abreu',eq2:'Faizal & Sherial',                     resultado:null },
    { id:55, data:'2026-06-07', hora:'13:00', campo:'Play Padel',    grupo:'M1-B', eq1:'Rehan Fayaz & Reehan M.',          eq2:'Gonçalo Nascimento & João Catela',     resultado:null },
    { id:56, data:'2026-06-07', hora:'14:00', campo:'Play Padel',    grupo:'M2-A', eq1:'Frederico Jonet & Francisco Ferreira', eq2:'Shezane Arif & Razeen',           resultado:null },
    { id:57, data:'2026-06-07', hora:'15:00', campo:'Play Padel',    grupo:'M1-C', eq1:'Carlos Cardeano & José Santos',    eq2:'Fernando & Rui Rocha',                 resultado:null },
    { id:58, data:'2026-06-07', hora:'16:00', campo:'Play Padel',    grupo:'F1-B', eq1:'Érica Capela & Sarah Taillon',     eq2:'Inês Pires & Daniela Duarte',          resultado:null },
    { id:59, data:'2026-06-07', hora:'17:00', campo:'Play Padel',    grupo:'M1-B', eq1:'Karim Kanifani & Octávio Barros',  eq2:'Naim Hassan & Sidik',                  resultado:null },
    { id:60, data:'2026-06-07', hora:'18:00', campo:'Play Padel',    grupo:'M1-C', eq1:'Tayab & Badru Rosa',               eq2:'Ahmad & Uzeir',                        resultado:null },
    { id:61, data:'2026-06-07', hora:'19:00', campo:'Play Padel',    grupo:'M3-C', eq1:'Rui Veríssimo & Pedro Martins',    eq2:'Keiss Chiraze & Saif Issa',            resultado:null },
    { id:62, data:'2026-06-07', hora:'20:00', campo:'Play Padel',    grupo:'M2-A', eq1:'Luis Trigo de Morais & Ricky Kamissa', eq2:'Rui Lourenço & Francisco Pegado', resultado:null },
    // ---- 7 JUN (TVCABO) ----
    { id:63, data:'2026-06-07', hora:'07:00', campo:'TVCabo',        grupo:'F2-A', eq1:'Cris Vasconcelos & Beatriz Madeira',eq2:'Ilária & Monica',                     resultado:null },
    { id:64, data:'2026-06-07', hora:'08:00', campo:'TVCabo',        grupo:'F2-A', eq1:'Florence & Jinane',                eq2:'Donatella Detto & Julianna',           resultado:null },
    { id:65, data:'2026-06-07', hora:'09:00', campo:'TVCabo',        grupo:'M3-B', eq1:'Ugo Gião & Nuno Henriques',        eq2:'Edson Uamusse & Salomão',              resultado:null },
    { id:66, data:'2026-06-07', hora:'10:00', campo:'TVCabo',        grupo:'F1-A', eq1:'Stacey & Marlou',                  eq2:'Caironice & Carmen',                   resultado:null },
    { id:67, data:'2026-06-07', hora:'11:00', campo:'TVCabo',        grupo:'F1-A', eq1:'Helen Khumalo & Narcisa Nhamitambo',eq2:'Cynthia Cavalcanti & Kátia Sousa',    resultado:null },
    { id:68, data:'2026-06-07', hora:'12:00', campo:'TVCabo',        grupo:'M4-B', eq1:'Duncan & James',                   eq2:'Andrea & Mikel Álvarez',               resultado:null },
    { id:69, data:'2026-06-07', hora:'13:00', campo:'TVCabo',        grupo:'M3-D', eq1:'Sueil & Ahmed Riaze',              eq2:'Alexandre Salazar & Pedro Gonzalez',   resultado:null },
    { id:70, data:'2026-06-07', hora:'14:00', campo:'TVCabo',        grupo:'M3-D', eq1:'Gonçalo Marques & Pedro Gonçalves',eq2:'Elves & Uweizy',                       resultado:null },
    { id:71, data:'2026-06-07', hora:'15:00', campo:'TVCabo',        grupo:'M3-B', eq1:'Shueb & Sahad',                    eq2:'Edson Uamusse & Salomão',              resultado:null },
    { id:72, data:'2026-06-07', hora:'16:00', campo:'TVCabo',        grupo:'M4-D', eq1:'Jason & Bosch',                    eq2:'Luis Trigo de Morais & Pedro Mandlate',resultado:null },
    { id:73, data:'2026-06-07', hora:'17:00', campo:'TVCabo',        grupo:'F1-C', eq1:'Anouk Fumane & Letícia',           eq2:'Marta Botelho & Ana Oliveira',         resultado:null },
    { id:74, data:'2026-06-07', hora:'18:00', campo:'TVCabo',        grupo:'M4-B', eq1:'Nuno Resende & Gonçalo Bettencourt',eq2:'Alao Almeida & Ayaan Mussa',          resultado:null },
    { id:75, data:'2026-06-07', hora:'19:00', campo:'TVCabo',        grupo:'M3-A', eq1:'Burhan Hassan & Sarfaraz',         eq2:'Dejan Petrovic & Isidro Simões',       resultado:null },
    { id:76, data:'2026-06-07', hora:'20:00', campo:'TVCabo',        grupo:'M2-C', eq1:'Feizan Omar & Filipe Lobo',        eq2:'Felipe Moniz & José Cossa',            resultado:null },
    { id:77, data:'2026-06-07', hora:'21:00', campo:'TVCabo',        grupo:'M2-C', eq1:'Faheem Adamo & Yann Trivellin',    eq2:'Ricardo Oliveira & Vasco Silva',       resultado:null },
    // ---- 7 JUN (STELLA ARTOIS) ----
    { id:78, data:'2026-06-07', hora:'07:00', campo:'Stella Artois', grupo:'F2-B', eq1:'Glória & Luciana Lauriano',        eq2:'Karina Darsan & Bethany',              resultado:null },
    { id:79, data:'2026-06-07', hora:'08:00', campo:'Stella Artois', grupo:'F2-B', eq1:'Shanel & Kaitlynn',                eq2:'Paty & Mila',                          resultado:null },
    { id:80, data:'2026-06-07', hora:'09:00', campo:'Stella Artois', grupo:'M2-B', eq1:'José Moreira & Nuno L. Pereira',   eq2:'Jameel & Tahir',                       resultado:null },
    { id:81, data:'2026-06-07', hora:'10:00', campo:'Stella Artois', grupo:'M2-B', eq1:'João Henriques & Bruno Morais',    eq2:'Dej Cruz & Fabio Damato',              resultado:null },
    { id:82, data:'2026-06-07', hora:'12:00', campo:'Stella Artois', grupo:'M4-D', eq1:'Luis Vaz & Sérgio Gomes',          eq2:'Luis Trigo de Morais & Pedro Mandlate',resultado:null },
    { id:83, data:'2026-06-07', hora:'13:00', campo:'Stella Artois', grupo:'M4-C', eq1:'Paul & Xander',                   eq2:'Fádhil Khan & Kelyo',                  resultado:null },
    { id:84, data:'2026-06-07', hora:'14:00', campo:'Stella Artois', grupo:'M4-C', eq1:'Shiraz & Kheizar',                 eq2:'Reihan Adamo & Nabil Manga',           resultado:null },
    { id:85, data:'2026-06-07', hora:'15:00', campo:'Stella Artois', grupo:'M4-D', eq1:'Jason & Bosch',                   eq2:'Muhammad Chona & Ibrahim Bilal',        resultado:null },
    { id:86, data:'2026-06-07', hora:'16:00', campo:'Stella Artois', grupo:'F2-C', eq1:'Nilda & Lize',                    eq2:'Steph & Ronell',                        resultado:null },
    { id:87, data:'2026-06-07', hora:'17:00', campo:'Stella Artois', grupo:'M4-A', eq1:'Pablo & Galo Rivera',              eq2:'André Reves & Francisco Morais',        resultado:null },
    { id:88, data:'2026-06-07', hora:'18:00', campo:'Stella Artois', grupo:'M5-A', eq1:'Tito Ferrinho & Valdir Jetha',     eq2:'Faizaan Ravat & Ranim Ahmad',           resultado:null },
    { id:89, data:'2026-06-07', hora:'19:00', campo:'Stella Artois', grupo:'M1-A', eq1:'Luis Antunes & Manuel Neto',       eq2:'João Alberty & Manel Alberty',          resultado:null },
    { id:90, data:'2026-06-07', hora:'20:00', campo:'Stella Artois', grupo:'M5-B', eq1:'Filipe Ferreira & Paulo Baldaia',  eq2:'Faheem Aboobakar & Mikaeel Taibo',      resultado:null },
    { id:91, data:'2026-06-07', hora:'21:00', campo:'Stella Artois', grupo:'M5-B', eq1:'Mizzy & Zayan Imitiaz',            eq2:'Rayhan & Arsheel',                      resultado:null },
    // ---- 8 JUN ----
    { id:92,  data:'2026-06-08', hora:'17:30', campo:'Play Padel',    grupo:'F1-C', eq1:'Marta Botelho & Ana Oliveira',    eq2:'Ohmar Fernandes & Claudia',             resultado:null },
    { id:93,  data:'2026-06-08', hora:'18:30', campo:'Play Padel',    grupo:'M4-A', eq1:'Joshua & Noah',                   eq2:'João Pignatelli & Joel Almeida',        resultado:null },
    { id:94,  data:'2026-06-08', hora:'19:30', campo:'Play Padel',    grupo:'M1-C', eq1:'Ahmad & Uzeir',                   eq2:'Fernando & Rui Rocha',                  resultado:null },
    { id:95,  data:'2026-06-08', hora:'20:30', campo:'Play Padel',    grupo:'M3-B', eq1:'Ugo Gião & Nuno Henriques',       eq2:'Ivandro Remane & João Peixoto',         resultado:null },
    { id:96,  data:'2026-06-08', hora:'21:30', campo:'Play Padel',    grupo:'M1-A', eq1:'Luis Antunes & Manuel Neto',      eq2:'Faizal & Sherial',                      resultado:null },
    { id:97,  data:'2026-06-08', hora:'17:30', campo:'TVCabo',        grupo:'F2-B', eq1:'Glória & Luciana Lauriano',       eq2:'Shanel & Kaitlynn',                     resultado:null },
    { id:98,  data:'2026-06-08', hora:'18:30', campo:'TVCabo',        grupo:'M5-A', eq1:'Faizan Ravat & Ranim Ahmad',      eq2:'Alcy Heim & Gabriel Heim',              resultado:null },
    { id:99,  data:'2026-06-08', hora:'19:30', campo:'TVCabo',        grupo:'F1-B', eq1:'Maria Tomaz & Isabel Ribeiro',    eq2:'Inês Pires & Daniela Duarte',           resultado:null },
    { id:100, data:'2026-06-08', hora:'20:30', campo:'TVCabo',        grupo:'M1-A', eq1:'Faizal & Sherial',                eq2:'João Alberty & Manel Alberty',          resultado:null },
    { id:101, data:'2026-06-08', hora:'21:30', campo:'TVCabo',        grupo:'M3-A', eq1:'José Mestre & Koenraad',          eq2:'Abdul Ibraimo & Guilherme Godinho',      resultado:null },
    { id:102, data:'2026-06-08', hora:'17:30', campo:'Stella Artois', grupo:'F2-B', eq1:'Paty & Mila',                    eq2:'Karina Darsan & Bethany',               resultado:null },
    { id:103, data:'2026-06-08', hora:'18:30', campo:'Stella Artois', grupo:'F1-A', eq1:'Caironice & Carmen',              eq2:'Cynthia Cavalcanti & Kátia Sousa',      resultado:null },
    { id:104, data:'2026-06-08', hora:'19:30', campo:'Stella Artois', grupo:'M4-B', eq1:'Duncan & James',                  eq2:'Nuno Resende & Gonçalo Bettencourt',    resultado:null },
    { id:105, data:'2026-06-08', hora:'20:30', campo:'Stella Artois', grupo:'F1-B', eq1:'Érica Capela & Sarah Taillon',    eq2:'Celine Sieu & Ana Pezarat',             resultado:null },
    { id:106, data:'2026-06-08', hora:'21:30', campo:'Stella Artois', grupo:'M5-A', eq1:'Tito Ferrinho & Valdir Jetha',    eq2:'Hamdan & Huzeifah',                     resultado:null },
    // ---- 9 JUN ----
    { id:107, data:'2026-06-09', hora:'17:30', campo:'Play Padel',    grupo:'M3-C', eq1:'Rui Veríssimo & Pedro Martins',   eq2:'Akil & Kalil',                          resultado:null },
    { id:108, data:'2026-06-09', hora:'18:30', campo:'Play Padel',    grupo:'M4-A', eq1:'Joshua & Noah',                   eq2:'André Reves & Francisco Morais',        resultado:null },
    { id:109, data:'2026-06-09', hora:'19:30', campo:'Play Padel',    grupo:'M1-C', eq1:'Tayab & Badru Rosa',              eq2:'Fernando & Rui Rocha',                  resultado:null },
    { id:110, data:'2026-06-09', hora:'20:30', campo:'Play Padel',    grupo:'M3-B', eq1:'Shueb & Sahad',                   eq2:'Ivandro Remane & João Peixoto',         resultado:null },
    { id:111, data:'2026-06-09', hora:'21:30', campo:'Play Padel',    grupo:'M3-A', eq1:'Burhan Hassan & Sarfaraz',        eq2:'Abdul Ibraimo & Guilherme Godinho',      resultado:null },
    { id:112, data:'2026-06-09', hora:'17:30', campo:'TVCabo',        grupo:'M2-B', eq1:'José Moreira & Nuno L. Pereira',  eq2:'Dej Cruz & Fabio Damato',               resultado:null },
    { id:113, data:'2026-06-09', hora:'18:30', campo:'TVCabo',        grupo:'M3-A', eq1:'José Mestre & Koenraad',          eq2:'Dejan Petrovic & Isidro Simões',        resultado:null },
    { id:114, data:'2026-06-09', hora:'19:30', campo:'TVCabo',        grupo:'M4-B', eq1:'Andrea & Mikel Álvarez',          eq2:'Nuno Resende & Gonçalo Bettencourt',    resultado:null },
    { id:115, data:'2026-06-09', hora:'20:30', campo:'TVCabo',        grupo:'M5-A', eq1:'Faizan Ravat & Ranim Ahmad',      eq2:'Hamdan & Huzeifah',                     resultado:null },
    { id:116, data:'2026-06-09', hora:'21:30', campo:'TVCabo',        grupo:'M2-A', eq1:'Luis Trigo de Morais & Ricky Kamissa', eq2:'Shezane Arif & Razeen',            resultado:null },
    { id:117, data:'2026-06-09', hora:'17:30', campo:'Stella Artois', grupo:'M2-A', eq1:'Frederico Jonet & Francisco Ferreira', eq2:'Rui Lourenço & Francisco Pegado', resultado:null },
    { id:118, data:'2026-06-09', hora:'18:30', campo:'Stella Artois', grupo:'M3-C', eq1:'Sharik Omar & Muhamad Mussagy',   eq2:'Keiss Chiraze & Saif Issa',             resultado:null },
    { id:119, data:'2026-06-09', hora:'19:30', campo:'Stella Artois', grupo:'F1-C', eq1:'Anouk Fumane & Letícia',          eq2:'Diana Carvalho & Ilga João',            resultado:null },
    { id:120, data:'2026-06-09', hora:'20:30', campo:'Stella Artois', grupo:'M2-B', eq1:'João Henriques & Bruno Morais',   eq2:'Jameel & Tahir',                        resultado:null },
    // ---- 10 JUN ----
    { id:121, data:'2026-06-10', hora:'17:30', campo:'Play Padel',    grupo:'M4-A', eq1:'João Pignatelli & Joel Almeida',  eq2:'André Reves & Francisco Morais',        resultado:null },
    { id:122, data:'2026-06-10', hora:'18:30', campo:'Play Padel',    grupo:'M3-D', eq1:'Sueil & Ahmed Riaze',             eq2:'Gonçalo Marques & Pedro Gonçalves',     resultado:null },
    { id:123, data:'2026-06-10', hora:'19:30', campo:'Play Padel',    grupo:'M3-D', eq1:'Alexandre Salazar & Pedro Gonzalez', eq2:'Elves & Uweizy',                    resultado:null },
    { id:124, data:'2026-06-10', hora:'20:30', campo:'Play Padel',    grupo:'M4-C', eq1:'Shiraz & Kheizar',                eq2:'Fádhil Khan & Kelyo',                   resultado:null },
    { id:125, data:'2026-06-10', hora:'17:30', campo:'TVCabo',        grupo:'F2-C', eq1:'Saira Sale & Sónia Caravela',     eq2:'Dalila & Tatiana',                      resultado:null },
    { id:126, data:'2026-06-10', hora:'18:30', campo:'TVCabo',        grupo:'M4-A', eq1:'Joshua & Noah',                   eq2:'Pablo & Galo Rivera',                   resultado:null },
    { id:127, data:'2026-06-10', hora:'19:30', campo:'TVCabo',        grupo:'M5-B', eq1:'Filipe Ferreira & Paulo Baldaia', eq2:'Rayhan & Arsheel',                      resultado:null },
    { id:128, data:'2026-06-10', hora:'20:30', campo:'TVCabo',        grupo:'M5-B', eq1:'Mizzy & Zayan Imitiaz',           eq2:'Faheem Aboobakar & Mikaeel Taibo',       resultado:null },
    { id:129, data:'2026-06-10', hora:'17:30', campo:'Stella Artois', grupo:'M4-C', eq1:'Paul & Xander',                  eq2:'Reihan Adamo & Nabil Manga',             resultado:null },
    { id:130, data:'2026-06-10', hora:'18:30', campo:'Stella Artois', grupo:'M4-B', eq1:'Duncan & James',                  eq2:'Alao Almeida & Ayaan Mussa',             resultado:null },
    { id:131, data:'2026-06-10', hora:'19:30', campo:'Stella Artois', grupo:'M4-D', eq1:'Muhammad Chona & Ibrahim Bilal',  eq2:'Luis Vaz & Sérgio Gomes',               resultado:null },
    { id:132, data:'2026-06-10', hora:'20:30', campo:'Stella Artois', grupo:'M4-D', eq1:'Muhammad Chona & Ibrahim Bilal',  eq2:'Luis Trigo de Morais & Pedro Mandlate',  resultado:null },
  ],
};

// Storage — delegado para data.js (ppGet / ppSave)

// ============================================
//  AUTENTICAÇÃO (delegado para auth.js)
// ============================================
function isLoggedIn() { return Auth.isAuth(); }

function doLogin(user, pass) {
  const result = Auth.login(user, pass);
  if (!result.ok) { return { ok: false, error: result.error }; }
  return { ok: true };
}

function doLogout() {
  Auth.logout();
  location.reload();
}

window.abrirAlterarPasse = function() {
  document.getElementById('passeActual').value = '';
  document.getElementById('passeNova').value = '';
  document.getElementById('passeNovaConf').value = '';
  document.getElementById('passeModalError').style.display = 'none';
  openModal('modalAlterarPasse');
};

window.guardarNovaPasse = function() {
  const actual = document.getElementById('passeActual').value.trim();
  const nova   = document.getElementById('passeNova').value;
  const conf   = document.getElementById('passeNovaConf').value;
  const errEl  = document.getElementById('passeModalError');
  const errMsg = document.getElementById('passeModalErrorMsg');
  function showErr(msg) { errMsg.textContent = msg; errEl.style.display = ''; }

  if (!actual) return showErr('Introduza a palavra-passe actual.');
  if (!nova || nova.length < 6) return showErr('A nova palavra-passe deve ter pelo menos 6 caracteres.');
  if (nova !== conf) return showErr('As palavras-passe não coincidem.');

  const me = Auth.me();
  if (!me) return showErr('Sessão inválida. Faça login novamente.');

  // Verify current password
  if (!Auth.verifyPassword(me.id, actual)) return showErr('Palavra-passe actual incorrecta.');

  Auth.updateUser(me.id, { password: nova });
  closeModal('modalAlterarPasse');
  toast('Palavra-passe alterada com sucesso.');
  Auth.log('CHANGE_PASSWORD', 'auth', `Palavra-passe alterada: ${me.username}`);
};

function resetLocalCredentials(e) {
  if (e) e.preventDefault();
  if (!confirm('Repor credenciais? A conta admin será reposicionada com a palavra-passe padrão.')) return;
  localStorage.removeItem('pp_users');
  localStorage.removeItem('pp_sessions');
  location.reload();
}

// ============================================
//  TOAST
// ============================================
function toast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span class="toast-icon">${type === 'success' ? '✓' : '✕'}</span> ${msg}`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ============================================
//  MODAL
// ============================================
function openModal(id) {
  document.getElementById(id).classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// ============================================
//  NAVEGAÇÃO
// ============================================
function navigate(view) {
  APP.currentView = view;
  location.hash = view;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + view)?.classList.add('active');

  document.querySelectorAll('.sidebar-link').forEach(l => {
    l.classList.toggle('active', l.dataset.view === view);
  });

  Auth.updateActivity();

  const titles = {
    dashboard:     ['Dashboard', 'Visão Geral'],
    campos:        ['Campos', 'Gestão de Campos'],
    categorias:    ['Categorias & Grupos', 'Estrutura do Torneio'],
    jogadores:     ['Jogadores', 'Participantes'],
    duplas:        ['Duplas', 'Pares'],
    jogos:         ['Jogos', 'Calendário Completo'],
    resultados:    ['Resultados', 'Lançamento de Resultados'],
    fasefinal:     ['Fase Final', 'Eliminatórias'],
    utilizadores:  ['Utilizadores', 'Gestão de Acessos'],
    logs:          ['Logs de Auditoria', 'Auditoria'],
    sessoes:       ['Sessões Activas', 'Utilizadores Ligados'],
    classificacoes:['Classificações', 'Standings ao Vivo'],
    estatisticas:  ['Estatísticas', 'Resumo do Torneio'],
    importar:      ['Importar Resultados', 'Import em Lote'],
    horario:       ['Construtor de Horário', 'Vista de Agenda'],
  };
  const [title, tag] = titles[view] || [view, ''];
  document.getElementById('breadcrumbTitle').textContent = title;
  document.getElementById('breadcrumbTag').textContent   = tag;

  renderView(view);

  // fechar drawer mobile
  document.getElementById('sidebar').classList.remove('open');
}

// ============================================
//  RENDER VIEWS
// ============================================
function renderView(view) {
  switch (view) {
    case 'dashboard':    renderDashboard();    break;
    case 'campos':       renderCampos();       break;
    case 'categorias':   renderCategorias();   break;
    case 'jogadores':    renderJogadores();    break;
    case 'duplas':       renderDuplas();       break;
    case 'jogos':        renderJogos();        break;
    case 'resultados':   renderResultados();   break;
    case 'fasefinal':    renderFaseFinal();    break;
    case 'utilizadores': renderUtilizadores(); break;
    case 'logs':         renderLogs();         break;
    case 'sessoes':      renderSessoes();      break;
    case 'classificacoes': renderAdminClassificacoes(); break;
    case 'estatisticas': renderEstatisticas(); break;
    case 'importar':     renderImportar();     break;
    case 'horario':      renderHorario();      break;
    case 'relatorioJogos':    renderRelatorioJogos();    break;
    case 'construtorGrupos':
      if (!Auth.isAdmin()) { toast('Acesso restrito a administradores.', 'error'); return; }
      renderConstrutorGrupos(); break;
    case 'construtorJogos':
      if (!Auth.isAdmin()) { toast('Acesso restrito a administradores.', 'error'); return; }
      renderConstrutorJogos(); break;
  }
}

// ---------- DASHBOARD ----------
function renderDashboard() {
  const jogos  = getData('jogos');
  const ff     = ffLoad();

  // Collect all FF jogos across all categories
  const ffJogos = Object.entries(ff).flatMap(([catId, catData]) =>
    (catData?.jogos || []).map(j => ({ ...j, _cat: catId }))
  );

  const totalGrupos  = jogos.length;
  const comResGrupos = jogos.filter(j => j.resultado).length;
  const totalFF      = ffJogos.length;
  const comResFF     = ffJogos.filter(j => j.resultado).length;

  const total  = totalGrupos + totalFF;
  const comRes = comResGrupos + comResFF;
  const semRes = total - comRes;
  const pct    = total ? Math.round(comRes / total * 100) : 0;

  document.getElementById('dashTotalJogos').textContent   = total;
  document.getElementById('dashComResultado').textContent  = comRes;
  document.getElementById('dashPendentes').textContent     = semRes;
  document.getElementById('dashProgresso').textContent     = pct + '%';

  // Jogos em atraso: pendentes cuja data+hora já passou
  const nowStr = new Date().toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm"
  const emAtraso   = jogos.filter(j => !j.resultado && j.data && j.hora && (j.data + 'T' + j.hora) < nowStr);
  const adiados    = jogos.filter(j => !j.resultado && !!j.adiado);
  const suspensos  = emAtraso.filter(j => !!j.suspenso && !j.adiado);
  const emFalta    = emAtraso.filter(j => !j.suspenso && !j.adiado);

  // Badge shows only truly missing games (not suspended)
  const dashAtraso = document.getElementById('dashEmAtraso');
  if (dashAtraso) dashAtraso.textContent = emFalta.length || emAtraso.length;
  const badgeAtraso = document.getElementById('badgeAtraso');
  if (badgeAtraso) { badgeAtraso.textContent = emFalta.length; badgeAtraso.style.display = emFalta.length ? '' : 'none'; }

  const dashAtrasoPanel = document.getElementById('dashAtrasoPanel');
  if (dashAtrasoPanel) {
    const hasAny = emAtraso.length > 0 || adiados.length > 0;
    dashAtrasoPanel.style.display = hasAny ? '' : 'none';

    // Panel border/bg: red if there are missing games, orange if only suspended
    if (emFalta.length) {
      dashAtrasoPanel.style.border = '1px solid rgba(255,74,74,.3)';
      dashAtrasoPanel.style.background = 'rgba(255,74,74,.04)';
    } else {
      dashAtrasoPanel.style.border = '1px solid rgba(255,154,60,.3)';
      dashAtrasoPanel.style.background = 'rgba(255,154,60,.04)';
    }

    // Header label
    const titleEl = document.getElementById('dashAtrasoTitle');
    const countEl = document.getElementById('dashAtrasoCount');
    if (titleEl) {
      titleEl.style.color = emFalta.length ? 'var(--vermelho)' : '#FF9A3C';
      titleEl.querySelector('i').className = emFalta.length ? 'ph ph-warning-circle' : 'ph ph-pause-circle';
    }
    if (countEl) {
      const parts = [];
      if (emFalta.length)   parts.push(`${emFalta.length} jogo${emFalta.length > 1 ? 's' : ''} sem resultado`);
      if (suspensos.length) parts.push(`${suspensos.length} interrompido${suspensos.length > 1 ? 's' : ''}`);
      if (adiados.length)   parts.push(`${adiados.length} adiado${adiados.length > 1 ? 's' : ''}`);
      countEl.textContent = parts.join('  ·  ');
    }

    // Adiado sub-section
    const adiadoSection = document.getElementById('dashAdiadoSection');
    const adiadoBody    = document.getElementById('dashAdiadoBody');
    if (adiadoSection) adiadoSection.style.display = adiados.length ? '' : 'none';
    if (adiadoBody) {
      adiadoBody.innerHTML = adiados.slice(0, 5).map(j =>
        `<tr style="background:rgba(107,156,247,.04)">
          <td><span class="td-mono" style="color:#6B9CF7">${formatDate(j.data)}</span></td>
          <td style="color:#6B9CF7;font-weight:700">${j.hora}</td>
          <td><span class="badge badge-cinza">${j.campo}</span></td>
          <td><span class="cat-pill cat-${j.grupo.split('-')[0]}">${j.grupo}</span></td>
          <td style="text-align:right">${j.eq1.split(' & ').join('<br>')}</td>
          <td style="color:var(--cinza-texto);padding:0 .4rem">VS</td>
          <td>${j.eq2.split(' & ').join('<br>')}</td>
          <td style="font-size:.75rem;color:var(--cinza-texto)">${escHtml(j.adiado?.motivo || '—')}</td>
          <td><button class="btn btn-sm" style="font-size:.65rem;padding:.2rem .5rem;background:rgba(107,156,247,.15);color:#6B9CF7;border:1px solid rgba(107,156,247,.4)" onclick="abrirResultado(${j.id})"><i class="ph ph-calendar-check"></i> Reagendar</button></td>
        </tr>`
      ).join('');
    }

    // Suspended sub-section
    const suspSection = document.getElementById('dashSuspensoSection');
    const suspBody    = document.getElementById('dashSuspensoBody');
    if (suspSection) suspSection.style.display = suspensos.length ? '' : 'none';
    if (suspBody) {
      suspBody.innerHTML = suspensos.slice(0, 5).map(j => {
        const s = j.suspenso;
        const partial = [s.s1eq1!=null?`${s.s1eq1}-${s.s1eq2}`:null, s.s2eq1!=null?`${s.s2eq1}-${s.s2eq2}`:null, s.s3eq1!=null?`${s.s3eq1}-${s.s3eq2}`:null].filter(Boolean).join(' / ');
        const serve = s.serve && s.serve !== 'eq1' && s.serve !== 'eq2' ? `<span style="color:#FF9A3C;font-size:.7rem">⚡ ${escHtml(s.serve)}</span>` : '';
        return `<tr style="background:rgba(255,154,60,.04)">
          <td><span class="td-mono" style="color:#FF9A3C">${formatDate(j.data)}</span></td>
          <td style="color:#FF9A3C;font-weight:700">${j.hora}</td>
          <td><span class="badge badge-cinza">${j.campo}</span></td>
          <td><span class="cat-pill cat-${j.grupo.split('-')[0]}">${j.grupo}</span></td>
          <td style="text-align:right">${j.eq1.split(' & ').join('<br>')}</td>
          <td style="color:var(--cinza-texto);padding:0 .4rem">VS</td>
          <td>${j.eq2.split(' & ').join('<br>')}</td>
          <td style="font-size:.75rem;color:var(--cinza-texto)">${partial ? `<span style="font-family:monospace">${partial}</span>` : ''}${serve ? '<br>' + serve : ''}</td>
          <td><button class="btn btn-sm" style="font-size:.65rem;padding:.2rem .5rem;background:rgba(255,154,60,.15);color:#FF9A3C;border:1px solid rgba(255,154,60,.4)" onclick="abrirResultado(${j.id})"><i class="ph ph-arrow-clockwise"></i> Retomar</button></td>
        </tr>`;
      }).join('');
    }

    // Missing (no result, no suspend) sub-section
    const faltaSection = document.getElementById('dashEmFaltaSection');
    const faltaBody    = document.getElementById('dashAtrasoBody');
    if (faltaSection) faltaSection.style.display = emFalta.length ? '' : 'none';
    if (faltaBody) {
      faltaBody.innerHTML = emFalta.slice(0, 5).map(j =>
        `<tr style="background:rgba(255,74,74,.04)">
          <td><span class="td-mono" style="color:var(--vermelho)">${formatDate(j.data)}</span></td>
          <td style="color:var(--vermelho);font-weight:700">${j.hora}</td>
          <td><span class="badge badge-cinza">${j.campo}</span></td>
          <td><span class="cat-pill cat-${j.grupo.split('-')[0]}">${j.grupo}</span></td>
          <td style="text-align:right">${j.eq1.split(' & ').join('<br>')}</td>
          <td style="color:var(--cinza-texto);padding:0 .4rem">VS</td>
          <td>${j.eq2.split(' & ').join('<br>')}</td>
          <td><button class="btn btn-danger btn-sm" style="font-size:.65rem;padding:.2rem .5rem" onclick="abrirResultado(${j.id})"><i class="ph ph-pencil-simple"></i> Lançar</button></td>
        </tr>`
      ).join('');
    }
  }

  // Próximos jogos pendentes: group stage first, then FF (only where both teams known)
  const proximosGrupos = jogos.filter(j => !j.resultado && !j.adiado).slice(0, 6);
  const proximosFF     = ffJogos.filter(j => !j.resultado && j.eq1 && j.eq2);
  const proximos       = [...proximosGrupos, ...proximosFF].slice(0, 6);

  const tbody = document.getElementById('dashProximosBody');
  tbody.innerHTML = proximos.map(j => {
    const isFF = !!j._cat;
    if (isFF) {
      const fLabel = j.fase === 'F' ? 'Final' : j.fase === 'SF' ? `SF ${j.num}` : `QF ${j.num}`;
      return `
        <tr>
          <td><span class="badge badge-cinza">Fase Final</span></td>
          <td>—</td>
          <td>—</td>
          <td><span class="cat-pill cat-${j._cat}">${j._cat} · ${fLabel}</span></td>
          <td style="text-align:right">${j.eq1 ? j.eq1.split(' & ').join('<br>') : '—'}</td>
          <td style="color:var(--cinza-texto);padding:0 0.4rem">VS</td>
          <td>${j.eq2 ? j.eq2.split(' & ').join('<br>') : '—'}</td>
          <td>${j.adiado ? '<span style="color:#6B9CF7;font-size:.7rem;background:rgba(107,156,247,.12);padding:.1rem .35rem;border-radius:4px">&#x1F4C5; Adiado</span>' : '<span class="badge badge-amarelo">Pendente</span>'}</td>
      </tr>`;
  }
  return `
      <tr>
        <td><span class="td-mono">${formatDate(j.data)}</span></td>
        <td>${j.hora}</td>
        <td><span class="badge badge-cinza">${j.campo}</span></td>
        <td><span class="cat-pill cat-${j.grupo.split('-')[0]}">${j.grupo}</span></td>
        <td style="text-align:right">${j.eq1.split(' & ').join('<br>')}</td>
        <td style="color:var(--cinza-texto);padding:0 0.4rem">VS</td>
        <td>${j.eq2.split(' & ').join('<br>')}</td>
        <td>${j.adiado ? '<span style="color:#6B9CF7;font-size:.7rem;background:rgba(107,156,247,.12);padding:.1rem .35rem;border-radius:4px">&#x1F4C5; Adiado</span>' : '<span class="badge badge-amarelo">Pendente</span>'}</td>
      </tr>`;
  }).join('');

  // Category progress bars
  const CATS = ['M1','M2','M3','M4','M5','F1','F2'];
  const catProgress = document.getElementById('dashCatProgress');
  if (catProgress) {
    catProgress.innerHTML = CATS.map(cat => {
      const allCatJogos = getAllJogosNormalized().filter(j => j.grupo.startsWith(cat + '-'));
      const done  = allCatJogos.filter(j => j.resultado).length;
      const total = allCatJogos.length;
      const pct = total ? Math.round(done / total * 100) : 0;
      return `<div class="progress-bar-wrap">
        <span class="progress-bar-label">${cat}</span>
        <div class="progress-bar-track"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
        <span class="progress-bar-pct">${pct}%</span>
        <span style="font-size:.68rem;color:var(--cinza-texto);width:4rem;text-align:right">${done}/${total}</span>
      </div>`;
    }).join('');
  }

  // Activity feed from audit log
  const feed = document.getElementById('dashActivityFeed');
  if (feed) {
    const me = Auth.me();
    const isAdmin = Auth.isAdmin();
    // Operators see only their own activity; admins see all (excluding system noise if desired)
    const allLogs = Auth.getLogs();
    const logs = isAdmin
      ? allLogs.slice(0, 12)
      : allLogs.filter(l => l.role === 'operator').slice(0, 12);
    if (!logs.length) {
      feed.innerHTML = `<div style="text-align:center;padding:1.5rem;color:var(--cinza-texto);font-size:.8rem">Sem actividade registada.</div>`;
    } else {
      const dotClass = { LOGIN:'', LOGOUT:'activity-dot--warn', SAVE_RESULT:'', SAVE_RESULT_FF:'',
        GENERATE_BRACKET:'', RESET_BRACKET:'activity-dot--err', DELETE_USER:'activity-dot--err',
        FORCE_LOGOUT:'activity-dot--err', CLEAR_RESULT:'activity-dot--warn' };
      feed.innerHTML = logs.map(l => {
        const dc = dotClass[l.action] || '';
        const ago = _timeAgo(l.ts);
        return `<div class="activity-item">
          <span class="activity-dot ${dc}"></span>
          <span class="activity-text"><strong>${escHtml(l.username)}</strong> — ${escHtml(l.detail || l.action)}</span>
          <span class="activity-time">${ago}</span>
        </div>`;
      }).join('');
    }
  }
}

function _timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'agora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h/24)}d`;
}

// ── Conflict acknowledgement helpers ──────────────────────────
function _conflictAcks() {
  try { return new Set(JSON.parse(localStorage.getItem('ppConflictAck') || '[]')); } catch { return new Set(); }
}
function _saveConflictAcks(set) {
  localStorage.setItem('ppConflictAck', JSON.stringify([...set]));
}
window.ackConflict = function(key) {
  const acks = _conflictAcks();
  acks.add(key);
  _saveConflictAcks(acks);
  updateAlertBanner();
};
window.clearConflictAcks = function() {
  localStorage.removeItem('ppConflictAck');
  updateAlertBanner();
};

function updateAlertBanner() {
  const jogos = getData('jogos');
  const pending = jogos.filter(j => !j.resultado).length;
  const banner  = document.getElementById('alertBanner');
  const msg     = document.getElementById('alertBannerMsg');
  const icon    = document.getElementById('alertBannerIcon');
  const btn     = document.getElementById('alertBannerBtn');
  const conflitosPanel = document.getElementById('dashConflitosPanel');
  const conflitosBody  = document.getElementById('dashConflitosBody');
  if (!banner || !msg) return;

  const acks = _conflictAcks();

  // ── Detect scheduling conflicts across all dates ──
  const playerDays = {}; // key: "player_lower|date" → { name, date, hours[] }
  const campoSlots = {}; // key: "campo|date|hora" → count
  jogos.forEach(j => {
    if (!j.data) return;
    if (j.hora && j.campo) {
      const ck = `${j.campo}|${j.data}|${j.hora}`;
      campoSlots[ck] = (campoSlots[ck] || 0) + 1;
    }
    [j.eq1, j.eq2].forEach(pair => {
      if (!pair) return;
      pair.split(' & ').forEach(p => {
        const k = `${p.trim().toLowerCase()}|${j.data}`;
        if (!playerDays[k]) playerDays[k] = { key: k, name: p.trim(), date: j.data, hours: [] };
        if (j.hora) playerDays[k].hours.push(j.hora);
      });
    });
  });

  const allPlayerConflicts = Object.values(playerDays).filter(v => v.hours.length > 1);
  const allCampoConflicts  = Object.entries(campoSlots).filter(([,n]) => n > 1)
    .map(([k]) => { const [campo, date, hora] = k.split('|'); return { key: k, campo, date, hora }; });

  // Split into acknowledged vs active
  const activePlayer = allPlayerConflicts.filter(v => !acks.has(v.key));
  const ackedPlayer  = allPlayerConflicts.filter(v =>  acks.has(v.key));
  const activeCampo  = allCampoConflicts.filter(v => !acks.has(v.key));
  const ackedCampo   = allCampoConflicts.filter(v =>  acks.has(v.key));
  const totalActive  = activePlayer.length + activeCampo.length;
  const totalAcked   = ackedPlayer.length  + ackedCampo.length;

  // ── Dashboard conflict details panel ──
  if (conflitosPanel && conflitosBody) {
    const totalAll = allPlayerConflicts.length + allCampoConflicts.length;
    if (totalAll > 0) {
      const ackBtnStyle = `background:rgba(57,255,143,.12);border:1px solid rgba(57,255,143,.3);color:#39FF8F;border-radius:5px;padding:.15rem .5rem;font-size:.68rem;font-weight:700;cursor:pointer;white-space:nowrap`;
      const ackedStyle  = `background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:7px;padding:.35rem .75rem;opacity:.45`;

      function playerRow(v, acked) {
        const ackBtn = acked
          ? `<span style="font-size:.65rem;color:#39FF8F">✓ Aceite</span>`
          : `<button style="${ackBtnStyle}" onclick="ackConflict('${v.key.replace(/'/g,"\\'")}')">✓ Aceitar</button>`;
        return `<div style="display:flex;align-items:center;gap:.6rem;font-size:.8rem;${acked ? ackedStyle : 'background:rgba(255,74,74,.06);border:1px solid rgba(255,74,74,.2);border-radius:7px;padding:.4rem .75rem'}">
          <i class="ph ph-user" style="color:${acked?'#4A6058':'var(--vermelho)'};flex-shrink:0"></i>
          <span style="font-weight:700;color:${acked?'var(--cinza-texto)':'var(--branco)'};flex:1">${escHtml(v.name)}</span>
          <span style="color:var(--cinza-texto);font-size:.72rem">${ppFormatDate(v.date)}</span>
          <span style="color:${acked?'#4A6058':'var(--vermelho)'};font-family:monospace;font-size:.75rem">${v.hours.sort().join(' · ')}</span>
          ${ackBtn}
        </div>`;
      }

      function campoRow(v, acked) {
        const ackBtn = acked
          ? `<span style="font-size:.65rem;color:#39FF8F">✓ Aceite</span>`
          : `<button style="${ackBtnStyle}" onclick="ackConflict('${v.key.replace(/'/g,"\\'")}')">✓ Aceitar</button>`;
        return `<div style="display:flex;align-items:center;gap:.6rem;font-size:.8rem;${acked ? ackedStyle : 'background:rgba(255,74,74,.06);border:1px solid rgba(255,74,74,.2);border-radius:7px;padding:.4rem .75rem'}">
          <i class="ph ph-map-pin" style="color:${acked?'#4A6058':'var(--vermelho)'};flex-shrink:0"></i>
          <span style="font-weight:700;color:${acked?'var(--cinza-texto)':'var(--branco)'};flex:1">${escHtml(v.campo)}</span>
          <span style="color:var(--cinza-texto);font-size:.72rem">${ppFormatDate(v.date)}</span>
          <span style="color:${acked?'#4A6058':'var(--vermelho)'};font-family:monospace;font-size:.75rem">${v.hora}</span>
          ${ackBtn}
        </div>`;
      }

      let html = '';
      const allRows = [...allPlayerConflicts.map(v=>({...v,type:'player'})), ...allCampoConflicts.map(v=>({...v,type:'campo'}))];
      const activeRows = allRows.filter(v => !acks.has(v.key));
      const ackedRows  = allRows.filter(v =>  acks.has(v.key));

      if (activeRows.length) {
        html += `<div style="display:flex;flex-direction:column;gap:.35rem;margin-bottom:${ackedRows.length?'.85rem':'.25rem'}">`;
        activeRows.forEach(v => { html += v.type === 'player' ? playerRow(v, false) : campoRow(v, false); });
        html += `</div>`;
      }

      if (ackedRows.length) {
        html += `<details style="margin-top:.25rem"><summary style="font-size:.7rem;color:#4A6058;cursor:pointer;user-select:none;list-style:none;display:flex;align-items:center;gap:.35rem"><i class="ph ph-check-circle" style="color:#39FF8F"></i> ${ackedRows.length} conflito${ackedRows.length>1?'s':''} aceite${ackedRows.length>1?'s':''} <span style="margin-left:auto;font-size:.65rem;color:var(--cinza-texto)" onclick="event.stopPropagation();clearConflictAcks()">Limpar todos</span></summary>
          <div style="display:flex;flex-direction:column;gap:.3rem;margin-top:.4rem">`;
        ackedRows.forEach(v => { html += v.type === 'player' ? playerRow(v, true) : campoRow(v, true); });
        html += `</div></details>`;
      }

      conflitosBody.innerHTML = html;
      conflitosPanel.style.display = '';
    } else {
      conflitosPanel.style.display = 'none';
    }
  }

  // ── Alert top banner — only count unacknowledged ──
  if (totalActive > 0) {
    const parts = [];
    if (activePlayer.length) parts.push(`${activePlayer.length} jogador${activePlayer.length>1?'es':''} com jogos em conflito`);
    if (activeCampo.length)  parts.push(`${activeCampo.length} campo${activeCampo.length>1?'s':''} duplamente reservado${activeCampo.length>1?'s':''}`);
    msg.innerHTML = `<strong>${parts.join(' · ')}</strong> — verifique o Construtor de Horário`;
    msg.style.color = 'var(--vermelho)';
    if (icon) { icon.className = 'ph ph-warning'; icon.style.color = 'var(--vermelho)'; }
    if (btn)  { btn.textContent = 'Ver Horário'; btn.onclick = () => navigate('horario'); btn.style.background = 'rgba(255,74,74,.2)'; btn.style.borderColor = 'rgba(255,74,74,.4)'; btn.style.color = 'var(--vermelho)'; }
    banner.style.background = 'rgba(255,74,74,.08)';
    banner.style.borderBottomColor = 'rgba(255,74,74,.3)';
    banner.style.display = 'flex';
  } else if (pending > 20) {
    msg.textContent = `${pending} jogos ainda sem resultado.`;
    msg.style.color = 'var(--amarelo)';
    if (icon) { icon.className = 'ph ph-clock'; icon.style.color = 'var(--amarelo)'; }
    if (btn)  { btn.textContent = 'Lançar resultados'; btn.onclick = () => navigate('resultados'); btn.style.background = 'rgba(245,197,24,.2)'; btn.style.borderColor = 'rgba(245,197,24,.4)'; btn.style.color = 'var(--amarelo)'; }
    banner.style.background = 'rgba(245,197,24,.08)';
    banner.style.borderBottomColor = 'rgba(245,197,24,.3)';
    banner.style.display = 'flex';
  } else {
    banner.style.display = 'none';
  }
}

// ---------- CAMPOS ----------
function renderCampos() {
  const campos = getData('campos');
  const jogos  = getData('jogos');
  const grid   = document.getElementById('camposGrid');
  grid.innerHTML = campos.map(c => {
    const nJogos = jogos.filter(j => j.campo === c.nome).length;
    return `
    <div class="campo-card">
      <div class="campo-card-icon">${c.icone}</div>
      <div class="campo-card-name">${c.nome}</div>
      <p class="campo-card-stat">
        <strong>${nJogos}</strong> jogos · Estado: ${c.activo ? '<span class="badge badge-verde">Activo</span>' : '<span class="badge badge-cinza">Inactivo</span>'}
      </p>
      <div class="campo-card-actions">
        <button class="btn btn-ghost btn-sm" onclick="editCampo(${c.id})">
          <i class="ph ph-pencil"></i> Editar
        </button>
        <button class="btn btn-danger btn-sm" onclick="deleteCampo(${c.id})">
          <i class="ph ph-trash"></i>
        </button>
      </div>
    </div>`;
  }).join('');
}

window.editCampo = function(id) {
  const campos = getData('campos');
  const c = campos.find(x => x.id === id);
  if (!c) return;
  APP.editingId = id;
  document.getElementById('campoNome').value  = c.nome;
  document.getElementById('campoIcone').value = c.icone;
  document.getElementById('modalCampoTitle').textContent = 'Editar Campo';
  openModal('modalCampo');
};

window.deleteCampo = function(id) {
  if (!confirm('Eliminar este campo?')) return;
  const campos = getData('campos').filter(c => c.id !== id);
  setData('campos', campos);
  renderCampos();
  Auth.log('DELETE_CAMPO', 'campos', `Campo id=${id} eliminado`);
  toast('Campo eliminado.');
};

function saveCampo() {
  const nome  = document.getElementById('campoNome').value.trim();
  const icone = document.getElementById('campoIcone').value.trim() || '🎾';
  if (!nome) return toast('Preencha o nome do campo.', 'error');

  const campos = getData('campos');
  if (APP.editingId) {
    const idx = campos.findIndex(c => c.id === APP.editingId);
    if (idx >= 0) { campos[idx].nome = nome; campos[idx].icone = icone; }
  } else {
    const newId = Math.max(0, ...campos.map(c => c.id)) + 1;
    campos.push({ id: newId, nome, icone, activo: true });
  }
  setData('campos', campos);
  closeModal('modalCampo');
  renderCampos();
  populateCampoSelects();
  Auth.log(APP.editingId ? 'UPDATE_CAMPO' : 'CREATE_CAMPO', 'campos', `Campo: ${nome}`);
  toast(APP.editingId ? 'Campo actualizado.' : 'Campo adicionado.');
  APP.editingId = null;
}

// ---------- CATEGORIAS & GRUPOS ----------
function renderCategorias() {
  const cats   = getData('categorias');
  const grupos = getData('grupos');

  document.getElementById('catsTableBody').innerHTML = cats.map(c => {
    const nGrupos = grupos.filter(g => g.cat === c.id).length;
    return `
    <tr>
      <td><span class="cat-pill cat-${c.id}">${c.id}</span></td>
      <td class="td-mono">${c.nome}</td>
      <td><span class="badge ${c.tipo==='F' ? 'badge-amarelo':'badge-azul'}">${c.tipo === 'F' ? 'Feminino':'Masculino'}</span></td>
      <td>${nGrupos} grupos</td>
      <td>
        <div style="display:flex;gap:0.4rem">
          ${grupos.filter(g=>g.cat===c.id).map(g=>`<span class="badge badge-cinza">${g.letra}</span>`).join('')}
          <button class="btn-icon btn-edit" onclick="addGrupo('${c.id}')" title="Adicionar grupo"><i class="ph ph-plus"></i></button>
        </div>
      </td>
      <td>
        <div style="display:flex;gap:0.3rem">
          <button class="btn-icon btn-del" onclick="deleteGruposAll('${c.id}')" title="Apagar categoria"><i class="ph ph-trash"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

window.addGrupo = function(catId) {
  const letra = prompt(`Nova letra de grupo para ${catId} (ex: D, E...):`);
  if (!letra) return;
  const grupos = getData('grupos');
  const id = `${catId}-${letra.toUpperCase()}`;
  if (grupos.find(g => g.id === id)) return toast('Grupo já existe.', 'error');
  grupos.push({ id, cat: catId, letra: letra.toUpperCase() });
  setData('grupos', grupos);
  renderCategorias();
  toast(`Grupo ${id} adicionado.`);
};

window.deleteGruposAll = function(catId) {
  if (!confirm(`Eliminar categoria ${catId} e todos os seus grupos?`)) return;
  const cats = getData('categorias').filter(c => c.id !== catId);
  const grupos = getData('grupos').filter(g => g.cat !== catId);
  setData('categorias', cats); setData('grupos', grupos);
  renderCategorias(); toast('Categoria eliminada.');
};

// ---------- JOGADORES ----------
window.sortJogadores = function(col) {
  if (APP.jogadoresSort.col === col) {
    APP.jogadoresSort.dir = APP.jogadoresSort.dir === 'asc' ? 'desc' : 'asc';
  } else {
    APP.jogadoresSort.col = col;
    APP.jogadoresSort.dir = 'asc';
  }
  renderJogadores(document.getElementById('jogadoresSearch')?.value || '');
};

window.sortDuplas = function(col) {
  if (APP.duplasSort.col === col) {
    APP.duplasSort.dir = APP.duplasSort.dir === 'asc' ? 'desc' : 'asc';
  } else {
    APP.duplasSort.col = col;
    APP.duplasSort.dir = 'asc';
  }
  renderDuplas(document.getElementById('duplasSearch')?.value || '');
};

function renderJogadores(filter = '') {
  const jogadores = getData('jogadores') || [];
  const duplas    = getData('duplas') || [];
  const jogos     = getData('jogos');

  let lista;
  if (jogadores.length > 0) {
    lista = [...jogadores];
  } else {
    // Fallback: extract from games
    const set = new Set();
    jogos.forEach(j => {
      j.eq1.split('&').forEach(n => set.add(n.trim()));
      j.eq2.split('&').forEach(n => set.add(n.trim()));
    });
    lista = [...set].sort().map(nome => ({ id: null, nome, tel: getTelefone(nome) }));
  }

  // Enrich for sorting/display
  lista = lista.map(jog => {
    const nome = jog.nome;
    let grupos;
    if (jog.id && duplas.length > 0) {
      grupos = [...new Set(duplas.filter(d => d.j1 === jog.id || d.j2 === jog.id).map(d => d.grupo))];
    } else {
      grupos = [...new Set(jogos.filter(j => {
        const p1 = j.eq1.split('&').map(n => n.trim());
        const p2 = j.eq2.split('&').map(n => n.trim());
        return p1.includes(nome) || p2.includes(nome);
      }).map(j => j.grupo))];
    }
    const jogosJogador = jogos.filter(j => {
      const p1 = j.eq1.split('&').map(n => n.trim());
      const p2 = j.eq2.split('&').map(n => n.trim());
      return p1.includes(nome) || p2.includes(nome);
    });
    const comRes = jogosJogador.filter(j => j.resultado).length;
    return { ...jog, _grupos: grupos, _jogos: jogosJogador, _res: comRes };
  });

  if (filter) lista = lista.filter(j => j.nome.toLowerCase().includes(filter.toLowerCase()));

  // Sort
  const s = APP.jogadoresSort;
  lista.sort((a, b) => {
    const dir = s.dir === 'asc' ? 1 : -1;
    switch (s.col) {
      case 'nome':       return dir * a.nome.localeCompare(b.nome);
      case 'grupos':     return dir * ((a._grupos[0] || '').localeCompare(b._grupos[0] || ''));
      case 'jogos':      return dir * (a._jogos.length - b._jogos.length);
      case 'resultados': return dir * (a._res - b._res);
      default:           return a.nome.localeCompare(b.nome);
    }
  });

  // Update sort header indicators
  const _si = col => APP.jogadoresSort.col === col
    ? (APP.jogadoresSort.dir === 'asc' ? ' <span style="color:var(--verde)">↑</span>' : ' <span style="color:var(--verde)">↓</span>')
    : ' <span style="opacity:.2;font-size:.65em">⇅</span>';
  const _th = (id, label, col) => { const el = document.getElementById(id); if (el) el.innerHTML = label + _si(col); };
  _th('thJogNome',   'Nome',       'nome');
  _th('thJogGrupos', 'Grupo(s)',   'grupos');
  _th('thJogJogos',  'Jogos',      'jogos');
  _th('thJogRes',    'Resultados', 'resultados');

  const tbody = document.getElementById('jogadoresBody');
  tbody.innerHTML = lista.map((jog, i) => {
    const nome         = jog.nome;
    const grupos       = jog._grupos;
    const jogosJogador = jog._jogos;
    const comRes       = jog._res;
    const nomeEnc = encodeURIComponent(nome);
    const tel = jog.tel || getTelefone(nome);
    const confMsg = encodeURIComponent('\u{1F3BE} Ol\u00e1 ' + nome + '!\n\nA tua inscri\u00e7\u00e3o no torneio *Play Padel \u00b7 2.\u00ba Anivers\u00e1rio* est\u00e1 confirmada. Bom jogo! \ud83c\udfc6');
    const waBtn = tel
      ? '<a class="btn-icon" style="color:#25D366" href="https://wa.me/' + tel.replace(/\D/g,'') + '?text=' + confMsg + '" target="_blank" title="WhatsApp"><i class="ph ph-whatsapp-logo"></i></a>'
      : '';
    return '<tr>' +
      '<td style="color:var(--cinza-texto);font-size:0.75rem">' + (i+1) + '</td>' +
      '<td><strong>' + escHtml(nome) + '</strong></td>' +
      '<td>' + grupos.map(g => '<span class="cat-pill cat-' + g.split('-')[0] + '">' + g + '</span>').join(' ') + '</td>' +
      '<td>' + jogosJogador.length + ' <span class="td-muted">jogo' + (jogosJogador.length!==1?'s':'') + '</span></td>' +
      '<td>' + comRes + ' <span class="td-muted">result.</span></td>' +
      '<td style="font-size:.78rem;color:var(--cinza-texto)">' + (tel || '<span style="opacity:.35">\u2014</span>') + '</td>' +
      '<td><div style="display:flex;gap:.15rem">' + waBtn +
        '<button class="btn-icon" onclick="editarJogador(decodeURIComponent(\'' + nomeEnc + '\'))" title="Editar"><i class="ph ph-pencil"></i></button>' +
        '<button class="btn-icon" style="color:var(--vermelho);opacity:.7" onclick="eliminarJogador(decodeURIComponent(\'' + nomeEnc + '\'))" title="Eliminar jogador"><i class="ph ph-trash"></i></button>' +
      '</div></td>' +
      '</tr>';
  }).join('');

  document.getElementById('jogadoresCount').textContent = lista.length;
}

function editarJogador(nome) {
  document.getElementById('jogadorNomeActual').textContent = nome;
  document.getElementById('jogadorNomeNovo').value = nome;
  document.getElementById('jogadorTelefone').value = getTelefone(nome);
  APP.editingId = nome;
  _renderJogadorGrupos(nome);
  openModal('modalJogador');
  setTimeout(() => {
    const inp = document.getElementById('jogadorNomeNovo');
    inp.focus();
    inp.select();
  }, 120);
}

function _renderJogadorGrupos(nome) {
  const wrap = document.getElementById('jogadorGruposWrap');
  const list = document.getElementById('jogadorGruposList');
  if (!wrap || !list) return;
  const jogos = getData('jogos');

  // Collect unique groups this player appears in, with their partner
  const gruposMap = {};
  jogos.forEach(j => {
    const eq1parts = j.eq1.split('&').map(n => n.trim());
    const eq2parts = j.eq2.split('&').map(n => n.trim());
    let par = null;
    if (eq1parts.includes(nome)) par = j.eq1;
    else if (eq2parts.includes(nome)) par = j.eq2;
    if (!par) return;
    if (!gruposMap[j.grupo]) gruposMap[j.grupo] = { grupoId: j.grupo, par, count: 0 };
    gruposMap[j.grupo].count++;
  });

  const grupos = Object.values(gruposMap);
  if (!grupos.length) { wrap.style.display = 'none'; return; }
  wrap.style.display = '';

  list.innerHTML = grupos.map(g => {
    const cat = g.grupoId.split('-')[0];
    const partner = g.par.split(' & ').filter(p => p.trim() !== nome).join(' & ') || '—';
    const nomeEnc = encodeURIComponent(nome);
    return `<div style="display:flex;align-items:center;gap:.6rem;padding:.45rem 0;border-bottom:1px solid var(--preto-borda)">
      <span class="cat-pill cat-${cat}" style="flex-shrink:0">${escHtml(g.grupoId)}</span>
      <div style="flex:1;min-width:0">
        <span style="font-size:.8rem;color:var(--cinza-texto);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block">Parceiro: ${escHtml(partner)}</span>
        <span style="font-size:.72rem;color:var(--cinza-texto);opacity:.6">${g.count} jogo${g.count!==1?'s':''}</span>
      </div>
      <button class="btn btn-danger btn-sm" style="flex-shrink:0;padding:.2rem .55rem;font-size:.72rem"
        onclick="removerJogadorDoGrupo(decodeURIComponent('${nomeEnc}'),'${g.grupoId}')"
        title="Substituir por A Definir neste grupo">
        <i class="ph ph-x"></i> Remover
      </button>
    </div>`;
  }).join('');
}

window.removerJogadorDoGrupo = function(nome, grupoId) {
  if (!confirm(`Remover "${nome}" do grupo ${grupoId}?\n\nO nome será substituído por "A Definir" nos ${grupoId} jogos.`)) return;
  const jogos = getData('jogos');
  let count = 0;
  jogos.forEach(j => {
    if (j.grupo !== grupoId) return;
    const eq1parts = j.eq1.split('&').map(n => n.trim());
    const eq2parts = j.eq2.split('&').map(n => n.trim());
    const idx1 = eq1parts.indexOf(nome);
    const idx2 = eq2parts.indexOf(nome);
    if (idx1 !== -1) { eq1parts[idx1] = 'A Definir'; j.eq1 = eq1parts.join(' & '); count++; }
    if (idx2 !== -1) { eq2parts[idx2] = 'A Definir'; j.eq2 = eq2parts.join(' & '); count++; }
  });
  setData('jogos', jogos);
  Auth.log('REMOVE_JOGADOR_GRUPO', 'jogadores', `"${nome}" removido de ${grupoId} (${count} jogo(s))`);
  toast(`"${nome}" removido de ${count} jogo(s) em ${grupoId}`, 'success');
  _renderJogadorGrupos(nome);
  renderJogadores();
};

function saveJogador() {
  const nomeAntigo = APP.editingId;
  const nomeNovo   = document.getElementById('jogadorNomeNovo').value.trim();
  const telNovo    = document.getElementById('jogadorTelefone').value.trim();
  if (!nomeNovo) { toast('Introduza o novo nome', 'error'); return; }

  if (nomeNovo !== nomeAntigo) {
    const oldTel = getTelefone(nomeAntigo);
    setTelefone(nomeAntigo, '');
    setTelefone(nomeNovo, telNovo || oldTel);
    const jogos = getData('jogos');
    let alterados = 0;
    jogos.forEach(j => {
      const eq1parts = j.eq1.split('&').map(n => n.trim());
      const eq2parts = j.eq2.split('&').map(n => n.trim());
      const idx1 = eq1parts.indexOf(nomeAntigo);
      const idx2 = eq2parts.indexOf(nomeAntigo);
      if (idx1 !== -1) { eq1parts[idx1] = nomeNovo; j.eq1 = eq1parts.join(' & '); alterados++; }
      if (idx2 !== -1) { eq2parts[idx2] = nomeNovo; j.eq2 = eq2parts.join(' & '); alterados++; }
    });
    setData('jogos', jogos);
    // Update entity store
    const jogadoresStore = getData('jogadores') || [];
    const jIdx = jogadoresStore.findIndex(j => j.nome === nomeAntigo);
    if (jIdx !== -1) { jogadoresStore[jIdx].nome = nomeNovo; jogadoresStore[jIdx].tel = telNovo || jogadoresStore[jIdx].tel; setData('jogadores', jogadoresStore); }
    Auth.log('RENAME_JOGADOR', 'jogadores', `"${nomeAntigo}" → "${nomeNovo}"`);
    toast(`"${nomeAntigo}" renomeado para "${nomeNovo}" em ${alterados} jogo${alterados!==1?'s':''}`, 'success');
  } else {
    setTelefone(nomeNovo, telNovo);
    // Update tel in entity store
    const jogadoresStore = getData('jogadores') || [];
    const jIdx = jogadoresStore.findIndex(j => j.nome === nomeNovo);
    if (jIdx !== -1) { jogadoresStore[jIdx].tel = telNovo; setData('jogadores', jogadoresStore); }
    toast('Guardado.', 'success');
  }
  closeModal('modalJogador');
  renderJogadores();
  APP.editingId = null;
}

window.eliminarJogador = function(nome) {
  if (!nome) return;
  if (!confirm(`Eliminar "${nome}"?\n\nO nome será substituído por "A Definir" em todos os jogos onde aparece.`)) return;
  const jogos = getData('jogos');
  let count = 0;
  jogos.forEach(j => {
    const eq1parts = j.eq1.split('&').map(n => n.trim());
    const eq2parts = j.eq2.split('&').map(n => n.trim());
    const idx1 = eq1parts.indexOf(nome);
    const idx2 = eq2parts.indexOf(nome);
    if (idx1 !== -1) { eq1parts[idx1] = 'A Definir'; j.eq1 = eq1parts.join(' & '); count++; }
    if (idx2 !== -1) { eq2parts[idx2] = 'A Definir'; j.eq2 = eq2parts.join(' & '); count++; }
  });
  setData('jogos', jogos);
  setTelefone(nome, '');
  // Remove from entity store
  const jogadoresStore = getData('jogadores') || [];
  const jIdx = jogadoresStore.findIndex(j => j.nome === nome);
  const jogadorId = jIdx !== -1 ? jogadoresStore[jIdx].id : null;
  if (jIdx !== -1) { jogadoresStore.splice(jIdx, 1); setData('jogadores', jogadoresStore); }
  // Remove from duplas store
  if (jogadorId) {
    const duplasStore = getData('duplas') || [];
    setData('duplas', duplasStore.filter(d => d.j1 !== jogadorId && d.j2 !== jogadorId));
  }
  Auth.log('DELETE_JOGADOR', 'jogadores', `"${nome}" eliminado de ${count} jogo(s)`);
  closeModal('modalJogador');
  toast(`"${nome}" eliminado de ${count} jogo(s)`, 'success');
  renderJogadores();
  APP.editingId = null;
};

// ============================================
//  DUPLAS
// ============================================

// Builds jogadores + duplas stores from jogos strings when stores are empty
// (needed when admin is opened via file:// and sync was skipped)
function _bootstrapEntityStores() {
  const jogos = getData('jogos') || [];
  if (!jogos.length) return;

  // --- Jogadores ---
  if ((getData('jogadores') || []).length === 0) {
    const namesSet = new Set();
    jogos.forEach(j => {
      [j.eq1, j.eq2].forEach(eq => {
        if (!eq) return;
        eq.split(' & ').forEach(n => { const t = n.trim(); if (t && t !== 'A Definir') namesSet.add(t); });
      });
    });
    const jogadores = [...namesSet].sort().map((nome, i) => ({ id: `j${i+1}`, nome, tel: '' }));
    setData('jogadores', jogadores);
  }

  // --- Duplas ---
  if ((getData('duplas') || []).length === 0) {
    const jogs = getData('jogadores') || [];
    const jogadoresMap = {};
    jogs.forEach(j => { jogadoresMap[j.nome] = j.id; });
    const seen = new Set();
    let dIdx = 1;
    const duplas = [];
    jogos.forEach(j => {
      [j.eq1, j.eq2].forEach(eq => {
        if (!eq || !j.grupo) return;
        const key = `${eq}|${j.grupo}`;
        if (seen.has(key)) return;
        seen.add(key);
        const parts = eq.split(' & ');
        if (parts.length !== 2) return;
        const j1id = jogadoresMap[parts[0].trim()];
        const j2id = jogadoresMap[parts[1].trim()];
        if (!j1id || !j2id) return;
        duplas.push({ id: `d${dIdx++}`, j1: j1id, j2: j2id, grupo: j.grupo });
      });
    });
    if (duplas.length) setData('duplas', duplas);
  }
}

function renderDuplas(filter = '') {
  const duplas   = getData('duplas') || [];
  const jogs     = getData('jogadores') || [];
  const jogos    = getData('jogos');

  // Populate group filter once
  const grupoFilter = document.getElementById('duplasFilterGrupo');
  const grupoSel = grupoFilter?.value || '';   // read BEFORE overwriting innerHTML
  if (grupoFilter) {
    const uniqueGrupos = [...new Set(duplas.map(d => d.grupo))].sort();
    grupoFilter.innerHTML = '<option value="">Todos os grupos</option>' +
      uniqueGrupos.map(g => `<option value="${g}"${g === grupoSel ? ' selected' : ''}>${g}</option>`).join('');
  }

  // Enrich with resolved names and jogos count
  let lista = duplas.map(d => {
    const j1 = jogs.find(j => j.id === d.j1);
    const j2 = jogs.find(j => j.id === d.j2);
    const n1 = j1?.nome || d.j1 || '?';
    const n2 = j2?.nome || d.j2 || '?';
    const eqStr = `${n1} & ${n2}`;
    const nJogos = jogos.filter(j => j.eq1 === eqStr || j.eq2 === eqStr).length;
    return { ...d, _n1: n1, _n2: n2, _nJogos: nJogos };
  });

  if (grupoSel) lista = lista.filter(d => d.grupo === grupoSel);
  if (filter) {
    const q = filter.toLowerCase();
    lista = lista.filter(d =>
      d._n1.toLowerCase().includes(q) ||
      d._n2.toLowerCase().includes(q) ||
      d.grupo.toLowerCase().includes(q)
    );
  }

  // Sort
  const s = APP.duplasSort;
  if (s.col) {
    lista.sort((a, b) => {
      const dir = s.dir === 'asc' ? 1 : -1;
      switch (s.col) {
        case 'j1':    return dir * a._n1.localeCompare(b._n1);
        case 'j2':    return dir * a._n2.localeCompare(b._n2);
        case 'grupo': return dir * a.grupo.localeCompare(b.grupo);
        case 'jogos': return dir * (a._nJogos - b._nJogos);
      }
      return 0;
    });
  }

  // Update sort header indicators
  const _si = col => APP.duplasSort.col === col
    ? (APP.duplasSort.dir === 'asc' ? ' <span style="color:var(--verde)">↑</span>' : ' <span style="color:var(--verde)">↓</span>')
    : ' <span style="opacity:.2;font-size:.65em">⇅</span>';
  const _th = (id, label, col) => { const el = document.getElementById(id); if (el) el.innerHTML = label + _si(col); };
  _th('thDupJ1',    'Jogador 1', 'j1');
  _th('thDupJ2',    'Jogador 2', 'j2');
  _th('thDupGrupo', 'Grupo',     'grupo');
  _th('thDupJogos', 'Jogos',     'jogos');

  const tbody = document.getElementById('duplasBody');
  if (!tbody) return;
  tbody.innerHTML = lista.map((d, i) => {
    const n1     = d._n1;
    const n2     = d._n2;
    const nJogos = d._nJogos;
    const cat = d.grupo.split('-')[0];
    return '<tr>' +
      `<td style="color:var(--cinza-texto);font-size:.75rem">${i+1}</td>` +
      `<td><strong>${escHtml(n1)}</strong></td>` +
      `<td><strong>${escHtml(n2)}</strong></td>` +
      `<td><span class="cat-pill cat-${cat}">${escHtml(d.grupo)}</span></td>` +
      `<td>${nJogos} <span class="td-muted">jogo${nJogos!==1?'s':''}</span></td>` +
      `<td><div style="display:flex;gap:.15rem">` +
        `<button class="btn-icon" onclick="editarDupla('${d.id}')" title="Editar"><i class="ph ph-pencil"></i></button>` +
        `<button class="btn-icon" style="color:var(--vermelho);opacity:.7" onclick="eliminarDupla('${d.id}')" title="Eliminar"><i class="ph ph-trash"></i></button>` +
      `</div></td>` +
      '</tr>';
  }).join('');
  const countEl = document.getElementById('duplasCount');
  if (countEl) countEl.textContent = lista.length;
}

function _populateDuplaModal() {
  const jogadores = (getData('jogadores') || []).slice().sort((a, b) => a.nome.localeCompare(b.nome));
  const opts = '<option value="">— Seleccionar —</option>' +
    jogadores.map(j => `<option value="${j.id}">${escHtml(j.nome)}</option>`).join('');
  document.getElementById('duplaJ1').innerHTML = opts;
  document.getElementById('duplaJ2').innerHTML = opts;
  const grupos = getData('grupos') || [];
  document.getElementById('duplaGrupo').innerHTML = '<option value="">— Seleccionar —</option>' +
    grupos.map(g => `<option value="${g.id}">${g.id}</option>`).join('');
}

function abrirNovaDupla() {
  APP.editingId = null;
  document.getElementById('modalDuplaTitle').textContent = 'Nova Dupla';
  _populateDuplaModal();
  openModal('modalDupla');
}

window.editarDupla = function(id) {
  const dupla = getDupla(id);
  if (!dupla) return;
  APP.editingId = id;
  document.getElementById('modalDuplaTitle').textContent = 'Editar Dupla';
  _populateDuplaModal();
  document.getElementById('duplaJ1').value    = dupla.j1 || '';
  document.getElementById('duplaJ2').value    = dupla.j2 || '';
  document.getElementById('duplaGrupo').value = dupla.grupo || '';
  openModal('modalDupla');
};

function salvarDupla() {
  const j1    = document.getElementById('duplaJ1').value;
  const j2    = document.getElementById('duplaJ2').value;
  const grupo = document.getElementById('duplaGrupo').value;
  if (!j1 || !j2 || !grupo) return toast('Preencha todos os campos.', 'error');
  if (j1 === j2) return toast('Os dois jogadores têm de ser diferentes.', 'error');

  const duplas   = getData('duplas') || [];
  const jogs     = getData('jogadores') || [];
  const j1nome   = jogs.find(j => j.id === j1)?.nome || j1;
  const j2nome   = jogs.find(j => j.id === j2)?.nome || j2;
  const newEqStr = `${j1nome} & ${j2nome}`;

  if (APP.editingId) {
    const idx = duplas.findIndex(d => d.id === APP.editingId);
    if (idx !== -1) {
      const old    = duplas[idx];
      const oldJ1n = jogs.find(j => j.id === old.j1)?.nome || old.j1 || '';
      const oldJ2n = jogs.find(j => j.id === old.j2)?.nome || old.j2 || '';
      const oldEq  = `${oldJ1n} & ${oldJ2n}`;
      duplas[idx] = { ...old, j1, j2, grupo };
      if (oldEq !== newEqStr || old.grupo !== grupo) {
        const jogos = getData('jogos');
        jogos.forEach(j => {
          if (j.grupo === old.grupo) {
            if (j.eq1 === oldEq) { j.eq1 = newEqStr; j.grupo = grupo; }
            if (j.eq2 === oldEq) { j.eq2 = newEqStr; j.grupo = grupo; }
          }
        });
        setData('jogos', jogos);
      }
    }
    setData('duplas', duplas);
    Auth.log('EDIT_DUPLA', 'duplas', `${newEqStr} → ${grupo}`);
    toast('Dupla actualizada.', 'success');
  } else {
    const exists = duplas.find(d => (d.j1===j1&&d.j2===j2&&d.grupo===grupo) || (d.j1===j2&&d.j2===j1&&d.grupo===grupo));
    if (exists) return toast('Esta dupla já existe neste grupo.', 'error');
    const newId = _nextEntityId('duplas', 'd');
    duplas.push({ id: newId, j1, j2, grupo });
    setData('duplas', duplas);
    Auth.log('CREATE_DUPLA', 'duplas', `${newEqStr} no grupo ${grupo}`);
    toast('Dupla criada.', 'success');
  }
  closeModal('modalDupla');
  renderDuplas();
  APP.editingId = null;
}

window.eliminarDupla = function(id) {
  const d = getDupla(id);
  if (!d) return;
  const jogs  = getData('jogadores') || [];
  const j1n   = jogs.find(j => j.id === d.j1)?.nome || d.j1 || '';
  const j2n   = jogs.find(j => j.id === d.j2)?.nome || d.j2 || '';
  const eqStr = `${j1n} & ${j2n}`;
  if (!confirm(`Eliminar a dupla "${eqStr}" do grupo ${d.grupo}?\n\nOs jogos desta dupla serão marcados como "A Definir".`)) return;
  const jogos = getData('jogos');
  let count = 0;
  jogos.forEach(j => {
    if (j.grupo === d.grupo) {
      if (j.eq1 === eqStr) { j.eq1 = 'A Definir & A Definir'; count++; }
      if (j.eq2 === eqStr) { j.eq2 = 'A Definir & A Definir'; count++; }
    }
  });
  setData('jogos', jogos);
  setData('duplas', (getData('duplas') || []).filter(x => x.id !== id));
  Auth.log('DELETE_DUPLA', 'duplas', `"${eqStr}" eliminada de ${d.grupo}`);
  toast(`Dupla eliminada. ${count} jogo${count!==1?'s':''} actualizados.`, 'success');
  renderDuplas();
};

// ---------- JOGOS ----------
function matchSetsScore(r) {
  if (r.wo) return r.wo === 'eq1' ? { w1: 0, w2: 2 } : { w1: 2, w2: 0 };
  let w1 = 0, w2 = 0;
  if (r.s1eq1 > r.s1eq2) w1++; else w2++;
  if (r.s2eq1 !== null) { if (r.s2eq1 > r.s2eq2) w1++; else w2++; }
  if (r.s3eq1 !== null) { if (r.s3eq1 > r.s3eq2) w1++; else w2++; }
  return { w1, w2 };
}

// Returns all jogos (group stage + fase final) normalised to a common shape.
function getAllJogosNormalized() {
  const grupoJogos = getData('jogos');
  const ff = getData('fasefinal') || {};
  const ffJogos = Object.entries(ff).flatMap(([catId, catData]) =>
    (catData?.jogos || []).map(j => ({
      ...j,
      grupo: catId + '-' + (j.fase === 'F' ? 'Final' : j.fase),
      campo: j.campo || '—',
      _isFF: true,
      _cat: catId
    }))
  );
  return [...grupoJogos, ...ffJogos]
    .filter(j => j.data && j.hora)
    .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora) || String(a.id).localeCompare(String(b.id)));
}

function renderJogos(filtroData = 'todos', filtroCampo = 'todos', filtroGrupo = 'todos', filtroResultado = 'todos') {
  let jogos = getAllJogosNormalized();

  if (filtroData !== 'todos')   jogos = jogos.filter(j => j.data === filtroData);
  if (filtroCampo !== 'todos')  jogos = jogos.filter(j => j.campo === filtroCampo);
  if (filtroGrupo !== 'todos')  jogos = jogos.filter(j => j.grupo === filtroGrupo);
  if (filtroResultado !== 'todos') {
    jogos = jogos.filter(j => {
      if (filtroResultado === 'pendente')      return !j.resultado && !j.suspenso && !j.adiado;
      if (filtroResultado === 'suspenso')     return !!j.suspenso && !j.resultado;
      if (filtroResultado === 'adiado')       return !!j.adiado   && !j.resultado;
      if (filtroResultado === 'com_resultado') return !!j.resultado;
      if (filtroResultado === 'wo')           return j.resultado?.wo;
      // score filters like '2-0', '1-2' etc.
      if (!j.resultado || j.resultado.wo) return false;
      const { w1, w2 } = matchSetsScore(j.resultado);
      return `${w1}-${w2}` === filtroResultado;
    });
  }

  const tbody = document.getElementById('jogosBody');
  tbody.innerHTML = jogos.map(j => {
    const cat = j.grupo.split('-')[0];
    const resHtml = j.resultado
      ? (() => {
          if (j.resultado.wo) {
            return `<span style="background:rgba(255,74,74,.15);color:var(--vermelho);font-size:.7rem;font-weight:700;padding:.1rem .35rem;border-radius:4px">WO</span>`;
          }
          const { w1, w2 } = matchSetsScore(j.resultado);
          const r = j.resultado;
          const sets = [[r.s1eq1,r.s1eq2],[r.s2eq1,r.s2eq2],[r.s3eq1,r.s3eq2]]
            .filter(([a])=>a!=null).map(([a,b])=>`${a}-${b}`).join(' / ');
          return `<span class="score-display" title="${sets}" style="display:inline-flex;align-items:center;gap:.3rem">
            <span style="font-size:.85rem;font-weight:700;color:var(--branco)">${w1}</span>
            <span class="sd">–</span>
            <span style="font-size:.85rem;font-weight:700;color:var(--branco)">${w2}</span>
            <span style="font-size:.65rem;color:var(--cinza-texto);letter-spacing:.05em">sets</span>
          </span>`;
        })()
      : j.adiado
        ? `<span style="background:rgba(107,156,247,.15);color:#6B9CF7;font-size:.7rem;font-weight:700;padding:.1rem .35rem;border-radius:4px" title="${escHtml(j.adiado.motivo||'')}">&#x1F4C5; Adiado${j.adiado.motivo ? ' — '+escHtml(j.adiado.motivo) : ''}</span>`
      : j.suspenso
        ? `<span style="background:rgba(255,154,60,.15);color:#FF9A3C;font-size:.7rem;font-weight:700;padding:.1rem .35rem;border-radius:4px">⏸ Suspenso</span>`
        : `<span class="badge badge-amarelo">Pendente</span>`;

    const waBtns = j.resultado
      ? ''
      : `<button class="btn-icon" style="color:#25D366" title="Notificação de jogo" onclick="waImageJogo('${j.id}',${!!j._isFF},'${j._cat||''}')"><i class="ph ph-share-network"></i></button>`;

    const acoes = j._isFF
      ? `<div style="display:flex;gap:0.3rem">
          <button class="btn-icon btn-edit" title="Lançar resultado" onclick="ffAbrirResultado('${j.id}','${j._cat}')"><i class="ph ph-pencil-simple"></i></button>
        </div>`
      : `<div style="display:flex;gap:0.3rem">
          <button class="btn-icon btn-edit" title="Editar jogo / lançar resultado" onclick="abrirResultado(${j.id})"><i class="ph ph-pencil-simple"></i></button>
          <button class="btn-icon btn-del"  title="Eliminar jogo"    onclick="deleteJogo(${j.id})"><i class="ph ph-trash"></i></button>
        </div>`;

    return `
    <tr>
      <td class="td-mono" style="color:var(--cinza-texto)">${j.id}</td>
      <td><span class="td-mono">${formatDate(j.data)}</span></td>
      <td>${j.hora}</td>
      <td><span class="badge badge-cinza" style="font-size:0.65rem">${j.campo}</span></td>
      <td><span class="cat-pill cat-${cat}">${j.grupo}</span></td>
      <td style="text-align:right">${(j.eq1||'').split(' & ').join('<br>')}</td>
      <td style="text-align:center;color:var(--cinza-texto);font-size:0.7rem">VS</td>
      <td>${(j.eq2||'').split(' & ').join('<br>')}</td>
      <td style="text-align:center">${resHtml}</td>
      <td>${acoes}</td>
      <td style="text-align:center">${waBtns}</td>
    </tr>`;
  }).join('');

  document.getElementById('jogosCount').textContent = jogos.length;
}

window.deleteJogo = function(id) {
  if (!confirm('Eliminar este jogo?')) return;
  const jogos = getData('jogos').filter(j => j.id !== id);
  setData('jogos', jogos);
  renderJogos();
  toast('Jogo eliminado.');
};

// ---------- TESTES: RESULTADOS ALEATÓRIOS ----------
function randomSet() {
  const validScores = [[6,0],[6,1],[6,2],[6,3],[6,4],[7,5]];
  const useTb = Math.random() < 0.15;
  let eq1, eq2, tbEq1 = null, tbEq2 = null;
  if (useTb) {
    const tbOptions = [[7,0],[7,1],[7,2],[7,3],[7,4],[7,5],[8,6],[9,7],[10,8]];
    const tb = tbOptions[Math.floor(Math.random() * tbOptions.length)];
    eq1 = 7; eq2 = 6; tbEq1 = tb[0]; tbEq2 = tb[1];
  } else {
    const s = validScores[Math.floor(Math.random() * validScores.length)];
    eq1 = s[0]; eq2 = s[1];
  }
  if (Math.random() < 0.5) return { eq1: eq2, eq2: eq1, tbEq1: tbEq2, tbEq2: tbEq1 };
  return { eq1, eq2, tbEq1, tbEq2 };
}

window.gerarResultadosAleatorios = function() {
  if (!Auth.isAdmin()) return toast('Apenas administradores podem executar esta acção.', 'error');
  if (!confirm('Preencher todos os jogos pendentes com resultados aleatórios?\n(Apenas para testes — os resultados existentes não são alterados.)')) return;
  const jogos = getData('jogos');
  let count = 0;
  jogos.forEach(j => {
    if (j.resultado) return;
    const s1 = randomSet(), s2 = randomSet();
    const w1 = s1.eq1 > s1.eq2 ? 1 : 2;
    const w2 = s2.eq1 > s2.eq2 ? 1 : 2;
    const resultado = {
      s1eq1: s1.eq1, s1eq2: s1.eq2, tb1eq1: s1.tbEq1, tb1eq2: s1.tbEq2,
      s2eq1: s2.eq1, s2eq2: s2.eq2, tb2eq1: s2.tbEq1, tb2eq2: s2.tbEq2,
      s3eq1: null,   s3eq2: null,   tb3eq1: null,      tb3eq2: null,
    };
    if (w1 !== w2) {
      const s3 = randomSet();
      resultado.s3eq1 = s3.eq1; resultado.s3eq2 = s3.eq2;
      resultado.tb3eq1 = s3.tbEq1; resultado.tb3eq2 = s3.tbEq2;
    }
    j.resultado = resultado;
    count++;
  });
  setData('jogos', jogos);
  renderView(APP.currentView);
  toast(`${count} resultados aleatórios gerados.`);
};

window.toggleDangerBtns = function() {
  const unlocked = document.body.classList.toggle('danger-unlocked');
  localStorage.setItem('ppDangerMode', unlocked ? '1' : '0');
  const icon = document.getElementById('dangerToggleIcon');
  const lbl  = document.getElementById('dangerToggleLabel');
  if (icon) icon.className = unlocked ? 'ph ph-lock-open' : 'ph ph-lock';
  if (lbl)  lbl.textContent = unlocked ? 'Modo Avançado: ON' : 'Modo Avançado: OFF';
  toast(unlocked ? '⚠ Botões perigosos activados. Cuidado!' : '🔒 Botões perigosos desactivados.', unlocked ? 'warn' : 'ok');
};

window.limparTodosResultados = function() {
  if (!confirm('Limpar TODOS os resultados do torneio?\nEsta acção não pode ser desfeita.')) return;
  const jogos = getData('jogos').map(j => ({ ...j, resultado: null }));
  setData('jogos', jogos);
  renderView(APP.currentView);
  toast('Todos os resultados foram removidos.');
};

// ---------- RESULTADOS ----------
function renderResultados(filtroData = 'todos') {
  let jogos = getData('jogos').filter(j => !j.resultado);
  if (filtroData !== 'todos') jogos = jogos.filter(j => j.data === filtroData);

  const tbody = document.getElementById('resultadosBody');
  tbody.innerHTML = jogos.map(j => {
    const cat = j.grupo.split('-')[0];
    return `
    <tr>
      <td><span class="td-mono">${formatDate(j.data)}</span> ${j.hora}</td>
      <td><span class="badge badge-cinza" style="font-size:0.65rem">${j.campo}</span></td>
      <td><span class="cat-pill cat-${cat}">${j.grupo}</span></td>
      <td style="text-align:right">${j.eq1.split(' & ').join('<br>')}</td>
      <td style="text-align:center;color:var(--cinza-texto)">VS</td>
      <td>${j.eq2.split(' & ').join('<br>')}</td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="abrirResultado(${j.id})">
          <i class="ph ph-pencil-simple"></i> Resultado
        </button>
      </td>
    </tr>`;
  }).join('');

  document.getElementById('resultadosPendentes').textContent = jogos.length;
}

// ---------- LANÇAR RESULTADO ----------

function _populateResEqSelects(grupoId) {
  const duplas = getDuplasByGrupo(grupoId);
  const jogs   = getData('jogadores') || [];
  const opts = '<option value="">— Seleccionar dupla —</option>' + duplas.map(d => {
    const j1 = jogs.find(j => j.id === d.j1);
    const j2 = jogs.find(j => j.id === d.j2);
    return `<option value="${d.id}">${escHtml((j1?.nome||'?') + ' & ' + (j2?.nome||'?'))}</option>`;
  }).join('');
  document.getElementById('resEq1Sel').innerHTML = opts;
  document.getElementById('resEq2Sel').innerHTML = opts;
}

window.resUpdateTeamName = function(n) {
  const sel = document.getElementById(`resEq${n}Sel`);
  const el  = document.getElementById(`resTeam${n}`);
  if (!sel || !el) return;
  const duplaId = sel.value;
  let label = '';
  if (duplaId) {
    const d = getDupla(duplaId);
    if (d) label = getDuplaLabel(d);
  }
  el.innerHTML = (label || 'A Definir').split(' & ').map(escHtml).join('<br>');
  el.dataset.equipa = label || 'A Definir & A Definir';
};


function getSetWinner(n) {
  const e1v = document.getElementById(`resS${n}E1`)?.value ?? '';
  const e2v = document.getElementById(`resS${n}E2`)?.value ?? '';
  if (e1v === '' || e2v === '') return 0;
  const a = parseInt(e1v), b = parseInt(e2v);
  if (isNaN(a) || isNaN(b)) return 0;
  if (a === 6 && b === 6) {
    const tv1 = document.getElementById(`resTB${n}E1`)?.value ?? '';
    const tv2 = document.getElementById(`resTB${n}E2`)?.value ?? '';
    if (tv1 === '' || tv2 === '') return 0;
    const ta = parseInt(tv1), tb = parseInt(tv2);
    if (isNaN(ta) || isNaN(tb) || ta === tb) return 0;
    const hi = Math.max(ta, tb), lo = Math.min(ta, tb);
    if (hi < 7 || hi - lo < 2) return 0;
    return ta > tb ? 1 : 2;
  }
  const hi = Math.max(a, b), lo = Math.min(a, b);
  if ((hi === 6 && lo <= 4) || (hi === 7 && lo === 5)) return a > b ? 1 : 2;
  return 0;
}

function clearSetInputs(n) {
  ['E1','E2'].forEach(s => { const el = document.getElementById(`resS${n}${s}`); if (el) el.value = ''; });
  ['E1','E2'].forEach(s => { const el = document.getElementById(`resTB${n}${s}`); if (el) el.value = ''; });
  const tbRow = document.getElementById(`tbRow${n}`); if (tbRow) tbRow.style.display = 'none';
  const st = document.getElementById(`setStatus${n}`); if (st) { st.textContent = ''; st.className = 'set-status'; }
}

function updateMatchResultBar() {
  const bar = document.getElementById('matchResultBar');
  if (!bar) return;
  const s1w = getSetWinner(1), s2w = getSetWinner(2), s3w = getSetWinner(3);
  const wins1 = [s1w, s2w, s3w].filter(w => w === 1).length;
  const wins2 = [s1w, s2w, s3w].filter(w => w === 2).length;
  if (wins1 >= 2 || wins2 >= 2) {
    const name = wins1 >= 2
      ? (document.getElementById('resTeam1').dataset.equipa || document.getElementById('resTeam1').textContent)
      : (document.getElementById('resTeam2').dataset.equipa || document.getElementById('resTeam2').textContent);
    bar.className = 'match-result-bar match-result-bar--win';
    bar.textContent = '🏆 Vence: ' + name;
    bar.style.display = '';
  } else if (s1w && s2w && s1w !== s2w) {
    bar.className = 'match-result-bar match-result-bar--pending';
    bar.textContent = '1-1 → joga-se o 3.º set';
    bar.style.display = '';
  } else {
    bar.style.display = 'none';
  }
}

window.onSetInput = function(n) {
  const e1v = document.getElementById(`resS${n}E1`).value;
  const e2v = document.getElementById(`resS${n}E2`).value;
  const tbRow = document.getElementById(`tbRow${n}`);
  const statusEl = document.getElementById(`setStatus${n}`);

  if (e1v !== '' && e2v !== '') {
    const a = parseInt(e1v), b = parseInt(e2v);
    if (a === 6 && b === 6) {
      tbRow.style.display = '';
      statusEl.className = 'set-status set-status--tie';
      statusEl.textContent = '6-6 → TB';
    } else {
      tbRow.style.display = 'none';
      document.getElementById(`resTB${n}E1`).value = '';
      document.getElementById(`resTB${n}E2`).value = '';
      const w = getSetWinner(n);
      if (w) {
        statusEl.className = 'set-status set-status--ok'; statusEl.textContent = '✓';
      } else {
        statusEl.className = 'set-status set-status--err'; statusEl.textContent = 'Inválido';
      }
    }
  } else {
    tbRow.style.display = 'none';
    statusEl.textContent = ''; statusEl.className = 'set-status';
  }

  // Cascade set visibility
  const s1w = getSetWinner(1);
  const set2Block = document.getElementById('setBlock2');
  if (!s1w) {
    set2Block.style.display = 'none'; clearSetInputs(2);
    document.getElementById('setBlock3').style.display = 'none'; clearSetInputs(3);
    document.getElementById('matchResultBar').style.display = 'none';
    return;
  }
  set2Block.style.display = '';
  const s2w = getSetWinner(2);
  const set3Block = document.getElementById('setBlock3');
  if (s2w) {
    if (s1w !== s2w) { set3Block.style.display = ''; }
    else { set3Block.style.display = 'none'; clearSetInputs(3); }
  } else {
    set3Block.style.display = 'none';
  }
  updateMatchResultBar();
};

window.abrirResultado = function(jogoId) {
  const jogos = getData('jogos');
  const j = jogos.find(x => x.id === jogoId);
  if (!j) return;

  APP.editingId = jogoId;

  // Show editable schedule + duplas fields (group stage only)
  document.getElementById('resMatchInfo').style.display = 'none';
  const editFields = document.getElementById('resEditFields');
  editFields.style.display = '';

  // Populate campo select
  const campos = getData('campos') || [];
  document.getElementById('resCampo').innerHTML =
    campos.map(c => `<option value="${c.nome}">${c.nome}</option>`).join('');

  // Populate eq selects for this grupo
  _populateResEqSelects(j.grupo || '');

  // Fill current values
  document.getElementById('resData').value  = j.data  || '';
  document.getElementById('resHora').value  = j.hora  || '';
  document.getElementById('resCampo').value = j.campo || '';
  document.getElementById('resEq1Sel').value = _eqStrToDuplaId(j.eq1 || '', j.grupo || '');
  document.getElementById('resEq2Sel').value = _eqStrToDuplaId(j.eq2 || '', j.grupo || '');

  // Update team name preview
  resUpdateTeamName(1);
  resUpdateTeamName(2);

  // Reset WO state
  const _woChk = document.getElementById('resWoCheck');
  if (_woChk) _woChk.checked = false;
  const _woPk = document.getElementById('resWoPicker');
  if (_woPk) _woPk.style.display = 'none';
  APP._woSelection = null;
  [1,2,3].forEach(n => { const b = document.getElementById(`setBlock${n}`); if (b) { b.style.opacity='1'; b.querySelectorAll('input').forEach(el => el.disabled = false); } });
  // Update WO button labels with team names
  const _wbT1 = j.eq1 || 'Equipa 1';
  const _wbT2 = j.eq2 || 'Equipa 2';
  const _wb1 = document.getElementById('resWoEq1Btn'); if (_wb1) _wb1.textContent = (_wbT1.length>28?_wbT1.substring(0,28)+'\u2026':_wbT1) + ' \u2014 WO';
  const _wb2 = document.getElementById('resWoEq2Btn'); if (_wb2) _wb2.textContent = (_wbT2.length>28?_wbT2.substring(0,28)+'\u2026':_wbT2) + ' \u2014 WO';

  // Reset all inputs and visibility
  [1, 2, 3].forEach(n => clearSetInputs(n));
  [2, 3].forEach(n => { document.getElementById(`setBlock${n}`).style.display = 'none'; });
  document.getElementById('matchResultBar').style.display = 'none';

  // Reset suspenso panel
  const _suspBanner = document.getElementById('resSuspensoBanner');
  const _suspNota   = document.getElementById('resSuspensoNota');
  APP._suspensoServe = null;
  if (_suspNota) _suspNota.value = '';

  // Reset adiado panel
  const _adiadoBanner = document.getElementById('resAdiadoBanner');
  const _adiadoMotivo = document.getElementById('resAdiadoMotivo');
  if (_adiadoBanner) _adiadoBanner.style.display = 'none';
  if (_adiadoMotivo) _adiadoMotivo.value = '';
  // Build per-player serve buttons from actual team names
  const _serveBtnsWrap = document.getElementById('resSuspensoServeBtns');
  if (_serveBtnsWrap) {
    const _allPlayers = [
      ...(j.eq1 || 'Equipa 1').split(' & ').map(p => p.trim()),
      ...(j.eq2 || 'Equipa 2').split(' & ').map(p => p.trim()),
    ];
    _serveBtnsWrap.innerHTML = _allPlayers.map(p =>
      `<button type="button" class="btn btn-ghost" data-serve="${escHtml(p)}" style="font-size:.72rem;padding:.28rem .6rem" onclick="selectSuspensoServe(this.dataset.serve)">${escHtml(p)}</button>`
    ).join('');
  }

  const r = j.resultado;
  const s = j.suspenso; // partial data when game was suspended
  const loadData = r || s; // prefer resultado, fall back to suspenso

  // Show suspension panel only for non-finished games
  const _suspTitle = document.getElementById('resSuspensoBannerTitle');
  if (_suspBanner) _suspBanner.style.display = (!r) ? '' : 'none';
  if (_suspTitle) _suspTitle.textContent = s ? '\u23f8 Jogo Suspenso (estado parcial guardado)' : '\u23f8 Suspens\u00e3o';

  if (r) {
    if (r.wo) {
      if (_woChk) { _woChk.checked = true; if (_woPk) _woPk.style.display = ''; }
      selectResWo(r.wo);
    } else {
      function loadSet(n, eq1, eq2, tbEq1, tbEq2) {
        const isTbSet = (eq1 === 7 && eq2 === 6) || (eq1 === 6 && eq2 === 7);
        document.getElementById(`resS${n}E1`).value = isTbSet ? 6 : eq1;
        document.getElementById(`resS${n}E2`).value = isTbSet ? 6 : eq2;
        if (isTbSet && tbEq1 != null) {
          document.getElementById(`resTB${n}E1`).value = tbEq1;
          document.getElementById(`resTB${n}E2`).value = tbEq2;
        }
      }
      loadSet(1, r.s1eq1, r.s1eq2, r.tb1eq1, r.tb1eq2);
      if (r.s2eq1 !== null) loadSet(2, r.s2eq1, r.s2eq2, r.tb2eq1, r.tb2eq2);
      if (r.s3eq1 !== null) loadSet(3, r.s3eq1, r.s3eq2, r.tb3eq1, r.tb3eq2);
    }
  } else if (s) {
    // Load suspended partial state — no validation needed
    if (_suspNota && s.nota)  _suspNota.value = s.nota;
    if (s.serve) {
      // Backward compat: old format stored 'eq1'/'eq2', new stores player name
      let _servePlayer = s.serve;
      if (_servePlayer === 'eq1') _servePlayer = (j.eq1 || '').split(' & ')[0].trim();
      else if (_servePlayer === 'eq2') _servePlayer = (j.eq2 || '').split(' & ')[0].trim();
      selectSuspensoServe(_servePlayer);
    }
    function loadSetRaw(n, eq1, eq2) {
      if (eq1 == null || eq2 == null) return;
      document.getElementById(`resS${n}E1`).value = eq1;
      document.getElementById(`resS${n}E2`).value = eq2;
      document.getElementById(`setBlock${n}`).style.display = '';
      onSetInput(n);
    }
    if (s.s1eq1 != null) loadSetRaw(1, s.s1eq1, s.s1eq2);
    if (s.s2eq1 != null) loadSetRaw(2, s.s2eq1, s.s2eq2);
    if (s.s3eq1 != null) loadSetRaw(3, s.s3eq1, s.s3eq2);
  }

  // Trigger UI cascade (only when no WO and no suspenso raw load)
  if (!r?.wo && !s) {
    onSetInput(1);
    if (r?.s2eq1 !== null) onSetInput(2);
    if (r?.s3eq1 !== null) onSetInput(3);
  } else if (!r?.wo && !s) {
    onSetInput(1);
  }

  // Histórico de edições deste jogo
  const histEl = document.getElementById('resHistorico');
  if (histEl) {
    const hist = Auth.getLogs().filter(l =>
      (l.action === 'SAVE_RESULT' || l.action === 'CLEAR_RESULT' || l.action === 'SAVE_SCHEDULE') &&
      l.detail.includes('#' + jogoId)
    ).slice(0, 5);
    if (hist.length) {
      histEl.style.display = '';
      histEl.innerHTML = `<div style="font-size:.68rem;color:var(--cinza-texto);margin-bottom:.3rem;font-weight:600;text-transform:uppercase;letter-spacing:.04em">Histórico</div>` +
        hist.map(l => `<div style="font-size:.7rem;color:var(--cinza-texto);padding:.15rem 0;border-bottom:1px solid var(--preto-borda);display:flex;justify-content:space-between;gap:.5rem">
          <span><span style="color:${l.action==='SAVE_RESULT'?'var(--verde)':l.action==='CLEAR_RESULT'?'var(--vermelho)':'var(--amarelo)'};font-weight:700">${l.action}</span> — ${escHtml(l.username)}</span>
          <span style="white-space:nowrap">${new Date(l.ts).toLocaleString('pt-PT',{dateStyle:'short',timeStyle:'short'})}</span>
        </div>`).join('');
    } else {
      histEl.style.display = 'none';
    }
  }

  // Pre-fill adiado banner if game is already marked as adiado
  if (j.adiado && !j.resultado) {
    if (_adiadoBanner) _adiadoBanner.style.display = '';
    if (_adiadoMotivo) _adiadoMotivo.value = j.adiado.motivo || '';
  }

  openModal('modalResultado');
};

window.toggleResWo = function() {
  const checked = document.getElementById('resWoCheck')?.checked;
  const picker = document.getElementById('resWoPicker');
  if (picker) picker.style.display = checked ? '' : 'none';
  [1,2,3].forEach(n => {
    const b = document.getElementById(`setBlock${n}`);
    if (!b) return;
    b.style.opacity = checked ? '0.3' : '1';
    b.querySelectorAll('input').forEach(el => el.disabled = !!checked);
  });
  if (!checked) APP._woSelection = null;
};

window.selectResWo = function(eq) {
  APP._woSelection = eq;
  const aStyle = 'flex:1;background:var(--vermelho);color:#fff;border:1px solid var(--vermelho);border-radius:6px;padding:.35rem .7rem;cursor:pointer;font-size:.78rem;font-weight:600';
  const iStyle = 'flex:1;border:1px solid rgba(255,74,74,.35);background:transparent;color:var(--cinza-texto);border-radius:6px;padding:.35rem .7rem;cursor:pointer;font-size:.78rem';
  const btn1 = document.getElementById('resWoEq1Btn');
  const btn2 = document.getElementById('resWoEq2Btn');
  if (btn1) btn1.style.cssText = eq === 'eq1' ? aStyle : iStyle;
  if (btn2) btn2.style.cssText = eq === 'eq2' ? aStyle : iStyle;
  [1,2,3].forEach(n => { const b = document.getElementById(`setBlock${n}`); if (b) b.style.opacity = '0.25'; });
};

// ── Suspender jogo (estado parcial) ─────────────────────────────
window.selectSuspensoServe = function(playerName) {
  APP._suspensoServe = playerName;
  const wrap = document.getElementById('resSuspensoServeBtns');
  if (!wrap) return;
  wrap.querySelectorAll('button').forEach(btn => {
    const active = btn.dataset.serve === playerName;
    btn.style.background   = active ? 'rgba(255,154,60,.25)' : '';
    btn.style.color        = active ? '#FF9A3C' : '';
    btn.style.borderColor  = active ? 'rgba(255,154,60,.6)' : '';
    btn.style.fontWeight   = active ? '700' : '';
  });
};

window.adiarJogo = function() {
  if (APP.ffEditing) return toast('Adiamento não disponível para jogos de Fase Final.', 'error');
  if (!APP.editingId) return;
  const banner = document.getElementById('resAdiadoBanner');
  // First click: show the banner so user fills in motivo
  if (!banner || banner.style.display === 'none') {
    if (banner) banner.style.display = '';
    document.getElementById('resAdiadoMotivo')?.focus();
    return;
  }
  // Second click (banner already visible): save
  const motivo = (document.getElementById('resAdiadoMotivo')?.value || '').trim();
  const jogos = getData('jogos');
  const idx = jogos.findIndex(j => j.id === APP.editingId);
  if (idx < 0) return;
  jogos[idx].adiado   = { motivo, ts: Date.now() };
  jogos[idx].suspenso = null;
  // Save any schedule edits too
  const newData  = document.getElementById('resData')?.value;
  const newHora  = document.getElementById('resHora')?.value;
  const newCampo = document.getElementById('resCampo')?.value;
  if (newData)  jogos[idx].data  = newData;
  if (newHora)  jogos[idx].hora  = newHora;
  if (newCampo) jogos[idx].campo = newCampo;
  setData('jogos', jogos);
  closeModal('modalResultado');
  renderView(APP.currentView);
  updateAlertBanner();
  Auth.log('ADIAR_JOGO', 'jogos', `Jogo #${APP.editingId} adiado${motivo ? ': '+motivo : ''}`);
  toast(motivo ? `Jogo adiado — ${motivo}` : 'Jogo marcado como adiado.');
};

window.suspenderJogo = function() {
  if (APP.ffEditing) return toast('Suspensão não disponível para jogos de Fase Final.', 'error');
  if (!APP.editingId) return;

  // Collect whatever scores are in the inputs (no validation)
  function readRaw(n) {
    const v1 = document.getElementById(`resS${n}E1`)?.value;
    const v2 = document.getElementById(`resS${n}E2`)?.value;
    if (v1 === '' || v1 == null || v2 === '' || v2 == null) return null;
    return { eq1: parseInt(v1) || 0, eq2: parseInt(v2) || 0 };
  }
  const r1 = readRaw(1), r2 = readRaw(2), r3 = readRaw(3);
  if (!r1) return toast('Introduza pelo menos o score parcial do 1.º set antes de suspender.', 'error');

  const nota = document.getElementById('resSuspensoNota')?.value?.trim() || '';
  const suspenso = {
    s1eq1: r1.eq1, s1eq2: r1.eq2,
    s2eq1: r2 ? r2.eq1 : null, s2eq2: r2 ? r2.eq2 : null,
    s3eq1: r3 ? r3.eq1 : null, s3eq2: r3 ? r3.eq2 : null,
    serve: APP._suspensoServe || null,
    nota,
    ts: new Date().toISOString(),
  };

  const jogos = getData('jogos');
  const idx = jogos.findIndex(j => j.id === APP.editingId);
  if (idx < 0) return;

  // Save schedule edits if visible
  const resEditFields = document.getElementById('resEditFields');
  if (resEditFields && resEditFields.style.display !== 'none') {
    const newData  = document.getElementById('resData')?.value;
    const newHora  = document.getElementById('resHora')?.value;
    const newCampo = document.getElementById('resCampo')?.value;
    if (newData)  jogos[idx].data  = newData;
    if (newHora)  jogos[idx].hora  = newHora;
    if (newCampo) jogos[idx].campo = newCampo;
  }

  jogos[idx].suspenso  = suspenso;
  jogos[idx].resultado = null; // still no final result
  setData('jogos', jogos);
  closeModal('modalResultado');
  renderView(APP.currentView);
  const notaStr = nota ? ` — "${nota}"` : '';
  const serveStr = suspenso.serve ? ` [serve:${suspenso.serve}]` : '';
  Auth.log('SUSPEND_GAME', 'resultados', `Jogo #${APP.editingId} suspenso${serveStr}${notaStr}`);
  toast(`Jogo #${APP.editingId} suspenso — retomará noutra data.`, 'success');
  APP.editingId = null;
};

function salvarResultado() {
  // WO (Walkover) handling — bypasses set entry
  const woChecked = document.getElementById('resWoCheck')?.checked;
  if (woChecked) {
    if (!APP._woSelection) return toast('Indique qual equipa deu o WO.', 'error');
    const resultado = { wo: APP._woSelection };
    if (APP.ffEditing) {
      const { catId, jogoId } = APP.ffEditing;
      const ff = ffLoad();
      const jIdx = ff[catId]?.jogos.findIndex(j => j.id === jogoId);
      if (jIdx >= 0) { ff[catId].jogos[jIdx].resultado = resultado; ffSave(ff); ffPropagate(catId); }
      closeModal('modalResultado');
      renderView(APP.currentView);
      Auth.log('SAVE_RESULT_FF', 'fasefinal', `WO: ${catId} jogo ${jogoId} \u2014 ${APP._woSelection}`);
      toast('WO registado.');
      APP.ffEditing = null; APP._woSelection = null; return;
    }
    const jogos = getData('jogos');
    const idx = jogos.findIndex(j => j.id === APP.editingId);
    if (idx < 0) return;
    const resEditFields = document.getElementById('resEditFields');
    if (resEditFields && resEditFields.style.display !== 'none') {
      const newData = document.getElementById('resData')?.value;
      const newHora = document.getElementById('resHora')?.value;
      const newCampo = document.getElementById('resCampo')?.value;
      if (newData) jogos[idx].data = newData;
      if (newHora) jogos[idx].hora = newHora;
      if (newCampo) jogos[idx].campo = newCampo;
    }
    jogos[idx].resultado = resultado;
    setData('jogos', jogos);
    closeModal('modalResultado');
    renderView(APP.currentView);
    Auth.log('SAVE_RESULT', 'resultados', `WO registado: jogo #${APP.editingId} \u2014 ${APP._woSelection}`);
    toast(`WO registado para o jogo #${APP.editingId}.`);
    const savedId = APP.editingId;
    APP.editingId = null; APP._woSelection = null;
    setTimeout(() => _ofereceNotificacao(savedId, false, null), 350);
    return;
  }

  const s1e1 = document.getElementById('resS1E1').value;
  const s1e2 = document.getElementById('resS1E2').value;

  // No sets filled → save schedule/team edits only (no result required)
  if (s1e1 === '' && s1e2 === '') {
    if (APP.ffEditing) { closeModal('modalResultado'); APP.ffEditing = null; return; }
    const jogos = getData('jogos');
    const idx = jogos.findIndex(j => j.id === APP.editingId);
    if (idx >= 0) {
      const newData  = document.getElementById('resData')?.value;
      const newHora  = document.getElementById('resHora')?.value;
      const newCampo = document.getElementById('resCampo')?.value;
      const eq1Id    = document.getElementById('resEq1Sel')?.value;
      const eq2Id    = document.getElementById('resEq2Sel')?.value;
      if (newData)  jogos[idx].data  = newData;
      if (newHora)  jogos[idx].hora  = newHora;
      if (newCampo) jogos[idx].campo = newCampo;
      if (eq1Id)    jogos[idx].eq1   = getDuplaLabel(eq1Id);
      if (eq2Id)    jogos[idx].eq2   = getDuplaLabel(eq2Id);
      setData('jogos', jogos);
      Auth.log('SAVE_SCHEDULE', 'jogos', `Horário/equipas actualizados: jogo #${APP.editingId}`);
      toast('Jogo actualizado.');
    }
    closeModal('modalResultado');
    renderView(APP.currentView);
    APP.editingId = null;
    return;
  }

  if (s1e1 === '' || s1e2 === '') return toast('Introduza pelo menos o resultado do 1.º set.', 'error');
  if (!getSetWinner(1)) return toast('Resultado do 1.º set inválido. Scores válidos: 6-0 a 6-4, 7-5, ou 6-6 + tie-break.', 'error');

  const set2Visible = document.getElementById('setBlock2').style.display !== 'none';
  const set3Visible = document.getElementById('setBlock3').style.display !== 'none';

  if (set2Visible) {
    const v2 = document.getElementById('resS2E1').value;
    if (v2 !== '' && !getSetWinner(2)) return toast('Resultado do 2.º set inválido.', 'error');
  }
  if (set3Visible) {
    const v3 = document.getElementById('resS3E1').value;
    if (v3 !== '' && !getSetWinner(3)) return toast('Resultado do 3.º set inválido.', 'error');
  }

  // Determine winners and check match has a winner
  const s1w = getSetWinner(1), s2w = getSetWinner(2), s3w = getSetWinner(3);
  const wins1 = [s1w, s2w, s3w].filter(w => w === 1).length;
  const wins2 = [s1w, s2w, s3w].filter(w => w === 2).length;
  if (wins1 < 2 && wins2 < 2) return toast('O jogo ainda não tem vencedor. Introduza os sets em falta.', 'error');

  // Build set data (convert 6-6+TB → 7-6 for storage)
  function buildSet(n) {
    const e1v = document.getElementById(`resS${n}E1`).value;
    const e2v = document.getElementById(`resS${n}E2`).value;
    if (e1v === '' || e2v === '') return null;
    const a = parseInt(e1v), b = parseInt(e2v);
    if (a === 6 && b === 6) {
      const ta = parseInt(document.getElementById(`resTB${n}E1`).value);
      const tb = parseInt(document.getElementById(`resTB${n}E2`).value);
      return { eq1: ta > tb ? 7 : 6, eq2: ta > tb ? 6 : 7, tbEq1: ta, tbEq2: tb };
    }
    return { eq1: a, eq2: b, tbEq1: null, tbEq2: null };
  }

  const set1 = buildSet(1);
  const set2 = set2Visible ? buildSet(2) : null;
  const set3 = set3Visible ? buildSet(3) : null;

  const resultado = {
    s1eq1: set1.eq1, s1eq2: set1.eq2, tb1eq1: set1.tbEq1, tb1eq2: set1.tbEq2,
    s2eq1: set2 ? set2.eq1 : null, s2eq2: set2 ? set2.eq2 : null, tb2eq1: set2 ? set2.tbEq1 : null, tb2eq2: set2 ? set2.tbEq2 : null,
    s3eq1: set3 ? set3.eq1 : null, s3eq2: set3 ? set3.eq2 : null, tb3eq1: set3 ? set3.tbEq1 : null, tb3eq2: set3 ? set3.tbEq2 : null,
  };

  // Fase Final game
  if (APP.ffEditing) {
    const { catId, jogoId } = APP.ffEditing;
    const ff = ffLoad();
    const jIdx = ff[catId]?.jogos.findIndex(j => j.id === jogoId);
    if (jIdx >= 0) { ff[catId].jogos[jIdx].resultado = resultado; ffSave(ff); ffPropagate(catId); }
    closeModal('modalResultado');
    renderView(APP.currentView);
    Auth.log('SAVE_RESULT_FF', 'fasefinal', `Resultado FF: ${catId} jogo ${jogoId}`);
    toast('Resultado guardado.');
    const savedFF = ff[catId]?.jogos[jIdx];
    if (savedFF) setTimeout(() => _ofereceNotificacao(jogoId, true, catId), 350);
    APP.ffEditing = null;
    return;
  }

  // Fase de grupos — also save schedule + team changes if edit fields are visible
  const jogos = getData('jogos');
  const idx = jogos.findIndex(j => j.id === APP.editingId);
  if (idx < 0) return;
  jogos[idx].suspenso  = null; // clear suspenso too when saving final result
  jogos[idx].adiado    = null; // clear adiado — game was played
  jogos[idx].resultado = resultado;
  // Save schedule + duplas edits (edit fields are shown for group games)
  const resEditFields = document.getElementById('resEditFields');
  if (resEditFields && resEditFields.style.display !== 'none') {
    const newData  = document.getElementById('resData')?.value;
    const newHora  = document.getElementById('resHora')?.value;
    const newCampo = document.getElementById('resCampo')?.value;
    const eq1Id    = document.getElementById('resEq1Sel')?.value;
    const eq2Id    = document.getElementById('resEq2Sel')?.value;
    if (newData)  jogos[idx].data  = newData;
    if (newHora)  jogos[idx].hora  = newHora;
    if (newCampo) jogos[idx].campo = newCampo;
    if (eq1Id)    jogos[idx].eq1   = getDuplaLabel(eq1Id);
    if (eq2Id)    jogos[idx].eq2   = getDuplaLabel(eq2Id);
  }
  setData('jogos', jogos);
  closeModal('modalResultado');
  renderView(APP.currentView);
  Auth.log('SAVE_RESULT', 'resultados', `Resultado guardado: jogo #${APP.editingId}`);
  toast(`Resultado guardado para o jogo #${APP.editingId}.`);
  const savedId = APP.editingId;
  setTimeout(() => _ofereceNotificacao(savedId, false, null), 350);
  APP.editingId = null;
}

// ── Oferecer notificação de resultado após guardar ─────────────────
window._ofereceNotificacao = function(jogoId, isFF, catId) {
  const el = document.getElementById('notifResJogoId');
  const el2 = document.getElementById('notifResJogoIdFF');
  const elCat = document.getElementById('notifResCatId');
  if (el)  el.value  = jogoId;
  if (el2) el2.value = isFF ? 'true' : 'false';
  if (elCat) elCat.value = catId || '';
  openModal('modalNotifResultado');
};

window._notifResPartilhar = function() {
  const jogoId = document.getElementById('notifResJogoId')?.value;
  const isFF   = document.getElementById('notifResJogoIdFF')?.value === 'true';
  const catId  = document.getElementById('notifResCatId')?.value || '';
  closeModal('modalNotifResultado');
  if (jogoId) abrirPanfletoFoto(jogoId, isFF, catId);
};

function limparResultado() {
  if (!Auth.isAdmin()) return toast('Apenas administradores podem executar esta acção.', 'error');
  if (!APP.editingId) return;
  if (!confirm('Limpar o resultado deste jogo?')) return;
  const jogos = getData('jogos');
  const idx = jogos.findIndex(j => j.id === APP.editingId);
  if (idx >= 0) { jogos[idx].resultado = null; jogos[idx].suspenso = null; setData('jogos', jogos); }
  closeModal('modalResultado');
  renderView(APP.currentView);
  Auth.log('CLEAR_RESULT', 'resultados', `Resultado removido: jogo #${APP.editingId}`);
  toast('Resultado removido.');
  APP.editingId = null;
}

// ============================================
//  UTILITÁRIOS
// ============================================
// formatDate delegado para ppFormatDate em data.js

function populateCampoSelects() {
  const campos = getData('campos');
  const opts = `<option value="todos">Todos os campos</option>` +
    campos.map(c => `<option value="${c.nome}">${c.nome}</option>`).join('');
  document.querySelectorAll('.filter-campo').forEach(s => { s.innerHTML = opts; });
}

function populateGrupoSelects() {
  const grupos = [...new Set(getAllJogosNormalized().map(j => j.grupo))].sort();
  const opts = `<option value="todos">Todos os grupos</option>` +
    grupos.map(g => `<option value="${g}">${g}</option>`).join('');
  document.querySelectorAll('.filter-grupo').forEach(s => { s.innerHTML = opts; });
}

function populateDataSelects() {
  const datas = [...new Set(getAllJogosNormalized().map(j => j.data).filter(Boolean))].sort();
  const opts = `<option value="todos">Todas as datas</option>` +
    datas.map(d => `<option value="${d}">${formatDateFull(d)}</option>`).join('');
  document.querySelectorAll('.filter-data').forEach(s => { s.innerHTML = opts; });
}

function formatDateFull(d) {
  if (!d) return '';
  const dt = new Date(d + 'T12:00:00');
  return dt.toLocaleDateString('pt-PT', { weekday:'short', day:'numeric', month:'short' });
}

function populateJogoModal() {
  const campos = getData('campos');
  document.getElementById('jogoCampo').innerHTML =
    campos.map(c => `<option value="${c.nome}">${c.nome}</option>`).join('');
  const grupos = getData('grupos');
  const grupoSel = document.getElementById('jogoGrupo');
  grupoSel.innerHTML = grupos.map(g => `<option value="${g.id}">${g.id}</option>`).join('');
  _populateJogoEqSelects(grupoSel.value);
  grupoSel.onchange = () => _populateJogoEqSelects(grupoSel.value);
}

function _populateJogoEqSelects(grupoId) {
  const duplas = getDuplasByGrupo(grupoId);
  const jogs   = getData('jogadores') || [];
  const opts = '<option value="">— Seleccionar dupla —</option>' + duplas.map(d => {
    const j1 = jogs.find(j => j.id === d.j1);
    const j2 = jogs.find(j => j.id === d.j2);
    return `<option value="${d.id}">${escHtml((j1?.nome||'?') + ' & ' + (j2?.nome||'?'))}</option>`;
  }).join('');
  document.getElementById('jogoEq1').innerHTML = opts;
  document.getElementById('jogoEq2').innerHTML = opts;
}

window.toggleAdiadoFields = function() {
  const checked = document.getElementById('jogoAdiadoToggle').checked;
  const fields  = document.getElementById('jogoAdiadoFields');
  if (fields) fields.style.display = checked ? 'flex' : 'none';
};

function _resetAdiadoModal() {
  const tog = document.getElementById('jogoAdiadoToggle');
  if (tog) tog.checked = false;
  const fields = document.getElementById('jogoAdiadoFields');
  if (fields) fields.style.display = 'none';
  const m = document.getElementById('jogoAdiadoMotivo');
  if (m) m.value = '';
  const d = document.getElementById('jogoAdiadoData');
  if (d) d.value = '';
  const h = document.getElementById('jogoAdiadoHora');
  if (h) h.value = '';
}

function abrirNovoJogo() {
  APP.editingId = null;
  document.getElementById('modalJogoTitle').textContent = 'Novo Jogo';
  document.getElementById('jogoData').value = '';
  document.getElementById('jogoHora').value = '';
  _resetAdiadoModal();
  populateJogoModal();
  openModal('modalJogo');
}

window.editarJogo = function(id) {
  const j = getData('jogos').find(x => x.id === id);
  if (!j) return;
  APP.editingId = id;
  document.getElementById('modalJogoTitle').textContent = 'Editar Jogo';
  populateJogoModal();
  document.getElementById('jogoData').value  = j.data  || '';
  document.getElementById('jogoHora').value  = j.hora  || '';
  document.getElementById('jogoCampo').value = j.campo || '';
  document.getElementById('jogoGrupo').value = j.grupo || '';
  _populateJogoEqSelects(j.grupo || '');
  // Resolve eq1/eq2 strings to dupla IDs for the selects
  document.getElementById('jogoEq1').value = _eqStrToDuplaId(j.eq1 || '', j.grupo || '');
  document.getElementById('jogoEq2').value = _eqStrToDuplaId(j.eq2 || '', j.grupo || '');
  // Load adiado state
  _resetAdiadoModal();
  if (j.adiado) {
    const tog = document.getElementById('jogoAdiadoToggle');
    if (tog) tog.checked = true;
    const fields = document.getElementById('jogoAdiadoFields');
    if (fields) fields.style.display = 'flex';
    const m = document.getElementById('jogoAdiadoMotivo');
    if (m) m.value = j.adiado.motivo || '';
  }
  openModal('modalJogo');
};

function salvarJogo() {
  const data       = document.getElementById('jogoData').value;
  const hora       = document.getElementById('jogoHora').value;
  const campo      = document.getElementById('jogoCampo').value;
  const grupo      = document.getElementById('jogoGrupo').value;
  const duplaId1   = document.getElementById('jogoEq1').value;
  const duplaId2   = document.getElementById('jogoEq2').value;

  if (!data || !hora || !campo || !grupo || !duplaId1 || !duplaId2)
    return toast('Preencha todos os campos do jogo.', 'error');
  if (duplaId1 === duplaId2)
    return toast('As duas duplas devem ser diferentes.', 'error');

  // Adiado state
  const adiadoToggle = document.getElementById('jogoAdiadoToggle')?.checked;
  const adiadoMotivo = (document.getElementById('jogoAdiadoMotivo')?.value || '').trim();
  const adiadoNovaData = document.getElementById('jogoAdiadoData')?.value;
  const adiadoNovaHora = document.getElementById('jogoAdiadoHora')?.value;

  let finalData = data;
  let finalHora = hora;
  let adiadoVal = null;

  if (adiadoToggle) {
    if (adiadoNovaData && adiadoNovaHora) {
      // Reagendado: update date/time and clear adiado flag
      finalData = adiadoNovaData;
      finalHora = adiadoNovaHora;
      adiadoVal = null; // back to normal at new date
    } else {
      adiadoVal = { motivo: adiadoMotivo, ts: Date.now() };
    }
  }

  const eq1 = getDuplaLabel(duplaId1);
  const eq2 = getDuplaLabel(duplaId2);

  const jogos = getData('jogos');
  if (APP.editingId !== null) {
    const idx = jogos.findIndex(j => j.id === APP.editingId);
    if (idx !== -1) jogos[idx] = { ...jogos[idx], data: finalData, hora: finalHora, campo, grupo, eq1, eq2, adiado: adiadoVal };
    APP.editingId = null;
    setData('jogos', jogos);
    closeModal('modalJogo');
    renderView(APP.currentView);
    populateDataSelects();
    toast(adiadoVal ? 'Jogo marcado como adiado.' : adiadoToggle ? `Jogo reagendado para ${finalData} \u00e0s ${finalHora}.` : 'Jogo actualizado.');
  } else {
    const newId = Math.max(0, ...jogos.map(j => j.id)) + 1;
    jogos.push({ id: newId, data: finalData, hora: finalHora, campo, grupo, eq1, eq2, resultado: null, adiado: adiadoVal });
    setData('jogos', jogos);
    closeModal('modalJogo');
    renderView(APP.currentView);
    populateDataSelects();
    toast(`Jogo #${newId} adicionado.`);
  }
}

// ============================================
//  INIT
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  // On a fresh browser (empty localStorage) ppDataReady bootstraps data from GitHub.
  // Await it so initAdmin always starts with the most up-to-date data.
  await (window.ppDataReady || Promise.resolve(false));

  // Show local reset hint only when running via file:// protocol
  if (window.location.protocol === 'file:') {
    const hint = document.getElementById('localResetHint');
    if (hint) hint.style.display = 'block';
  }

  // Login
  const loginForm = document.getElementById('loginForm');
  Auth.ensureDefaults();

  if (loginForm) {
    loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      const u = document.getElementById('loginUser').value.trim();
      const p = document.getElementById('loginPass').value;
      // On file:// protocol the auto-sync is skipped; fetch users from GitHub Pages directly
      if (window.location.protocol === 'file:') {
        try {
          const cfg = GHSync.getCfg();
          if (cfg.owner && cfg.repo) {
            const r = await fetch(
              `https://${cfg.owner}.github.io/${cfg.repo}/data.json?_=${Date.now()}`
            );
            if (r.ok) {
              const d = await r.json();
              if (d.users && d.users.length) ppSave('users', d.users);
            }
          }
        } catch (_) { /* ignore — will fall back to local localStorage */ }
      }
      // Wait for remote data.json fetch to complete so synced users are available
      if (window.ppDataReady) await window.ppDataReady;
      const result = doLogin(u, p);
      if (result.ok) {
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('adminShell').classList.add('visible');
        initAdmin();
      } else {
        const errEl = document.getElementById('loginError');
        errEl.style.display = 'flex';
        errEl.innerHTML = `<i class="ph ph-warning-circle"></i> ${result.error}`;
      }
    });
  }

  if (isLoggedIn()) {
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('adminShell').classList.add('visible');
    initAdmin();
  }
});

function initAdmin() {
  // Populate entity stores if they're empty (e.g. first load on file:// protocol)
  _bootstrapEntityStores();

  // Sidebar nav links
  document.querySelectorAll('.sidebar-link[data-view]').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.view));
  });

  // Sidebar toggle (mobile)
  document.getElementById('sidebarToggle')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // Sidebar user info
  setupRoleUI();

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', doLogout);

  // Modais — fechar ao clicar no overlay
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });

  // Fechar com ESC
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  });

  // Populate selects
  populateCampoSelects();
  populateDataSelects();
  populateGrupoSelects();

  // Header search
  document.getElementById('headerSearch')?.addEventListener('input', e => {
    if (APP.currentView === 'jogadores') renderJogadores(e.target.value);
  });

  // Jogadores search (inside page)
  document.getElementById('jogadoresSearch')?.addEventListener('input', e => renderJogadores(e.target.value));

  // Jogos filters
  document.getElementById('filtroDataJogos')?.addEventListener('change', e => {
    const d = e.target.value;
    const c = document.getElementById('filtroCampoJogos')?.value || 'todos';
    const g = document.getElementById('filtroGrupoJogos')?.value || 'todos';
    const r = document.getElementById('filtroResultadoJogos')?.value || 'todos';
    renderJogos(d, c, g, r);
  });
  document.getElementById('filtroCampoJogos')?.addEventListener('change', e => {
    const d = document.getElementById('filtroDataJogos')?.value || 'todos';
    const g = document.getElementById('filtroGrupoJogos')?.value || 'todos';
    const r = document.getElementById('filtroResultadoJogos')?.value || 'todos';
    renderJogos(d, e.target.value, g, r);
  });
  document.getElementById('filtroGrupoJogos')?.addEventListener('change', e => {
    const d = document.getElementById('filtroDataJogos')?.value || 'todos';
    const c = document.getElementById('filtroCampoJogos')?.value || 'todos';
    const r = document.getElementById('filtroResultadoJogos')?.value || 'todos';
    renderJogos(d, c, e.target.value, r);
  });
  document.getElementById('filtroResultadoJogos')?.addEventListener('change', e => {
    const d = document.getElementById('filtroDataJogos')?.value || 'todos';
    const c = document.getElementById('filtroCampoJogos')?.value || 'todos';
    const g = document.getElementById('filtroGrupoJogos')?.value || 'todos';
    renderJogos(d, c, g, e.target.value);
  });

  // Resultados filter
  document.getElementById('filtroDataRes')?.addEventListener('change', e => renderResultados(e.target.value));

  // Horário filters
  document.getElementById('horarioDataFilter')?.addEventListener('change', () => renderHorario());
  document.getElementById('horarioCampoFilter')?.addEventListener('change', () => renderHorario());

  // Relatório de Jogos filters
  document.getElementById('rjFiltroData')?.addEventListener('change',   () => renderRelatorioJogos());
  document.getElementById('rjFiltroGrupo')?.addEventListener('change',  () => renderRelatorioJogos());
  document.getElementById('rjFiltroEstado')?.addEventListener('change', () => renderRelatorioJogos());

  // Construtor de Grupos / Jogos filters
  document.getElementById('cgFiltroCategoria')?.addEventListener('change', () => renderConstrutorGrupos());
  document.getElementById('cjFiltroCategoria')?.addEventListener('change', () => renderConstrutorJogos());

  // Panfleto com Foto — file input
  document.getElementById('fotoFlyerInput')?.addEventListener('change', function() {
    const file = this.files[0];
    if (!file) return;
    // Reset zoom/pan for new image
    const zEl = document.getElementById('fotoFlyerZoom');
    if (zEl) { zEl.value = 100; const lbl = document.getElementById('fotoFlyerZoomLbl'); if (lbl) lbl.textContent = '100%'; }
    const pxEl = document.getElementById('fotoFlyerPanX'); if (pxEl) pxEl.value = 0;
    const pyEl = document.getElementById('fotoFlyerPanY'); if (pyEl) pyEl.value = 0;
    const img = new Image();
    img.onload = () => _buildFotoFlyer(img);
    img.src = URL.createObjectURL(file);
  });

  // Session timeout watch
  Auth.startTimeoutWatch(
    (minsLeft) => {
      document.getElementById('timeoutCountdown').textContent = minsLeft + ' min';
      openModal('modalTimeout');
    },
    () => {
      closeModal('modalTimeout');
      doLogout();
    }
  );

  // Alert banner — show if > 20 pending results
  updateAlertBanner();

  // User role modal — show/hide categories on role change
  document.getElementById('userRole')?.addEventListener('change', updateUserCategoriesVisibility);

  // Hide admin-only buttons for non-admin users
  if (!Auth.isAdmin()) {
    document.getElementById('btnGerarAleatorios')?.remove();
    document.getElementById('btnLimparResultado')?.remove();
    document.getElementById('btnLimparTodosResultados')?.remove();
    document.getElementById('btnSidebarConstrutorGrupos')?.remove();
    document.getElementById('btnSidebarConstrutorJogos')?.remove();
    document.getElementById('btnDashVerLogs')?.remove();
    document.getElementById('dangerToggleBtn')?.remove();
  }

  // Restore danger-mode state
  if (localStorage.getItem('ppDangerMode') === '1') {
    document.body.classList.add('danger-unlocked');
    const icon = document.getElementById('dangerToggleIcon');
    const lbl  = document.getElementById('dangerToggleLabel');
    if (icon) icon.className = 'ph ph-lock-open';
    if (lbl)  lbl.textContent = 'Modo Avançado: ON';
  }

  // Ir para view inicial — restaurar da hash se disponível
  const _hashView = location.hash.slice(1);
  navigate(_hashView && document.getElementById('view-' + _hashView) ? _hashView : 'dashboard');
}

// ============================================
//  FASE FINAL — Bracket Logic
// ============================================

const FF_WILDCARD = ['M1', 'F1', 'M2', 'F2']; // 3 groups, needs 2 best 3rds
const FF_4G       = ['M3', 'M4'];               // 4 groups, top 2 each = 8
const FF_2G       = ['M5'];                     // 2 groups, top 2 each = 4 (no QF)

function ffLoad()       { return ppLoad('fasefinal') || {}; }
function ffSave(data)   { ppSave('fasefinal', data); }

function ffStandings(gJogos) {
  const pairs = new Set();
  gJogos.forEach(j => { pairs.add(j.eq1); pairs.add(j.eq2); });
  const st = {};
  pairs.forEach(p => { st[p] = { par: p, j: 0, v: 0, d: 0, sv: 0, sd: 0, gv: 0, gd: 0 }; });
  gJogos.forEach(j => {
    if (!j.resultado) return;
    const r = j.resultado;
    let s1 = 0, s2 = 0, gv1 = 0, gv2 = 0;
    [[r.s1eq1, r.s1eq2], [r.s2eq1, r.s2eq2], [r.s3eq1, r.s3eq2]].forEach(([a, b]) => {
      if (a == null || b == null) return;
      gv1 += a; gv2 += b;
      if (a > b) s1++; else s2++;
    });
    if (st[j.eq1]) { st[j.eq1].j++; st[j.eq1].sv += s1; st[j.eq1].sd += s2; st[j.eq1].gv += gv1; st[j.eq1].gd += gv2; if (s1 > s2) st[j.eq1].v++; else st[j.eq1].d++; }
    if (st[j.eq2]) { st[j.eq2].j++; st[j.eq2].sv += s2; st[j.eq2].sd += s1; st[j.eq2].gv += gv2; st[j.eq2].gd += gv1; if (s2 > s1) st[j.eq2].v++; else st[j.eq2].d++; }
  });
  return st;
}

function ffH2H(parA, parB, gJogos) {
  const m = gJogos.find(j => (j.eq1 === parA && j.eq2 === parB) || (j.eq1 === parB && j.eq2 === parA));
  if (!m || !m.resultado) return 0;
  const r = m.resultado; let s1 = 0, s2 = 0;
  [[r.s1eq1, r.s1eq2], [r.s2eq1, r.s2eq2], [r.s3eq1, r.s3eq2]].forEach(([a, b]) => { if (a != null && b != null) { if (a > b) s1++; else s2++; } });
  const aIsEq1 = m.eq1 === parA;
  return aIsEq1 ? (s1 > s2 ? -1 : s2 > s1 ? 1 : 0) : (s2 > s1 ? -1 : s1 > s2 ? 1 : 0);
}

function ffSortRows(rows) {
  return [...rows].sort((a, b) => {
    if (b.v !== a.v) return b.v - a.v;
    const ds = (b.sv - b.sd) - (a.sv - a.sd); if (ds !== 0) return ds;
    const dg = (b.gv - b.gd) - (a.gv - a.gd); if (dg !== 0) return dg;
    return b.gv - a.gv;
  });
}

function ffSortByPerf(a, b) {
  if (b.v !== a.v) return b.v - a.v;
  const ds = (b.sv - b.sd) - (a.sv - a.sd); if (ds !== 0) return ds;
  const dg = (b.gv - b.gd) - (a.gv - a.gd); if (dg !== 0) return dg;
  return b.gv - a.gv;
}

function ffGetQualified(catId) {
  const allJogos = getData('jogos');
  const grupos   = getData('grupos').filter(g => g.cat === catId);
  const firsts = [], seconds = [], thirds = [];
  grupos.forEach(g => {
    const gJogos = allJogos.filter(j => j.grupo === g.id);
    const sorted = ffSortRows(Object.values(ffStandings(gJogos)));
    sorted.forEach((r, i) => {
      const e = { ...r, grupo: g.id, pos: i + 1 };
      if (i === 0) firsts.push(e);
      else if (i === 1) seconds.push(e);
      else if (i === 2) thirds.push(e);
    });
  });
  firsts.sort(ffSortByPerf); seconds.sort(ffSortByPerf); thirds.sort(ffSortByPerf);
  const q = [
    ...firsts.map((t, i)  => ({ ...t, tier: 1, seed: i + 1 })),
    ...seconds.map((t, i) => ({ ...t, tier: 2, seed: firsts.length + i + 1 })),
  ];
  if (FF_WILDCARD.includes(catId)) {
    thirds.slice(0, 2).forEach((t, i) => q.push({ ...t, tier: 3, seed: firsts.length + seconds.length + i + 1 }));
  }
  return q;
}

const FF_QF_DATE = '2026-06-11'; // Quinta-feira — Quartos de Final
const FF_SF_DATE = '2026-06-13'; // Sábado — Meias-Finais
const FF_F_DATE  = '2026-06-14'; // Domingo — Finais
const FF_QF_SLOTS = ['17:00', '18:00', '19:00', '20:00', '21:00'];
const FF_SF_SLOTS = ['15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];
const FF_F_SLOT   = '15:00';

function ffMakeJogo(catId, fase, num, e1, e2, feedFrom = null, data = null, hora = null) {
  return {
    id: `${catId}-${fase === 'F' ? 'F' : fase + num}`,
    fase, num, feedFrom,
    eq1: e1?.par ?? null, eq1grupo: e1?.grupo ?? null, eq1seed: e1?.seed ?? null,
    eq2: e2?.par ?? null, eq2grupo: e2?.grupo ?? null, eq2seed: e2?.seed ?? null,
    resultado: null,
    data, hora,
  };
}

function ffGenerateBracket(catId) {
  const q = ffGetQualified(catId);
  const jogos = [];

  if (FF_2G.includes(catId)) {
    const bg = {};
    q.forEach(t => { (bg[t.grupo] = bg[t.grupo] || []).push(t); });
    const [gA, gB] = Object.keys(bg).sort();
    jogos.push(ffMakeJogo(catId, 'SF', 1, bg[gA][0], bg[gB][1], null, FF_SF_DATE, FF_SF_SLOTS[0]));
    jogos.push(ffMakeJogo(catId, 'SF', 2, bg[gB][0], bg[gA][1], null, FF_SF_DATE, FF_SF_SLOTS[1]));
    jogos.push(ffMakeJogo(catId, 'F',  1, null, null, [`${catId}-SF1`, `${catId}-SF2`], FF_F_DATE, FF_F_SLOT));

  } else if (FF_4G.includes(catId)) {
    // Seeding por performance: S1vS8, S2vS7, S3vS6, S4vS5 — evitar duplas do mesmo grupo
    let pairs4 = [[q[0],q[7]], [q[1],q[6]], [q[2],q[5]], [q[3],q[4]]];
    for (let i = 0; i < pairs4.length; i++) {
      if (pairs4[i][0]?.grupo && pairs4[i][0].grupo === pairs4[i][1]?.grupo) {
        for (let j = i + 1; j < pairs4.length; j++) {
          if (pairs4[i][0]?.grupo !== pairs4[j][1]?.grupo && pairs4[j][0]?.grupo !== pairs4[i][1]?.grupo) {
            [pairs4[i][1], pairs4[j][1]] = [pairs4[j][1], pairs4[i][1]];
            break;
          }
        }
      }
    }
    jogos.push(ffMakeJogo(catId, 'QF', 1, pairs4[0][0], pairs4[0][1], null, FF_QF_DATE, FF_QF_SLOTS[0]));
    jogos.push(ffMakeJogo(catId, 'QF', 2, pairs4[1][0], pairs4[1][1], null, FF_QF_DATE, FF_QF_SLOTS[1]));
    jogos.push(ffMakeJogo(catId, 'QF', 3, pairs4[2][0], pairs4[2][1], null, FF_QF_DATE, FF_QF_SLOTS[2]));
    jogos.push(ffMakeJogo(catId, 'QF', 4, pairs4[3][0], pairs4[3][1], null, FF_QF_DATE, FF_QF_SLOTS[3]));
    jogos.push(ffMakeJogo(catId, 'SF', 1, null, null, [`${catId}-QF1`, `${catId}-QF2`], FF_SF_DATE, FF_SF_SLOTS[0]));
    jogos.push(ffMakeJogo(catId, 'SF', 2, null, null, [`${catId}-QF3`, `${catId}-QF4`], FF_SF_DATE, FF_SF_SLOTS[1]));
    jogos.push(ffMakeJogo(catId, 'F',  1, null, null, [`${catId}-SF1`, `${catId}-SF2`], FF_F_DATE, FF_F_SLOT));

  } else {
    // QF seeding: S1vS8, S2vS7, S3vS6, S4vS5 — evitar duplas do mesmo grupo
    const s = q; // already in seed order
    let pairs = [[s[0],s[7]], [s[1],s[6]], [s[2],s[5]], [s[3],s[4]]];
    // Fix: wildcards em QF1/QF2 — trocar S7 e S8 se colisão
    if (pairs[0][0]?.grupo === pairs[0][1]?.grupo || pairs[1][0]?.grupo === pairs[1][1]?.grupo)
      { [pairs[0][1], pairs[1][1]] = [pairs[1][1], pairs[0][1]]; }
    // Fix: segundos em QF3/QF4 — trocar S5 e S6 se colisão
    if (pairs[2][0]?.grupo === pairs[2][1]?.grupo)
      { [pairs[2][1], pairs[3][1]] = [pairs[3][1], pairs[2][1]]; }
    pairs.forEach(([e1, e2], i) => jogos.push(ffMakeJogo(catId, 'QF', i + 1, e1, e2, null, FF_QF_DATE, FF_QF_SLOTS[i])));
    jogos.push(ffMakeJogo(catId, 'SF', 1, null, null, [`${catId}-QF1`, `${catId}-QF2`], FF_SF_DATE, FF_SF_SLOTS[0]));
    jogos.push(ffMakeJogo(catId, 'SF', 2, null, null, [`${catId}-QF3`, `${catId}-QF4`], FF_SF_DATE, FF_SF_SLOTS[1]));
    jogos.push(ffMakeJogo(catId, 'F',  1, null, null, [`${catId}-SF1`, `${catId}-SF2`], FF_F_DATE, FF_F_SLOT));
  }
  return { generated: true, jogos };
}

function ffGetWinner(r) {
  if (!r) return 0;
  let s1 = 0, s2 = 0;
  [[r.s1eq1,r.s1eq2],[r.s2eq1,r.s2eq2],[r.s3eq1,r.s3eq2]].forEach(([a,b]) => { if (a!=null&&b!=null) { if(a>b) s1++; else s2++; } });
  return s1 > s2 ? 1 : s2 > s1 ? 2 : 0;
}

function ffPropagate(catId) {
  const ff = ffLoad();
  if (!ff[catId]) return;
  ff[catId].jogos.forEach(jogo => {
    if (!jogo.feedFrom || jogo.feedFrom.length < 2) return;
    const [j1, j2] = jogo.feedFrom.map(id => ff[catId].jogos.find(j => j.id === id));
    const w1 = ffGetWinner(j1?.resultado), w2 = ffGetWinner(j2?.resultado);
    jogo.eq1      = j1 ? (w1 === 1 ? j1.eq1 : w1 === 2 ? j1.eq2 : null) : null;
    jogo.eq1grupo = j1 ? (w1 === 1 ? j1.eq1grupo : w1 === 2 ? j1.eq2grupo : null) : null;
    jogo.eq2      = j2 ? (w2 === 1 ? j2.eq1 : w2 === 2 ? j2.eq2 : null) : null;
    jogo.eq2grupo = j2 ? (w2 === 1 ? j2.eq1grupo : w2 === 2 ? j2.eq2grupo : null) : null;
  });
  ffSave(ff);
}

function allGroupGamesDone(catId) {
  const jogos  = getData('jogos');
  const grupos = getData('grupos').filter(g => g.cat === catId);
  const catJogos = jogos.filter(j => grupos.some(g => g.id === j.grupo));
  return catJogos.length > 0 && catJogos.every(j => !!j.resultado);
}

// ---- Admin View ----
let ffCurrentCat = 'M1';

function ffChampionColHtml(catId) {
  const catData = ffLoad()[catId];
  if (!catData?.generated) return '';
  const final = catData.jogos.find(j => j.fase === 'F');
  if (!final || !final.resultado) return '';
  const w = ffGetWinner(final.resultado);
  const name  = w === 1 ? final.eq1      : final.eq2;
  const grupo = w === 1 ? final.eq1grupo : final.eq2grupo;
  if (!name) return '';
  const nameFmt = name.split(' & ').map(n => escHtml(n)).join('<br>');
  return `<div class="bk-round bk-round-champion bk-round-final-connector">
    <div class="bk-rhead champion-rhead">Campeão · ${escHtml(catId)}</div>
    <div class="champion-col-body">
      <div class="champion-col-trophy">🏆</div>
      <div class="champion-col-name">${nameFmt}</div>
      ${grupo ? `<div class="champion-col-grup">${escHtml(grupo)}</div>` : ''}
    </div>
  </div>`;
}

function renderFaseFinal() {
  const ff   = ffLoad();
  const cats = ['M1', 'M2', 'F1', 'F2', 'M3', 'M4', 'M5'];
  document.getElementById('ffCatTabs').innerHTML = [
    ...cats.map(c =>
      `<button class="btn btn-sm ${c === ffCurrentCat ? 'btn-primary' : 'btn-ghost'}" onclick="ffSetCat('${c}')" style="min-width:3rem">${c}</button>`
    ),
    `<button class="btn btn-sm ${ffCurrentCat === 'ALL' ? 'btn-primary' : 'btn-ghost'}" onclick="ffSetCat('ALL')" style="gap:.3rem"><i class="ph ph-squares-four"></i> Todos</button>`
  ].join('');

  if (ffCurrentCat === 'ALL') { ffRenderGlobal(); return; }

  const container = document.getElementById('ffBracket');
  const catData   = ff[ffCurrentCat];

  if (!catData?.generated) {
    const done = allGroupGamesDone(ffCurrentCat);
    container.innerHTML = `
      <div class="ff-empty">
        <i class="ph ph-trophy" style="font-size:3rem;color:var(--cinza-texto)"></i>
        <p style="color:var(--cinza-texto);margin:.5rem 0 1rem">
          Fase de grupos <strong>${done ? 'concluída' : 'ainda em curso'}</strong>
        </p>
        <button class="btn btn-primary" onclick="ffGenerate('${ffCurrentCat}')" ${!done ? 'disabled' : ''}>
          <i class="ph ph-magic-wand"></i>&nbsp; Gerar Bracket · ${ffCurrentCat}
        </button>
        ${!done ? `<p style="font-size:.72rem;color:var(--amarelo);margin-top:.6rem"><i class="ph ph-warning"></i> Aguarda conclusão de todos os jogos de grupo</p>` : ''}
      </div>`;
    return;
  }

  const { jogos } = catData;
  const allPhases = ['QF', 'SF', 'F'];
  const phases = allPhases.filter(p => jogos.some(j => j.fase === p));
  const phaseLabel = { QF: 'Quartos de Final', SF: 'Meias-Finais', F: 'Final' };

  const bracketCols = phases.map((fase, colIdx) => {
    const games = [...jogos.filter(j => j.fase === fase)].sort((a, b) => a.num - b.num);
    const isLast = colIdx === phases.length - 1;
    return games.map((g, i) => {
      const isTop = !isLast && i % 2 === 0;
      const isBot = !isLast && i % 2 === 1;
      const cls = ['bk-slot', isTop ? 'bk-slot-top' : isBot ? 'bk-slot-bot' : ''].filter(Boolean).join(' ');
      return `<div class="${cls}">${ffCardHtml(g, ffCurrentCat)}</div>`;
    }).join('');
  });

  container.innerHTML = `
    <div class="bk-bracket">
      ${phases.map((fase, i) => `
        <div class="bk-round">
          <div class="bk-rhead">${phaseLabel[fase]}</div>
          ${bracketCols[i]}
        </div>`).join('')}
      ${ffChampionColHtml(ffCurrentCat)}
    </div>
    ${Auth.isAdmin() ? `<div style="margin-top:1.25rem;display:flex;gap:.5rem;flex-wrap:wrap">
      <button class="btn btn-ghost btn-sm danger-btn" style="color:var(--amarelo);border-color:rgba(245,197,24,.3)" onclick="ffGerarAleatorios('${ffCurrentCat}')">
        <i class="ph ph-shuffle"></i> Resultados Aleatórios
      </button>
      <button class="btn btn-ghost btn-sm danger-btn" style="color:var(--amarelo);border-color:rgba(245,197,24,.3)" onclick="ffGerarAleatoriosTodos()">
        <i class="ph ph-shuffle"></i> Aleatórios — Todos
      </button>
      <button class="btn btn-ghost btn-sm danger-btn" style="color:var(--cinza-texto)" onclick="ffLimparResultados('${ffCurrentCat}')">
        <i class="ph ph-eraser"></i> Limpar Resultados
      </button>
      <button class="btn btn-ghost btn-sm danger-btn" style="color:var(--vermelho);border-color:rgba(255,74,74,.3)" onclick="ffReset('${ffCurrentCat}')">
        <i class="ph ph-arrow-counter-clockwise"></i> Resetar Bracket
      </button>
    </div>` : ''}` ;
}

function ffCardHtml(j, catId) {
  const w    = ffGetWinner(j.resultado);
  const done = !!j.resultado;
  const fLabel = j.fase === 'F' ? 'Final' : j.fase === 'SF' ? `Meia-Final ${j.num}` : `QF ${j.num}`;

  const teamHtml = (name, grupo, seed, isWin) => {
    if (!name) return `<div class="bk-card-team tbd"><span class="bk-cname">A definir…</span></div>`;
    return `<div class="bk-card-team${isWin ? ' win' : ''}">
      ${seed ? `<span class="bk-cseed">${seed}</span>` : ''}
      <span class="bk-cname">${name}</span>
      ${grupo ? `<span class="bk-cgrp">${grupo}</span>` : ''}
    </div>`;
  };

  let scoreHtml = '';
  if (done) {
    const r = j.resultado;
    const sets = [[r.s1eq1,r.s1eq2],[r.s2eq1,r.s2eq2],[r.s3eq1,r.s3eq2]]
      .filter(([a]) => a != null).map(([a,b]) => `${a}-${b}`).join(' / ');
    scoreHtml = `<div class="bk-card-score">${sets}</div>`;
  }

  const canEdit = !!(j.eq1 && j.eq2);
  const schedHtml = (j.data || j.hora)
    ? `<div style="display:flex;align-items:center;justify-content:space-between;gap:.25rem;margin-bottom:.25rem">
        <span style="font-size:.65rem;color:var(--cinza-texto)">${j.data ? formatDate(j.data) : ''} ${j.hora ? '· ' + j.hora : ''}</span>
        <button style="background:none;border:none;color:var(--cinza-texto);cursor:pointer;font-size:.7rem;padding:0" title="Editar horário" onclick="ffEditSchedule('${j.id}','${catId}')">
          <i class="ph ph-pencil-simple"></i>
        </button>
      </div>`
    : '';

  // WA notify buttons — one per player who has a phone registered
  const ffWaLinks = [j.eq1, j.eq2].filter(Boolean).flatMap(team =>
    team.split('&').map(n => n.trim()).map(n => {
      const tel = getTelefone(n);
      if (!tel) return '';
      const clean = tel.replace(/\D/g, '');
      const msg = encodeURIComponent(waMsgFFJogo(j, catId));
      return `<a style="color:#25D366;font-size:.68rem;display:inline-flex;align-items:center;gap:.12rem;text-decoration:none" href="https://wa.me/${clean}?text=${msg}" target="_blank" title="Notificar ${n}"><i class="ph ph-whatsapp-logo"></i>${n.split(' ')[0]}</a>`;
    })
  ).filter(Boolean);
  const ffWaHtml = ffWaLinks.length
    ? `<div style="display:flex;flex-wrap:wrap;gap:.2rem;margin-top:.3rem;padding-top:.25rem;border-top:1px solid var(--preto-borda)">${ffWaLinks.join('')}</div>`
    : '';

  return `
    <div class="bk-card${done ? ' done' : ''}${j.fase === 'F' ? ' is-final' : ''}">
      <div class="bk-card-lbl">${fLabel}</div>
      ${schedHtml}
      ${teamHtml(j.eq1, j.eq1grupo, j.eq1seed, done && w === 1)}
      <div class="bk-card-vs">VS</div>
      ${teamHtml(j.eq2, j.eq2grupo, j.eq2seed, done && w === 2)}
      ${scoreHtml}
      ${canEdit ? `<button class="btn btn-sm ${done ? 'btn-ghost' : 'btn-primary'}" style="width:100%;margin-top:.3rem;font-size:.72rem;padding:.28rem" onclick="ffAbrirResultado('${j.id}','${catId}')">
        <i class="ph ph-${done ? 'pencil-simple' : 'plus'}"></i> ${done ? 'Editar' : 'Lançar'}
      </button>` : ''}
      ${ffWaHtml}
    </div>`;
}

window.ffSetCat = function(cat) { ffCurrentCat = cat; renderFaseFinal(); };

window.ffEditSchedule = function(jogoId, catId) {
  const ff = ffLoad();
  const j = ff[catId]?.jogos?.find(x => x.id === jogoId);
  if (!j) return;
  document.getElementById('ffSchedJogoId').value = jogoId;
  document.getElementById('ffSchedCatId').value  = catId;
  document.getElementById('ffSchedData').value   = j.data || '';
  document.getElementById('ffSchedHora').value   = j.hora || '';
  openModal('modalFFSchedule');
};

window.ffSaveSchedule = function() {
  const jogoId  = document.getElementById('ffSchedJogoId').value;
  const catId   = document.getElementById('ffSchedCatId').value;
  const novaData = document.getElementById('ffSchedData').value;
  const novaHora = document.getElementById('ffSchedHora').value;
  if (!novaData || !novaHora) return toast('Seleccione data e hora.', 'error');
  const ff = ffLoad();
  const j  = ff[catId]?.jogos?.find(x => x.id === jogoId);
  if (!j) return;
  j.data = novaData;
  j.hora = novaHora;
  ffSave(ff);
  closeModal('modalFFSchedule');
  renderFaseFinal();
  toast('Horário actualizado.');
};

window.ffGenerate = function(catId) {
  const ff = ffLoad();
  ff[catId] = ffGenerateBracket(catId);
  ffSave(ff);
  renderFaseFinal();
  Auth.log('GENERATE_BRACKET', 'fasefinal', `Bracket gerado: ${catId}`);
  toast(`Bracket gerado para ${catId}.`);
};

window.ffReset = function(catId) {
  if (!Auth.isAdmin()) return toast('Apenas administradores podem executar esta acção.', 'error');
  if (!confirm(`Resetar o bracket de ${catId}? Todos os resultados desta fase serão apagados.`)) return;
  const ff = ffLoad(); delete ff[catId]; ffSave(ff);
  renderFaseFinal();
  Auth.log('RESET_BRACKET', 'fasefinal', `Bracket resetado: ${catId}`);
  toast(`Bracket de ${catId} removido.`);
};

// ---- Global view (all categories) ----
function ffRenderGlobal() {
  const cats = ['M1', 'M2', 'F1', 'F2', 'M3', 'M4', 'M5'];
  const container = document.getElementById('ffBracket');
  const phaseLabel = { QF: 'Quartos', SF: 'Meias', F: 'Final' };

  const actionBar = `
    <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:1.25rem;padding-bottom:1rem;border-bottom:1px solid var(--preto-borda)">
      <button class="btn btn-primary btn-sm" onclick="ffGerarTodosBrackets()">
        <i class="ph ph-magic-wand"></i> Gerar Brackets em Falta
      </button>
      ${Auth.isAdmin() ? `<button class="btn btn-ghost btn-sm" style="color:var(--amarelo);border-color:rgba(245,197,24,.3)" onclick="ffGerarAleatoriosTodos()">
        <i class="ph ph-shuffle"></i> Resultados Aleatórios — Todos
      </button>
      <button class="btn btn-ghost btn-sm" style="color:var(--cinza-texto)" onclick="ffLimparResultadosTodos()">
        <i class="ph ph-eraser"></i> Limpar Resultados — Todos
      </button>
      <button class="btn btn-ghost btn-sm" style="color:var(--vermelho);border-color:rgba(255,74,74,.3)" onclick="ffResetarTodos()">
        <i class="ph ph-arrow-counter-clockwise"></i> Resetar Brackets — Todos
      </button>` : ''}
    </div>`;

  const catBlocks = cats.map(catId => {
    const ff = ffLoad();
    const catData = ff[catId];
    if (!catData?.generated) {
      const done = allGroupGamesDone(catId);
      return `<div style="margin-bottom:1.75rem">
        <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:.5rem;padding-bottom:.4rem;border-bottom:1px solid var(--preto-borda)">
          <span style="font-size:1rem;font-weight:700;color:var(--cinza-texto)">${catId}</span>
          <span style="font-size:.78rem;color:var(--cinza-texto)">Bracket não gerado</span>
          <button class="btn btn-sm ${done ? 'btn-primary' : 'btn-ghost'}" ${!done ? 'disabled title="Fase de grupos incompleta"' : ''} onclick="ffSetCat('${catId}');ffGenerate('${catId}')" style="margin-left:auto;font-size:.72rem">
            <i class="ph ph-magic-wand"></i> Gerar
          </button>
        </div>
      </div>`;
    }
    const { jogos } = catData;
    const allPhases = ['QF', 'SF', 'F'];
    const phases = allPhases.filter(p => jogos.some(j => j.fase === p));
    let championBanner = '';
    const final = jogos.find(j => j.fase === 'F');
    if (final?.resultado) {
      const w = ffGetWinner(final.resultado);
      const name = w === 1 ? final.eq1 : final.eq2;
      if (name) championBanner = `<span style="font-size:.75rem;background:var(--amarelo);color:#000;padding:.15rem .5rem;border-radius:.25rem;font-weight:700">\u{1F3C6} ${escHtml(name)}</span>`;
    }
    const bracketCols = phases.map((fase, colIdx) => {
      const games = [...jogos.filter(j => j.fase === fase)].sort((a, b) => a.num - b.num);
      const isLast = colIdx === phases.length - 1;
      return games.map((g, i) => {
        const isTop = !isLast && i % 2 === 0;
        const isBot = !isLast && i % 2 === 1;
        const cls = ['bk-slot', isTop ? 'bk-slot-top' : isBot ? 'bk-slot-bot' : ''].filter(Boolean).join(' ');
        return `<div class="${cls}">${ffCardHtml(g, catId)}</div>`;
      }).join('');
    });
    return `<div style="margin-bottom:2.5rem">
      <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:.75rem;padding-bottom:.4rem;border-bottom:1px solid var(--preto-borda)">
        <span style="font-size:1rem;font-weight:700;color:var(--verde)">${catId}</span>
        ${championBanner}
        <div style="margin-left:auto;display:flex;gap:.4rem">
          ${Auth.isAdmin() ? `<button class="btn btn-ghost btn-sm" style="font-size:.72rem;color:var(--amarelo)" onclick="ffGerarAleatorios('${catId}')" title="Resultados aleatórios ${catId}"><i class="ph ph-shuffle"></i></button>` : ''}
          <button class="btn btn-ghost btn-sm" style="font-size:.72rem;color:var(--cinza-texto)" onclick="ffSetCat('${catId}')"><i class="ph ph-arrow-right"></i> Ver</button>
        </div>
      </div>
      <div class="bk-bracket" style="font-size:.82em">
        ${phases.map((fase, i) => `
          <div class="bk-round">
            <div class="bk-rhead">${phaseLabel[fase]}</div>
            ${bracketCols[i]}
          </div>`).join('')}
        ${ffChampionColHtml(catId)}
      </div>
    </div>`;
  }).join('');

  container.innerHTML = actionBar + catBlocks;
}

window.ffGerarTodosBrackets = function() {
  const cats = ['M1', 'M2', 'F1', 'F2', 'M3', 'M4', 'M5'];
  const ff = ffLoad();
  const ready = cats.filter(c => !ff[c]?.generated && allGroupGamesDone(c));
  if (ready.length === 0) return toast('Nenhum bracket disponível para gerar (fase de grupos incompleta ou já gerados).', 'error');
  if (!confirm(`Gerar brackets para: ${ready.join(', ')}?`)) return;
  ready.forEach(catId => {
    ff[catId] = ffGenerateBracket(catId);
    Auth.log('GENERATE_BRACKET', 'fasefinal', `Bracket gerado: ${catId}`);
  });
  ffSave(ff);
  if (ffCurrentCat === 'ALL') ffRenderGlobal(); else renderFaseFinal();
  toast(`${ready.length} bracket${ready.length > 1 ? 's' : ''} gerado${ready.length > 1 ? 's' : ''}.`);
};

window.ffGerarAleatoriosTodos = function() {
  if (!Auth.isAdmin()) return toast('Apenas administradores podem executar esta acção.', 'error');
  const cats = ['M1', 'M2', 'F1', 'F2', 'M3', 'M4', 'M5'];
  const generated = cats.filter(c => ffLoad()[c]?.generated);
  if (generated.length === 0) return toast('Nenhum bracket gerado. Gera os brackets primeiro.', 'error');
  if (!confirm(`Preencher resultados aleatórios em todos os brackets gerados (${generated.join(', ')})? (Apenas para testes)`)) return;
  const phaseOrder = ['QF', 'SF', 'F'];
  let totalCount = 0;
  generated.forEach(catId => {
    phaseOrder.forEach(fase => {
      const ff = ffLoad();
      if (!ff[catId]?.generated) return;
      ff[catId].jogos.filter(j => j.fase === fase && !j.resultado && j.eq1 && j.eq2).forEach(j => {
        const s1 = randomSet(), s2 = randomSet();
        const w1 = s1.eq1 > s1.eq2 ? 1 : 2;
        const w2 = s2.eq1 > s2.eq2 ? 1 : 2;
        const r = {
          s1eq1: s1.eq1, s1eq2: s1.eq2, tb1eq1: s1.tbEq1, tb1eq2: s1.tbEq2,
          s2eq1: s2.eq1, s2eq2: s2.eq2, tb2eq1: s2.tbEq1, tb2eq2: s2.tbEq2,
          s3eq1: null,   s3eq2: null,   tb3eq1: null,      tb3eq2: null,
        };
        if (w1 !== w2) {
          const s3 = randomSet();
          r.s3eq1 = s3.eq1; r.s3eq2 = s3.eq2; r.tb3eq1 = s3.tbEq1; r.tb3eq2 = s3.tbEq2;
        }
        j.resultado = r;
        totalCount++;
      });
      ffSave(ff);
      ffPropagate(catId);
    });
  });
  if (ffCurrentCat === 'ALL') ffRenderGlobal(); else renderFaseFinal();
  toast(`${totalCount} resultado${totalCount !== 1 ? 's' : ''} aleatório${totalCount !== 1 ? 's' : ''} gerados para ${generated.length} grupo${generated.length !== 1 ? 's' : ''}.`);
};

window.ffLimparResultadosTodos = function() {
  if (!Auth.isAdmin()) return toast('Apenas administradores podem executar esta acção.', 'error');
  const cats = ['M1', 'M2', 'F1', 'F2', 'M3', 'M4', 'M5'];
  const ff = ffLoad();
  const generated = cats.filter(c => ff[c]?.generated);
  if (generated.length === 0) return toast('Nenhum bracket gerado.', 'error');
  if (!confirm(`Limpar todos os resultados da Fase Final para: ${generated.join(', ')}?`)) return;
  generated.forEach(catId => {
    ff[catId].jogos.forEach(j => {
      j.resultado = null;
      if (j.feedFrom) { j.eq1 = null; j.eq1grupo = null; j.eq2 = null; j.eq2grupo = null; }
    });
  });
  ffSave(ff);
  if (ffCurrentCat === 'ALL') ffRenderGlobal(); else renderFaseFinal();
  toast(`Resultados limpos em ${generated.length} grupo${generated.length !== 1 ? 's' : ''}.`);
};

window.ffResetarTodos = function() {
  if (!Auth.isAdmin()) return toast('Apenas administradores podem executar esta acção.', 'error');
  const cats = ['M1', 'M2', 'F1', 'F2', 'M3', 'M4', 'M5'];
  const ff = ffLoad();
  const generated = cats.filter(c => ff[c]?.generated);
  if (generated.length === 0) return toast('Nenhum bracket gerado.', 'error');
  if (!confirm(`Resetar TODOS os brackets (${generated.join(', ')})? Todos os resultados da Fase Final serão apagados.`)) return;
  generated.forEach(catId => {
    delete ff[catId];
    Auth.log('RESET_BRACKET', 'fasefinal', `Bracket resetado: ${catId}`);
  });
  ffSave(ff);
  if (ffCurrentCat === 'ALL') ffRenderGlobal(); else renderFaseFinal();
  toast(`${generated.length} bracket${generated.length !== 1 ? 's' : ''} removido${generated.length !== 1 ? 's' : ''}.`);
};

window.ffGerarAleatorios = function(catId) {
  if (!Auth.isAdmin()) return toast('Apenas administradores podem executar esta acção.', 'error');
  if (!confirm(`Preencher todos os jogos pendentes de ${catId} com resultados aleatórios?\n(Apenas para testes)`))
    return;
  const ff = ffLoad();
  if (!ff[catId]?.generated) return toast('Gera o bracket primeiro.', 'error');

  // Process phases in order so propagation fills next-round teams
  const phaseOrder = ['QF', 'SF', 'F'];
  let count = 0;
  phaseOrder.forEach(fase => {
    ff[catId].jogos.filter(j => j.fase === fase && !j.resultado && j.eq1 && j.eq2).forEach(j => {
      const s1 = randomSet(), s2 = randomSet();
      const w1 = s1.eq1 > s1.eq2 ? 1 : 2;
      const w2 = s2.eq1 > s2.eq2 ? 1 : 2;
      const r = {
        s1eq1: s1.eq1, s1eq2: s1.eq2, tb1eq1: s1.tbEq1, tb1eq2: s1.tbEq2,
        s2eq1: s2.eq1, s2eq2: s2.eq2, tb2eq1: s2.tbEq1, tb2eq2: s2.tbEq2,
        s3eq1: null,   s3eq2: null,   tb3eq1: null,      tb3eq2: null,
      };
      if (w1 !== w2) {
        const s3 = randomSet();
        r.s3eq1 = s3.eq1; r.s3eq2 = s3.eq2; r.tb3eq1 = s3.tbEq1; r.tb3eq2 = s3.tbEq2;
      }
      j.resultado = r;
      count++;
    });
    // Propagate winners before processing the next phase
    ffSave(ff);
    ffPropagate(catId);
    // Reload to get propagated team names
    const updated = ffLoad();
    ff[catId] = updated[catId];
  });

  renderFaseFinal();
  toast(`${count} resultado${count !== 1 ? 's' : ''} aleatório${count !== 1 ? 's' : ''} gerados para ${catId}.`);
};

window.ffLimparResultados = function(catId) {
  if (!Auth.isAdmin()) return toast('Apenas administradores podem executar esta acção.', 'error');
  if (!confirm(`Limpar todos os resultados da Fase Final de ${catId}?`)) return;
  const ff = ffLoad();
  if (!ff[catId]?.generated) return;
  // Clear results and reset propagated teams on dependent games
  ff[catId].jogos.forEach(j => {
    j.resultado = null;
    if (j.feedFrom) { j.eq1 = null; j.eq1grupo = null; j.eq2 = null; j.eq2grupo = null; }
  });
  ffSave(ff);
  renderFaseFinal();
  toast(`Resultados de ${catId} removidos.`);
};

window.ffAbrirResultado = function(jogoId, catId) {
  const ff = ffLoad();
  const j  = ff[catId]?.jogos.find(j => j.id === jogoId);
  if (!j) return;
  APP.ffEditing = { catId, jogoId };
  APP.editingId = null;
  const fLabel = j.fase === 'F' ? 'Final' : j.fase === 'SF' ? `Meia-Final ${j.num}` : `Quarto de Final ${j.num}`;
  // FF games: show read-only info, hide editable fields
  const miEl = document.getElementById('resMatchInfo');
  miEl.textContent = `${catId} · ${fLabel}`;
  miEl.style.display = '';
  document.getElementById('resEditFields').style.display = 'none';
  const _ff1 = document.getElementById('resTeam1');
  const _ff2 = document.getElementById('resTeam2');
  _ff1.innerHTML = (j.eq1||'?').split(' & ').map(escHtml).join('<br>'); _ff1.dataset.equipa = j.eq1||'';
  _ff2.innerHTML = (j.eq2||'?').split(' & ').map(escHtml).join('<br>'); _ff2.dataset.equipa = j.eq2||'';
  [1, 2, 3].forEach(n => clearSetInputs(n));
  [2, 3].forEach(n => { document.getElementById(`setBlock${n}`).style.display = 'none'; });
  document.getElementById('matchResultBar').style.display = 'none';
  // WO reset + button labels
  const _ffWoChk = document.getElementById('resWoCheck');
  if (_ffWoChk) _ffWoChk.checked = false;
  const _ffWoPk = document.getElementById('resWoPicker');
  if (_ffWoPk) _ffWoPk.style.display = 'none';
  APP._woSelection = null;
  [1,2,3].forEach(n => { const b = document.getElementById(`setBlock${n}`); if (b) { b.style.opacity='1'; b.querySelectorAll('input').forEach(el => el.disabled = false); } });
  const _ffWb1 = document.getElementById('resWoEq1Btn'); if (_ffWb1) _ffWb1.textContent = ((j.eq1||'Eq1').length>28?(j.eq1||'Eq1').substring(0,28)+'\u2026':(j.eq1||'Eq1')) + ' \u2014 WO';
  const _ffWb2 = document.getElementById('resWoEq2Btn'); if (_ffWb2) _ffWb2.textContent = ((j.eq2||'Eq2').length>28?(j.eq2||'Eq2').substring(0,28)+'\u2026':(j.eq2||'Eq2')) + ' \u2014 WO';
  const r = j.resultado;
  if (r) {
    if (r.wo) {
      if (_ffWoChk) { _ffWoChk.checked = true; if (_ffWoPk) _ffWoPk.style.display = ''; }
      selectResWo(r.wo);
    } else {
      const loadSet = (n, e1, e2, tb1, tb2) => {
        const isTb = (e1 === 7 && e2 === 6) || (e1 === 6 && e2 === 7);
        document.getElementById(`resS${n}E1`).value = isTb ? 6 : e1;
        document.getElementById(`resS${n}E2`).value = isTb ? 6 : e2;
        if (isTb && tb1 != null) { document.getElementById(`resTB${n}E1`).value = tb1; document.getElementById(`resTB${n}E2`).value = tb2; }
      };
      loadSet(1, r.s1eq1, r.s1eq2, r.tb1eq1, r.tb1eq2);
      if (r.s2eq1 !== null) loadSet(2, r.s2eq1, r.s2eq2, r.tb2eq1, r.tb2eq2);
      if (r.s3eq1 !== null) loadSet(3, r.s3eq1, r.s3eq2, r.tb3eq1, r.tb3eq2);
    }
  }
  if (!r?.wo) {
    onSetInput(1);
    if (r?.s2eq1 !== null) onSetInput(2);
    if (r?.s3eq1 !== null) onSetInput(3);
  }
  openModal('modalResultado');
};


// ============================================
//  ROLE UI SETUP
// ============================================
function setupRoleUI() {
  const me = Auth.me();
  if (!me) return;

  // Update sidebar footer
  document.getElementById('sidebarAvatar').textContent = me.name.charAt(0).toUpperCase();
  document.getElementById('sidebarName').textContent   = me.name;
  document.getElementById('sidebarRole').textContent   = me.role === 'admin' ? 'Administrador · Play Padel' : 'Operador · Play Padel';

  // Show/hide SISTEMA group (admin only)
  const sistemaGroup = document.getElementById('sidebarSistema');
  if (sistemaGroup) sistemaGroup.style.display = me.role === 'admin' ? '' : 'none';
}

// ============================================
//  UTILIZADORES VIEW
// ============================================
function renderUtilizadores() {
  if (!Auth.isAdmin()) { navigate('dashboard'); return; }
  const users = Auth.getUsers();
  const me    = Auth.me();

  document.getElementById('tblUtilizadores').innerHTML = `
    <div class="card" style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="border-bottom:1px solid var(--preto-borda);text-align:left">
            <th style="padding:.6rem .8rem;color:var(--cinza-texto);font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Utilizador</th>
            <th style="padding:.6rem .8rem;color:var(--cinza-texto);font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Nome</th>
            <th style="padding:.6rem .8rem;color:var(--cinza-texto);font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Role</th>
            <th style="padding:.6rem .8rem;color:var(--cinza-texto);font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Estado</th>
            <th style="padding:.6rem .8rem;color:var(--cinza-texto);font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Criado em</th>
            <th style="padding:.6rem .8rem;color:var(--cinza-texto);font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Ações</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(u => `
            <tr style="border-bottom:1px solid var(--preto-borda)">
              <td style="padding:.65rem .8rem;font-weight:700;color:var(--branco)">${u.username}</td>
              <td style="padding:.65rem .8rem">${u.name}</td>
              <td style="padding:.65rem .8rem">
                <span style="font-size:.65rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:.2rem .55rem;border-radius:4px;background:${u.role === 'admin' ? 'rgba(245,197,24,.15)' : 'rgba(0,195,123,.12)'};color:${u.role === 'admin' ? 'var(--amarelo)' : 'var(--verde)'}">
                  ${u.role === 'admin' ? 'Admin' : 'Operador'}
                </span>
              </td>
              <td style="padding:.65rem .8rem">
                <span style="font-size:.65rem;font-weight:700;text-transform:uppercase;padding:.2rem .55rem;border-radius:4px;background:${u.active ? 'rgba(0,195,123,.12)' : 'rgba(255,74,74,.12)'};color:${u.active ? 'var(--verde)' : 'var(--vermelho)'}">
                  ${u.active ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td style="padding:.65rem .8rem;font-size:.72rem;color:var(--cinza-texto)">${new Date(u.createdAt).toLocaleDateString('pt-PT')}</td>
              <td style="padding:.65rem .8rem">
                <div style="display:flex;gap:.35rem;align-items:center">
                  <button class="btn btn-ghost btn-sm" onclick="uiEditUser('${u.id}')" title="Editar"><i class="ph ph-pencil"></i></button>
                  ${u.username !== 'admin' ? `
                    <button class="btn btn-ghost btn-sm" onclick="uiToggleUser('${u.id}')" title="${u.active ? 'Desactivar' : 'Activar'}">
                      <i class="ph ph-${u.active ? 'pause-circle' : 'play-circle'}"></i>
                    </button>
                    <button class="btn btn-ghost btn-sm" style="color:var(--vermelho)" onclick="uiDeleteUser('${u.id}','${escHtml(u.username)}')" title="Eliminar">
                      <i class="ph ph-trash"></i>
                    </button>
                  ` : `<span style="font-size:.65rem;color:var(--cinza-texto)">protegido</span>`}
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`;
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// User modal helpers
let _editUserId = null;

function uiNewUser() {
  _editUserId = null;
  document.getElementById('modalUserTitle').textContent = 'Novo Utilizador';
  document.getElementById('userUsername').value  = '';
  document.getElementById('userUsername').disabled = false;
  document.getElementById('userName').value      = '';
  document.getElementById('userRole').value      = 'operator';
  document.getElementById('userPass').value      = '';
  document.getElementById('userPass2').value     = '';
  document.getElementById('userPassLabel').textContent  = 'Palavra-passe *';
  document.getElementById('userPass2Label').textContent = 'Confirmar palavra-passe *';
  document.getElementById('userPass').required   = true;
  document.getElementById('userPass2').required  = true;
  _buildCategoryCheckboxes([]);
  updateUserCategoriesVisibility();
  _hideUserError();
  openModal('modalUser');
}

function uiEditUser(id) {
  const u = Auth.getUsers().find(x => x.id === id);
  if (!u) return;
  _editUserId = id;
  document.getElementById('modalUserTitle').textContent = 'Editar Utilizador';
  document.getElementById('userUsername').value    = u.username;
  document.getElementById('userUsername').disabled = u.username === 'admin';
  document.getElementById('userName').value        = u.name;
  document.getElementById('userRole').value        = u.role;
  document.getElementById('userPass').value        = '';
  document.getElementById('userPass2').value       = '';
  document.getElementById('userPassLabel').textContent  = 'Nova palavra-passe (deixar em branco para manter)';
  document.getElementById('userPass2Label').textContent = 'Confirmar nova palavra-passe';
  document.getElementById('userPass').required   = false;
  document.getElementById('userPass2').required  = false;
  _buildCategoryCheckboxes(u.categories || []);
  updateUserCategoriesVisibility();
  _hideUserError();
  openModal('modalUser');
}

function uiSaveUser() {
  const username = document.getElementById('userUsername').value.trim();
  const name     = document.getElementById('userName').value.trim();
  const role     = document.getElementById('userRole').value;
  const pass     = document.getElementById('userPass').value;
  const pass2    = document.getElementById('userPass2').value;

  if (!username || !name) return _showUserError('Username e nome são obrigatórios.');
  if (_editUserId === null && !pass) return _showUserError('Palavra-passe obrigatória para novo utilizador.');
  if (pass && pass.length < 6) return _showUserError('Palavra-passe deve ter pelo menos 6 caracteres.');
  if (pass && pass !== pass2)  return _showUserError('As palavras-passe não coincidem.');

  let result;
  if (_editUserId === null) {
    const categories = role === 'operator'
      ? [...document.querySelectorAll('#userCategoriesGrid input[type=checkbox]:checked')].map(c => c.value)
      : [];
    result = Auth.createUser(username, name, role, pass, categories);
  } else {
    const categories = role === 'operator'
      ? [...document.querySelectorAll('#userCategoriesGrid input[type=checkbox]:checked')].map(c => c.value)
      : [];
    const changes = { username, name, role, categories };
    if (pass) changes.password = pass;
    result = Auth.updateUser(_editUserId, changes);
  }

  if (!result.ok) return _showUserError(result.error);

  closeModal('modalUser');
  toast(_editUserId === null ? `Utilizador "${username}" criado.` : `Utilizador "${username}" actualizado.`);
  renderUtilizadores();
}

function uiToggleUser(id) {
  const result = Auth.toggleUser(id);
  if (!result.ok) return toast(result.error, 'error');
  toast(result.active ? 'Utilizador activado.' : 'Utilizador desactivado.');
  renderUtilizadores();
}

function uiDeleteUser(id, username) {
  if (!confirm(`Eliminar o utilizador "${username}"? Esta ação não pode ser desfeita.`)) return;
  const result = Auth.deleteUser(id);
  if (!result.ok) return toast(result.error, 'error');
  toast(`Utilizador "${username}" eliminado.`);
  renderUtilizadores();
}

function _showUserError(msg) {
  const el = document.getElementById('userModalError');
  document.getElementById('userModalErrorMsg').textContent = msg;
  el.style.display = 'flex';
}
function _hideUserError() {
  document.getElementById('userModalError').style.display = 'none';
}

// ============================================
//  LOGS VIEW
// ============================================
function renderLogs() {
  if (!Auth.isAdmin()) { navigate('dashboard'); return; }

  const actionStyle = {
    LOGIN:            'color:var(--verde)',
    LOGOUT:           'color:var(--cinza-texto)',
    CREATE_USER:      'color:var(--amarelo)',
    UPDATE_USER:      'color:var(--amarelo)',
    DELETE_USER:      'color:var(--vermelho)',
    ENABLE_USER:      'color:var(--verde)',
    DISABLE_USER:     'color:var(--vermelho)',
    FORCE_LOGOUT:     'color:var(--vermelho)',
    SAVE_RESULT:      'color:var(--verde)',
    SAVE_RESULT_FF:   'color:var(--verde)',
    CLEAR_RESULT:     'color:var(--cinza-texto)',
    GENERATE_BRACKET: 'color:var(--amarelo)',
    RESET_BRACKET:    'color:var(--vermelho)',
    RENAME_JOGADOR:   'color:var(--amarelo)',
    CREATE_CAMPO:     'color:var(--verde)',
    UPDATE_CAMPO:     'color:var(--amarelo)',
    DELETE_CAMPO:     'color:var(--vermelho)',
  };

  const allLogs = Auth.getLogs().slice(0, 500);
  APP._logsAll   = allLogs;
  APP._logsSort  = APP._logsSort  || { col: 'ts', dir: -1 };

  // Populate action filter
  const actionSel = document.getElementById('logsFilterAction');
  if (actionSel) {
    const actions = [...new Set(allLogs.map(l => l.action))].sort();
    const cur = actionSel.value;
    actionSel.innerHTML = '<option value="">Todas as acções</option>' +
      actions.map(a => `<option value="${a}"${a === cur ? ' selected' : ''}>${a}</option>`).join('');
  }

  window._logsApplyFilters();
}

window._logsApplyFilters = function() {
  const actionStyle = {
    LOGIN:            'color:var(--verde)',
    LOGOUT:           'color:var(--cinza-texto)',
    CREATE_USER:      'color:var(--amarelo)',
    UPDATE_USER:      'color:var(--amarelo)',
    DELETE_USER:      'color:var(--vermelho)',
    ENABLE_USER:      'color:var(--verde)',
    DISABLE_USER:     'color:var(--vermelho)',
    FORCE_LOGOUT:     'color:var(--vermelho)',
    SAVE_RESULT:      'color:var(--verde)',
    SAVE_RESULT_FF:   'color:var(--verde)',
    CLEAR_RESULT:     'color:var(--cinza-texto)',
    GENERATE_BRACKET: 'color:var(--amarelo)',
    RESET_BRACKET:    'color:var(--vermelho)',
    RENAME_JOGADOR:   'color:var(--amarelo)',
    CREATE_CAMPO:     'color:var(--verde)',
    UPDATE_CAMPO:     'color:var(--amarelo)',
    DELETE_CAMPO:     'color:var(--vermelho)',
  };
  const allLogs = APP._logsAll || [];
  const userFilter   = (document.getElementById('logsFilterUser')?.value   || '').toLowerCase().trim();
  const roleFilter   =  document.getElementById('logsFilterRole')?.value   || '';
  const actionFilter =  document.getElementById('logsFilterAction')?.value || '';
  const { col, dir } = APP._logsSort || { col: 'ts', dir: -1 };

  let logs = allLogs.filter(l =>
    (!userFilter   || l.username.toLowerCase().includes(userFilter)) &&
    (!roleFilter   || l.role === roleFilter) &&
    (!actionFilter || l.action === actionFilter)
  );

  logs = logs.slice().sort((a, b) => {
    let va = a[col] ?? '', vb = b[col] ?? '';
    if (col === 'ts') { va = new Date(va).getTime(); vb = new Date(vb).getTime(); }
    else { va = String(va).toLowerCase(); vb = String(vb).toLowerCase(); }
    return va < vb ? -dir : va > vb ? dir : 0;
  });

  const countEl = document.getElementById('logsCount');
  if (countEl) countEl.textContent = logs.length + ' / ' + allLogs.length + ' entradas';

  const sortArrow = (c) => c === col ? (dir === 1 ? ' ▲' : ' ▼') : ' ▽';
  const thStyle = 'padding:.55rem .7rem;font-size:.7rem;font-weight:600;text-transform:uppercase;white-space:nowrap;cursor:pointer;user-select:none;color:var(--cinza-texto)';
  const thActive = 'color:var(--branco);';

  const el = document.getElementById('tblLogs');
  if (!el) return;
  el.innerHTML = logs.length === 0
    ? `<div style="text-align:center;padding:3rem;color:var(--cinza-texto)"><i class="ph ph-clipboard-text" style="font-size:2.5rem;display:block;margin-bottom:.6rem"></i>Sem registos para os filtros seleccionados.</div>`
    : `<div class="card" style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="border-bottom:1px solid var(--preto-borda);text-align:left;background:var(--cinza-escuro)">
              <th style="${thStyle}${'ts'===col?thActive:''}" onclick="_logsSort('ts')">Data/Hora${sortArrow('ts')}</th>
              <th style="${thStyle}${'username'===col?thActive:''}" onclick="_logsSort('username')">Utilizador${sortArrow('username')}</th>
              <th style="${thStyle}${'role'===col?thActive:''}" onclick="_logsSort('role')">Role${sortArrow('role')}</th>
              <th style="${thStyle}${'action'===col?thActive:''}" onclick="_logsSort('action')">Acção${sortArrow('action')}</th>
              <th style="${thStyle}${'target'===col?thActive:''}" onclick="_logsSort('target')">Alvo${sortArrow('target')}</th>
              <th style="${thStyle}${'detail'===col?thActive:''}" onclick="_logsSort('detail')">Detalhe${sortArrow('detail')}</th>
            </tr>
          </thead>
          <tbody>
            ${logs.map((l, i) => `
              <tr style="border-bottom:1px solid var(--preto-borda);background:${i%2===0?'var(--preto-card)':'var(--cinza-escuro)'}">
                <td style="padding:.5rem .7rem;font-size:.7rem;color:var(--cinza-texto);white-space:nowrap">${new Date(l.ts).toLocaleString('pt-PT')}</td>
                <td style="padding:.5rem .7rem;font-weight:600;font-size:.82rem">${escHtml(l.username)}</td>
                <td style="padding:.5rem .7rem">
                  <span style="font-size:.62rem;font-weight:700;text-transform:uppercase;padding:.15rem .45rem;border-radius:3px;background:${l.role === 'admin' ? 'rgba(245,197,24,.15)' : 'rgba(0,195,123,.12)'};color:${l.role === 'admin' ? 'var(--amarelo)' : 'var(--verde)'}">
                    ${l.role === 'admin' ? 'Admin' : l.role === 'operator' ? 'Oper.' : l.role}
                  </span>
                </td>
                <td style="padding:.5rem .7rem">
                  <span style="font-size:.68rem;font-weight:700;${actionStyle[l.action] || 'color:var(--branco)'}">${l.action}</span>
                </td>
                <td style="padding:.5rem .7rem;font-size:.75rem;color:var(--cinza-texto)">${escHtml(l.target)}</td>
                <td style="padding:.5rem .7rem;font-size:.75rem;color:var(--cinza-texto)">${escHtml(l.detail)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
};

window._logsSort = function(col) {
  const s = APP._logsSort || { col: 'ts', dir: -1 };
  APP._logsSort = { col, dir: s.col === col ? -s.dir : -1 };
  _logsApplyFilters();
};

window._logsClearFilters = function() {
  const u = document.getElementById('logsFilterUser');   if (u) u.value = '';
  const r = document.getElementById('logsFilterRole');   if (r) r.value = '';
  const a = document.getElementById('logsFilterAction'); if (a) a.value = '';
  _logsApplyFilters();
};

// ============================================
//  SESSÕES VIEW
// ============================================
function renderSessoes() {
  if (!Auth.isAdmin()) { navigate('dashboard'); return; }
  const sessions = Auth.getSessions();
  const me       = Auth.me();

  const container = document.getElementById('listSessoes');
  if (sessions.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:3rem;color:var(--cinza-texto)"><i class="ph ph-monitor" style="font-size:2.5rem;display:block;margin-bottom:.6rem"></i>Nenhuma sessão activa.</div>`;
    return;
  }

  container.innerHTML = sessions.map(s => `
    <div class="card" style="display:flex;align-items:center;gap:1rem;padding:.9rem 1.2rem;margin-bottom:.6rem">
      <div style="background:var(--cinza-escuro);width:2.4rem;height:2.4rem;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;color:var(--branco);flex-shrink:0;font-size:1rem">
        ${escHtml(s.name.charAt(0).toUpperCase())}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;color:var(--branco);font-size:.92rem">${escHtml(s.name)} <span style="font-size:.72rem;color:var(--cinza-texto);font-weight:400">(${escHtml(s.username)})</span></div>
        <div style="font-size:.7rem;color:var(--cinza-texto);margin-top:.15rem">
          Login: ${new Date(s.loginAt).toLocaleString('pt-PT')} &nbsp;·&nbsp; Última actividade: ${new Date(s.lastActivity).toLocaleString('pt-PT')}
        </div>
      </div>
      <span style="font-size:.65rem;font-weight:700;text-transform:uppercase;padding:.2rem .55rem;border-radius:4px;flex-shrink:0;background:${s.role === 'admin' ? 'rgba(245,197,24,.15)' : 'rgba(0,195,123,.12)'};color:${s.role === 'admin' ? 'var(--amarelo)' : 'var(--verde)'}">
        ${s.role === 'admin' ? 'Admin' : 'Operador'}
      </span>
      ${s.sessionId === me?.sessionId
        ? `<span style="font-size:.68rem;color:var(--verde);font-weight:700;flex-shrink:0">→ Esta sessão</span>`
        : `<button class="btn btn-ghost btn-sm" style="color:var(--vermelho);flex-shrink:0" onclick="uiForceLogout('${escHtml(s.sessionId)}','${escHtml(s.username)}')">
             <i class="ph ph-sign-out"></i> Encerrar
           </button>`}
    </div>
  `).join('');
}

function uiForceLogout(sessionId, username) {
  if (!confirm(`Encerrar a sessão de "${username}"?`)) return;
  Auth.forceLogout(sessionId);
  toast(`Sessão de "${username}" encerrada.`);
  renderSessoes();
}

// ============================================
//  HELPER: category checkboxes in user modal
// ============================================
const _ALL_CATS = ['M1','M2','M3','M4','M5','F1','F2'];

function _buildCategoryCheckboxes(selectedCats) {
  const grid = document.getElementById('userCategoriesGrid');
  if (!grid) return;
  grid.innerHTML = _ALL_CATS.map(cat => `
    <label style="display:flex;align-items:center;gap:.4rem;cursor:pointer;font-size:.82rem">
      <input type="checkbox" value="${cat}" ${selectedCats.includes(cat) ? 'checked' : ''}
        style="accent-color:var(--verde);width:15px;height:15px">
      <span>${cat}</span>
    </label>`).join('');
}

function updateUserCategoriesVisibility() {
  const role = document.getElementById('userRole')?.value;
  const wrap = document.getElementById('userCategoriesWrap');
  if (wrap) wrap.style.display = role === 'operator' ? 'block' : 'none';
}

// ============================================
//  ADMIN STANDINGS (Classificações view)
// ============================================
let _classActiveCat = null;
window.renderClassificacoes = function() { renderAdminClassificacoes(); };

function renderAdminClassificacoes() {
  const cats = getData('categorias').map(c => c.id);
  const grupos = getData('grupos');
  const jogos  = getData('jogos');

  const tabsEl    = document.getElementById('adminClassTabs');
  const contentEl = document.getElementById('adminClassContent');
  if (!tabsEl || !contentEl) return;

  _classActiveCat = null;
  tabsEl.innerHTML = `<button class="tab-btn active" onclick="_adminClassTab('__all__',this)">Todos</button>` +
    cats.map(c => `
    <button class="tab-btn" onclick="_adminClassTab('${c}',this)">${c}</button>
  `).join('');

  // Default: show all groups from all categories
  _renderAdminClassAllCats(cats, grupos, jogos, contentEl);
}

function _adminClassTab(catId, btn) {
  _classActiveCat = catId;
  document.querySelectorAll('#adminClassTabs .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const grupos = getData('grupos');
  const jogos  = getData('jogos');
  if (catId === '__all__') {
    _classActiveCat = null;
    _renderAdminClassAllCats(getData('categorias').map(c => c.id), grupos, jogos, document.getElementById('adminClassContent'));
  } else {
    _renderAdminClassCat(catId, grupos, jogos, document.getElementById('adminClassContent'));
  }
}

function _renderAdminClassAllCats(cats, grupos, jogos, el) {
  el.innerHTML = cats.map(catId => {
    const catGroups = _adminClassCatGroups(catId, grupos);
    if (!catGroups.length) return '';
    return catGroups.map(g => {
      const rows = _adminClassStandings(g, jogos);
      const gJogos = jogos.filter(j => j.grupo === g.id);
      const done = gJogos.filter(j => j.resultado).length;
      return _adminGroupCardHTML(g, rows, gJogos, done, catId);
    }).join('');
  }).join('');
  el.innerHTML = `<div class="admin-standings-grid">${el.innerHTML}</div>`;
}

function _adminClassCatGroups(catId, grupos) {
  return grupos.filter(g => g.cat === catId);
}

function _adminClassStandings(grupo, jogos) {
  const gJogos = jogos.filter(j => j.grupo === grupo.id);
  const pairs = {};
  gJogos.forEach(j => {
    if (!pairs[j.eq1]) pairs[j.eq1] = { par: j.eq1, pj:0, v:0, d:0, pts:0, sv:0, sl:0, gv:0, gl:0 };
    if (!pairs[j.eq2]) pairs[j.eq2] = { par: j.eq2, pj:0, v:0, d:0, pts:0, sv:0, sl:0, gv:0, gl:0 };
  });
  gJogos.forEach(j => {
    if (!j.resultado) return;
    const r = j.resultado;
    const allSets = [[r.s1eq1,r.s1eq2],[r.s2eq1,r.s2eq2],[r.s3eq1,r.s3eq2]].filter(([a]) => a != null);
    let vEq1=0, vEq2=0;
    allSets.forEach(([a,b]) => {
      if (a > b) { vEq1++; if (pairs[j.eq1]) pairs[j.eq1].sv++; if (pairs[j.eq2]) pairs[j.eq2].sl++; }
      else        { vEq2++; if (pairs[j.eq2]) pairs[j.eq2].sv++; if (pairs[j.eq1]) pairs[j.eq1].sl++; }
      if (pairs[j.eq1]) { pairs[j.eq1].gv += a; pairs[j.eq1].gl += b; }
      if (pairs[j.eq2]) { pairs[j.eq2].gv += b; pairs[j.eq2].gl += a; }
    });
    const eq1win = vEq1 > vEq2;
    if (pairs[j.eq1]) { pairs[j.eq1].pj++; if (eq1win) { pairs[j.eq1].v++; pairs[j.eq1].pts+=2; } else pairs[j.eq1].d++; }
    if (pairs[j.eq2]) { pairs[j.eq2].pj++; if (!eq1win){ pairs[j.eq2].v++; pairs[j.eq2].pts+=2; } else pairs[j.eq2].d++; }
  });
  return Object.values(pairs).sort((a,b) => b.pts - a.pts || (b.sv-b.sl)-(a.sv-a.sl) || (b.gv-b.gl)-(a.gv-a.gl) || b.gv - a.gv);
}

function _renderAdminClassCat(catId, grupos, jogos, el) {
  const catGroups = _adminClassCatGroups(catId, grupos);
  if (!catGroups.length) { el.innerHTML = `<p style="color:var(--cinza-texto);padding:1rem">Sem grupos para esta categoria.</p>`; return; }
  el.innerHTML = `<div class="admin-standings-grid">
    ${catGroups.map(g => {
      const rows = _adminClassStandings(g, jogos);
      const gJogos = jogos.filter(j => j.grupo === g.id);
      const done = gJogos.filter(j => j.resultado).length;
      return _adminGroupCardHTML(g, rows, gJogos, done, catId);
    }).join('')}
  </div>`;
}

function _adminGroupCardHTML(g, rows, gJogos, done, catId) {
  return `<div class="admin-group-card">
        <div class="admin-group-card-header">
          <span style="font-weight:700;color:var(--branco)">${g.id}</span>
          <span style="font-size:.68rem;color:var(--cinza-texto)">${done}/${gJogos.length} jogos</span>
        </div>
        <table class="std-table">
          <thead><tr><th>#</th><th>Par</th><th>PJ</th><th>V</th><th>D</th><th>S</th><th>J</th><th>Pts</th></tr></thead>
          <tbody>${rows.map((r, i) => {
            const [p1, p2] = r.par.split(' & ');
            return `
            <tr class="${i===0?'std-q1':i===1?'std-q2':''}">
              <td>${i+1}</td>
              <td>
                <div style="min-width:0">
                  <span style="display:block;font-size:.8rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px">${escHtml(p1||r.par)}</span>
                  ${p2?`<span style="display:block;font-size:.8rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px;color:var(--cinza-texto)">${escHtml(p2)}</span>`:''}
                </div>
              </td>
              <td>${r.pj}</td><td style="color:var(--verde)">${r.v}</td><td style="color:var(--vermelho)">${r.d}</td>
              <td>${r.sv}-${r.sl}</td><td style="color:var(--cinza-texto)">${r.gv}-${r.gl}</td><td style="font-weight:700;color:var(--branco)">${r.pts}</td>
            </tr>`;
          }).join('')}
          </tbody>
        </table>
      </div>`;
}

// ============================================
//  REMOVER PAR DO GRUPO (apaga jogos)
// ============================================
window.removerParDoGrupo = function(par, grupoId) {
  const jogos = getData('jogos');
  const afetados = jogos.filter(j => j.grupo === grupoId && (j.eq1 === par || j.eq2 === par));
  if (!afetados.length) { toast('Nenhum jogo encontrado para este par.', 'error'); return; }
  if (!confirm(`Remover permanentemente "${par}" do grupo ${grupoId}?\n\n${afetados.length} jogo(s) serão eliminados.`)) return;
  const novosJogos = jogos.filter(j => !(j.grupo === grupoId && (j.eq1 === par || j.eq2 === par)));
  setData('jogos', novosJogos);
  Auth.log('DELETE_PAR_GRUPO', 'jogos', `"${par}" removido de ${grupoId} (${afetados.length} jogo(s))`);
  toast(`"${par}" removido — ${afetados.length} jogo(s) eliminado(s)`, 'success');
  renderAdminClassificacoes();
};

// ============================================
//  MUDAR GRUPO DO PAR
// ============================================
let _editGrupoState = null;

window.editarGrupoPar = function(par, catId, currentGrupoId) {
  _editGrupoState = { par, catId, currentGrupoId };
  const grupos = getData('grupos').filter(g => g.cat === catId);
  document.getElementById('editGrupoPar').innerHTML = par.split(' & ')
    .map(p => `<span style="display:block">${escHtml(p)}</span>`).join('');
  document.getElementById('editGrupoActual').textContent = currentGrupoId;
  const sel = document.getElementById('editGrupoNovo');
  sel.innerHTML = grupos
    .filter(g => g.id !== currentGrupoId)
    .map(g => `<option value="${g.id}">${g.id}</option>`)
    .join('');
  openModal('modalEditarGrupo');
};

window.saveEditarGrupo = function() {
  if (!_editGrupoState) return;
  const { par, currentGrupoId } = _editGrupoState;
  const newGrupoId = document.getElementById('editGrupoNovo').value;
  if (!newGrupoId || newGrupoId === currentGrupoId) { closeModal('modalEditarGrupo'); return; }
  const jogos = getData('jogos');
  let count = 0;
  jogos.forEach(j => {
    if (j.grupo === currentGrupoId && (j.eq1 === par || j.eq2 === par)) {
      j.grupo = newGrupoId;
      count++;
    }
  });
  setData('jogos', jogos);
  closeModal('modalEditarGrupo');
  toast(`${count} jogo(s) movido(s) de ${currentGrupoId} → ${newGrupoId}`, 'success');
  renderAdminClassificacoes();
};

// ============================================
//  PANFLETO CLASSIFICAÇÕES
// ============================================
window.gerarPanfletoClassificacoes = function() {
  const catId = _classActiveCat;  // null = todos
  const cats  = catId ? [catId] : getData('categorias').map(c => c.id);

  const allGrupos = getData('grupos').filter(g => cats.includes(g.cat));
  const jogos     = getData('jogos');
  if (!allGrupos.length) return toast('Sem grupos para gerar.', 'error');

  const groupData = allGrupos.map(g => {
    const rows = _adminClassStandings(g, jogos);
    const gJogos = jogos.filter(j => j.grupo === g.id);
    return { id: g.id, rows, total: gJogos.length, done: gJogos.filter(j => j.resultado).length };
  });

  const catColor = catId ? ({ M1:'#4A9EFF', M2:'#00C37B', M3:'#39FF8F', M4:'#F5C518', M5:'#FF9A3C', F1:'#FF6BB0', F2:'#C97BFF' }[catId] || '#00C37B') : '#00C37B';
  const labelTxt = catId ? catId.toUpperCase() : 'TODOS OS GRUPOS';
  const filename = catId ? `classificacoes-${catId}.png` : 'classificacoes-todos.png';

  const W = 1920, PAD = 52;
  const COLS = 3, COL_GAP = 24;
  const CARD_W = (W - PAD * 2 - COL_GAP * (COLS - 1)) / COLS;
  const CP = 18, CARD_HEAD_H = 48, COL_HEAD_H = 32, ROW_H = 38, CARD_BOT = 14;
  const HEAD_H = 240, FOOT_H = 64, ROW_GAP = 18;

  function cardHeight(g) { return CARD_HEAD_H + COL_HEAD_H + g.rows.length * ROW_H + CARD_BOT; }

  const cardRows = [];
  for (let i = 0; i < groupData.length; i += COLS) cardRows.push(groupData.slice(i, i + COLS));

  let contentH = 0;
  cardRows.forEach(row => { contentH += Math.max(...row.map(cardHeight)) + ROW_GAP; });

  const H = HEAD_H + contentH + FOOT_H;

  function draw(logoImg) {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const CAT_CLR = { M1:'#4A9EFF', M2:'#00C37B', M3:'#39FF8F', M4:'#F5C518', M5:'#FF9A3C', F1:'#FF6BB0', F2:'#C97BFF' };
  // catColor and labelTxt already computed above

  function cTrunc(text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    while (text.length && ctx.measureText(text + '\u2026').width > maxW) text = text.slice(0, -1);
    return text + '\u2026';
  }

  // Background
  ctx.fillStyle = '#0A0F0D'; ctx.fillRect(0, 0, W, H);

  // Top bar
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, catColor); grad.addColorStop(1, '#007A4E');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, 10);

  // Header
  ctx.fillStyle = catColor;
  ctx.font = 'bold 66px Arial, sans-serif';
  ctx.fillText('PLAY PADEL', PAD, 86);
  ctx.fillStyle = '#F0F7F3';
  ctx.font = '40px Arial, sans-serif';
  ctx.fillText('TORNEIO ANIVERSÁRIO 2026', PAD, 136);
  ctx.fillStyle = '#8AA396';
  ctx.font = '27px Arial, sans-serif';
  ctx.fillText('CLASSIFICAÇÕES', PAD, 176);
  ctx.fillStyle = catColor;
  ctx.font = 'bold 35px Arial, sans-serif';
  ctx.fillText(labelTxt, PAD, 218);

  // Divider
  ctx.fillStyle = '#1C2620'; ctx.fillRect(PAD, 230, W - PAD * 2, 2);

  // Logo (top-right)
  if (logoImg) {
    const LOGO_SZ = 100, LOGO_X = W - PAD - 100, LOGO_Y = 22;
    ctx.save();
    ctx.beginPath();
    ctx.arc(LOGO_X + LOGO_SZ / 2, LOGO_Y + LOGO_SZ / 2, LOGO_SZ / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logoImg, LOGO_X, LOGO_Y, LOGO_SZ, LOGO_SZ);
    ctx.restore();
  }
  let curY = HEAD_H;
  cardRows.forEach(row => {
    const maxCH = Math.max(...row.map(cardHeight));
    row.forEach((g, col) => {
      const cx = PAD + col * (CARD_W + COL_GAP);
      const cy = curY;
      const ch = cardHeight(g);
      const gc = CAT_CLR[g.id.split('-')[0]] || catColor;

      // Card background
      ctx.fillStyle = '#111815';
      ctx.beginPath(); ctx.roundRect(cx, cy, CARD_W, ch, 8); ctx.fill();
      ctx.strokeStyle = '#1C2620'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(cx, cy, CARD_W, ch, 8); ctx.stroke();

      // Card header
      ctx.fillStyle = gc + '30';
      ctx.beginPath(); ctx.roundRect(cx, cy, CARD_W, CARD_HEAD_H, [8, 8, 0, 0]); ctx.fill();
      ctx.fillStyle = gc; ctx.fillRect(cx, cy + CARD_HEAD_H - 2, CARD_W, 2);

      ctx.fillStyle = gc; ctx.font = 'bold 22px Arial, sans-serif';
      ctx.fillText(g.id, cx + CP, cy + CARD_HEAD_H * 0.68);
      ctx.fillStyle = '#4A6058'; ctx.font = '15px Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${g.done}/${g.total} jogos`, cx + CARD_W - CP, cy + CARD_HEAD_H * 0.68);
      ctx.textAlign = 'left';

      // Column headers
      const colH = cy + CARD_HEAD_H + COL_HEAD_H * 0.80;
      const rx = {
        rank: cx + CP,
        par:  cx + CP + 28,
        pj:   cx + CARD_W - CP - 200,
        v:    cx + CARD_W - CP - 154,
        d:    cx + CARD_W - CP - 112,
        sets: cx + CARD_W - CP - 74,
        pts:  cx + CARD_W - CP,
      };
      ctx.fillStyle = '#4A6058'; ctx.font = 'bold 13px Arial, sans-serif';
      ctx.fillText('#',   rx.rank, colH);
      ctx.fillText('PAR', rx.par,  colH);
      ctx.textAlign = 'center';
      ctx.fillText('PJ', rx.pj,   colH);
      ctx.fillText('V',  rx.v,    colH);
      ctx.fillText('D',  rx.d,    colH);
      ctx.fillText('S',  rx.sets, colH);
      ctx.textAlign = 'right';
      ctx.fillText('PTS', rx.pts, colH);
      ctx.textAlign = 'left';

      // Team rows
      g.rows.forEach((r, ri) => {
        const ry = cy + CARD_HEAD_H + COL_HEAD_H + ri * ROW_H;
        if (ri === 0) { ctx.fillStyle = 'rgba(57,255,143,0.08)'; ctx.fillRect(cx, ry, CARD_W, ROW_H); }
        else if (ri === 1) { ctx.fillStyle = 'rgba(57,255,143,0.04)'; ctx.fillRect(cx, ry, CARD_W, ROW_H); }
        else if (ri % 2 === 0) { ctx.fillStyle = 'rgba(255,255,255,0.02)'; ctx.fillRect(cx, ry, CARD_W, ROW_H); }

        const rcy = ry + ROW_H * 0.68;
        ctx.fillStyle = ri === 0 ? '#39FF8F' : ri === 1 ? '#8AA396' : '#4A6058';
        ctx.font = 'bold 15px Arial, sans-serif';
        ctx.fillText(`${ri + 1}`, rx.rank, rcy);

        ctx.fillStyle = ri === 0 ? '#F0F7F3' : '#C4D4CC';
        ctx.font = '15px Arial, sans-serif';
        ctx.fillText(cTrunc(r.par, rx.pj - rx.par - 8), rx.par, rcy);

        ctx.fillStyle = '#8AA396'; ctx.textAlign = 'center';
        ctx.fillText(r.pj, rx.pj, rcy);
        ctx.fillStyle = r.v > 0 ? '#39FF8F' : '#8AA396';
        ctx.fillText(r.v, rx.v, rcy);
        ctx.fillStyle = r.d > 0 ? '#FF4A4A' : '#8AA396';
        ctx.fillText(r.d, rx.d, rcy);
        ctx.fillStyle = '#8AA396'; ctx.font = '14px Arial, sans-serif';
        ctx.fillText(`${r.sv}-${r.sl}`, rx.sets, rcy);
        ctx.fillStyle = '#F0F7F3'; ctx.font = 'bold 16px Arial, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(r.pts, rx.pts, rcy);
        ctx.textAlign = 'left';
      });
    });
    curY += maxCH + ROW_GAP;
  });

  // Footer
  ctx.fillStyle = '#111815'; ctx.fillRect(0, H - FOOT_H, W, FOOT_H);
  ctx.fillStyle = '#1C2620'; ctx.fillRect(0, H - FOOT_H, W, 1);
  ctx.fillStyle = '#4A6058'; ctx.font = '20px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Play Padel  \u00B7  Torneio Aniversário 2026', W / 2, H - FOOT_H + 42);
  ctx.textAlign = 'left';

  _panfletoShare(canvas, filename);
  } // end draw()

  const logo = new Image();
  logo.onload  = () => draw(logo);
  logo.onerror = () => draw(null);
  logo.src = 'playpadellogo.jpg';
};

// ============================================
//  PANFLETO CAMPEÕES
// ============================================
window.gerarPanfletoCampeoes = function() {
  const ff   = ppLoad('fasefinal') || {};
  const CATS = ['M1', 'M2', 'F1', 'F2', 'M3', 'M4', 'M5'];
  const CAT_CLR = { M1:'#4A9EFF', M2:'#00C37B', M3:'#39FF8F', M4:'#F5C518', M5:'#FF9A3C', F1:'#FF6BB0', F2:'#C97BFF' };

  const champions = [];
  CATS.forEach(cat => {
    const catData = ff[cat];
    if (!catData?.generated) return;
    const final = catData.jogos.find(j => j.fase === 'F');
    if (!final || !final.resultado) return;
    const w = ffGetWinner(final.resultado);
    const name  = w === 1 ? final.eq1      : final.eq2;
    const grupo = w === 1 ? final.eq1grupo : final.eq2grupo;
    if (name) champions.push({ cat, name, grupo });
  });

  if (!champions.length) return toast('Sem campeões definidos ainda.', 'error');

  const W = 1080, PAD = 50;
  const HEAD_H = 210, ROW_H = 140, FOOT_H = 64;
  const H = HEAD_H + champions.length * ROW_H + FOOT_H;

  function draw(logoImg) {
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    const LOGO_SZ = 88, LOGO_X = PAD, LOGO_Y = 18;
    const TEXT_X = logoImg ? PAD + LOGO_SZ + 14 : PAD;

    // Background
    ctx.fillStyle = '#0A0F0D'; ctx.fillRect(0, 0, W, H);

    // Top bar (gold gradient)
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, '#F5C518'); grad.addColorStop(0.5, '#00C37B'); grad.addColorStop(1, '#F5C518');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, 10);

    // Logo (circular)
    if (logoImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(LOGO_X + LOGO_SZ / 2, LOGO_Y + LOGO_SZ / 2, LOGO_SZ / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(logoImg, LOGO_X, LOGO_Y, LOGO_SZ, LOGO_SZ);
      ctx.restore();
    }

    // Header
    ctx.fillStyle = '#00C37B';
    ctx.font = 'bold 52px Arial, sans-serif';
    ctx.fillText('PLAY PADEL', TEXT_X, 72);
    ctx.fillStyle = '#F0F7F3';
    ctx.font = '30px Arial, sans-serif';
    ctx.fillText('TORNEIO ANIVERSÁRIO 2026', TEXT_X, 112);
    ctx.fillStyle = '#F5C518';
    ctx.font = 'bold 28px Arial, sans-serif';
    ctx.fillText('🏆  CAMPEÕES', TEXT_X, 155);
    ctx.fillStyle = 'rgba(245,197,24,.3)'; ctx.fillRect(PAD, 172, W - PAD * 2, 1);

  // Champion rows
  champions.forEach((c, i) => {
    const y = HEAD_H + i * ROW_H;
    const cc = CAT_CLR[c.cat] || '#8AA396';

    ctx.fillStyle = i % 2 === 0 ? '#111815' : '#0D1410';
    ctx.fillRect(0, y, W, ROW_H);
    // Left accent
    ctx.fillStyle = cc; ctx.fillRect(0, y + 1, 8, ROW_H - 2);

    // Category pill
    const pillW = 90, pillH = 42, pillX = PAD + 10, pillY = y + (ROW_H - pillH) / 2;
    ctx.fillStyle = cc + '28';
    ctx.beginPath(); ctx.roundRect(pillX, pillY, pillW, pillH, 8); ctx.fill();
    ctx.fillStyle = cc;
    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(c.cat, pillX + pillW / 2, pillY + pillH * 0.70);
    ctx.textAlign = 'left';

    // Trophy
    ctx.font = '42px Arial, sans-serif';
    ctx.fillText('🏆', PAD + 120, y + ROW_H / 2 + 16);

    // Champion name (two lines if pair)
    const parts = c.name.split(' & ');
    ctx.font = 'bold 28px Arial, sans-serif';
    if (parts.length === 2) {
      ctx.fillStyle = '#F5C518';
      ctx.fillText(parts[0], PAD + 192, y + ROW_H * 0.38);
      ctx.fillStyle = '#F0F7F3';
      ctx.fillText(parts[1], PAD + 192, y + ROW_H * 0.72);
    } else {
      ctx.fillStyle = '#F5C518';
      ctx.fillText(c.name, PAD + 192, y + ROW_H / 2 + 10);
    }

    // Group badge (right side)
    if (c.grupo) {
      const gW = 82, gH = 30, gX = W - PAD - gW, gY = y + (ROW_H - gH) / 2;
      ctx.fillStyle = cc + '28';
      ctx.beginPath(); ctx.roundRect(gX, gY, gW, gH, 6); ctx.fill();
      ctx.fillStyle = cc;
      ctx.font = 'bold 14px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(c.grupo, gX + gW / 2, gY + gH * 0.72);
      ctx.textAlign = 'left';
    }
  });

  // Footer
  const fy = H - FOOT_H;
  ctx.fillStyle = '#111815'; ctx.fillRect(0, fy, W, FOOT_H);
  ctx.fillStyle = 'rgba(245,197,24,.2)'; ctx.fillRect(0, fy, W, 1);
    ctx.fillStyle = '#4A6058'; ctx.font = '17px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Play Padel  ·  Torneio Aniversário 2026', W / 2, fy + 38);
    ctx.textAlign = 'left';

    _panfletoShare(canvas, 'campeoes.png');
  }

  const logo = new Image();
  logo.onload = () => draw(logo);
  logo.onerror = () => draw(null);
  logo.src = 'playpadellogo.jpg';
};

// ============================================
//  ESTATISTICAS (player leaderboard)
// ============================================
function renderEstatisticas() {
  const el = document.getElementById('statsContent');
  if (!el) return;
  const jogos = getAllJogosNormalized().filter(j => j.resultado);

  // Aggregate per pair
  const stats = {};
  function addPair(par, wins, losses, sw, sl) {
    if (!par) return;
    if (!stats[par]) stats[par] = { par, pj:0, v:0, d:0, sw:0, sl:0 };
    stats[par].pj += wins + losses;
    stats[par].v  += wins;
    stats[par].d  += losses;
    stats[par].sw += sw;
    stats[par].sl += sl;
  }

  jogos.forEach(j => {
    const r = j.resultado;
    const allSets = [[r.s1eq1,r.s1eq2],[r.s2eq1,r.s2eq2],[r.s3eq1,r.s3eq2]].filter(([a]) => a != null);
    let vEq1=0, vEq2=0, sw1=0, sl1=0, sw2=0, sl2=0;
    allSets.forEach(([a,b]) => {
      if (a>b) vEq1++; else vEq2++;
      sw1+=a; sl1+=b; sw2+=b; sl2+=a;
    });
    const eq1win = vEq1 > vEq2;
    addPair(j.eq1, eq1win?1:0, eq1win?0:1, sw1, sl1);
    addPair(j.eq2, eq1win?0:1, eq1win?1:0, sw2, sl2);
  });

  const sorted = Object.values(stats)
    .filter(s => s.pj > 0)
    .sort((a,b) => b.v - a.v || a.d - b.d || (b.sw - b.sl) - (a.sw - a.sl));

  if (!sorted.length) { el.innerHTML = `<p style="color:var(--cinza-texto);padding:1.5rem">Nenhum jogo com resultado ainda.</p>`; return; }

  el.innerHTML = `
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>#</th><th>Par</th><th>PJ</th><th>V</th><th>D</th><th>Taxa V%</th><th>Jogos</th></tr></thead>
        <tbody>${sorted.map((s, i) => {
          const pct = s.pj ? Math.round(s.v/s.pj*100) : 0;
          const bar = `<div style="display:inline-block;width:${pct}%;max-width:80px;height:5px;background:var(--verde);border-radius:3px;vertical-align:middle;margin-left:.4rem"></div>`;
          return `<tr>
            <td>${i+1}</td>
            <td style="font-weight:600;color:var(--branco)">${s.par.split(' & ').map((p,i) => `<span style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px${i?';color:var(--cinza-texto);font-weight:400':''}">${escHtml(p)}</span>`).join('')}</td>
            <td>${s.pj}</td>
            <td style="color:var(--verde);font-weight:700">${s.v}</td>
            <td style="color:var(--vermelho)">${s.d}</td>
            <td>${pct}%${bar}</td>
            <td>${s.sw}-${s.sl}</td>
          </tr>`;
        }).join('')}
        </tbody>
      </table>
    </div>`;
}

// ============================================
//  IMPORTAR (bulk CSV result import)
// ============================================
function renderImportar() {
  const el = document.getElementById('importContent');
  if (!el) return;
  el.innerHTML = `
    <div class="section-card" style="max-width:800px">
      <h3 style="margin-bottom:.25rem">Importação em Lote</h3>
      <p style="color:var(--cinza-texto);font-size:.82rem;margin-bottom:1rem">
        Cole resultados no formato CSV: <code style="background:var(--cinza-escuro);padding:.1rem .4rem;border-radius:4px;font-size:.78rem">jogoId,set1eq1-set1eq2,set2eq1-set2eq2[,set3eq1-set3eq2]</code>
      </p>
      <div class="import-area">
        <textarea id="importCSV" placeholder="Exemplo:&#10;1,6-4,6-3&#10;2,3-6,4-6&#10;5,6-2,6-1&#10;12,7-5,4-6,6-4"></textarea>
      </div>
      <div style="display:flex;gap:.75rem;margin-bottom:1rem">
        <button class="btn btn-primary btn-sm" onclick="_importPreview()"><i class="ph ph-eye"></i> Pré-visualizar</button>
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('importCSV').value=''">Limpar</button>
      </div>
      <div id="importPreviewWrap"></div>
    </div>`;
}

function _importPreview() {
  const raw = document.getElementById('importCSV')?.value.trim();
  if (!raw) return;
  const jogos = getData('jogos');
  const lines = raw.split('\n').filter(l => l.trim());
  const rows = lines.map(line => {
    const parts = line.trim().split(',');
    const id = parseInt(parts[0]);
    const sets = parts.slice(1).join(' ').trim();
    const jogo = jogos.find(j => j.id === id);
    const ok = !!jogo && sets.match(/^\d+-\d+( \d+-\d+)*$/);
    return { id, sets, jogo, ok, dup: jogo?.resultado };
  });

  const wrap = document.getElementById('importPreviewWrap');
  wrap.innerHTML = `
    <div class="import-preview" style="margin-bottom:1rem">
      <table class="data-table" style="font-size:.78rem">
        <thead><tr><th>ID</th><th>Par 1</th><th>Par 2</th><th>Resultado</th><th>Estado</th></tr></thead>
        <tbody>${rows.map(r => `<tr>
          <td>${r.id}</td>
          <td>${r.jogo ? escHtml(r.jogo.eq1) : '-'}</td>
          <td>${r.jogo ? escHtml(r.jogo.eq2) : '-'}</td>
          <td><code>${escHtml(r.sets)}</code></td>
          <td>${!r.jogo ? '<span class="badge badge-vermelho">Não encontrado</span>' :
               !r.ok    ? '<span class="badge badge-vermelho">Formato inválido</span>' :
               r.dup    ? '<span class="badge badge-amarelo">Substituir</span>' :
                          '<span class="badge badge-verde">OK</span>'}</td>
        </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div style="display:flex;gap:.75rem;align-items:center">
      <button class="btn btn-primary btn-sm" onclick="_importConfirm()">
        <i class="ph ph-check"></i> Confirmar Importação (${rows.filter(r=>r.ok).length} válidos)
      </button>
      <span style="font-size:.78rem;color:var(--cinza-texto)">${rows.filter(r=>!r.ok).length} inválidos serão ignorados</span>
    </div>`;

  // Store parsed for confirm
  wrap._parsed = rows;
}

function _importConfirm() {
  const wrap = document.getElementById('importPreviewWrap');
  if (!wrap._parsed) return;
  const jogos = getData('jogos');
  let count = 0;
  wrap._parsed.filter(r => r.ok).forEach(r => {
    const idx = jogos.findIndex(j => j.id === r.id);
    if (idx < 0) return;
    jogos[idx].resultado = r.sets;
    count++;
  });
  setData('jogos', jogos);
  Auth.log('IMPORT_BULK', `${count} resultados importados em lote`);
  toast(`${count} resultados importados com sucesso.`);
  renderImportar();
}

// ============================================
//  HORÁRIO BUILDER
// ============================================
function renderHorario() {
  const el = document.getElementById('horarioContent');
  if (!el) return;

  const jogos  = getData('jogos');
  const campos = getData('campos').sort((a,b) => (a.id||0)-(b.id||0)).map(c => c.nome);
  const ffData = ffLoad();
  const ffJogos = Object.entries(ffData).flatMap(([catId, catData]) =>
    (catData?.jogos || []).filter(j => j.data).map(j => ({
      ...j,
      grupo: `${catId} ${j.fase}${j.num}`,
      campo: j.campo || 'Fase Final',
      _isFaseFinal: true,
    }))
  );
  const allJogos = [...jogos, ...ffJogos];

  // Repopulate filters on every render, preserving current selection
  const dataFilter  = document.getElementById('horarioDataFilter');
  const campoFilter = document.getElementById('horarioCampoFilter');
  if (dataFilter) {
    const saved = dataFilter.value;
    const dates = [...new Set(allJogos.map(j => j.data).filter(Boolean))].sort();
    dataFilter.innerHTML = dates.map(d => `<option value="${d}">${formatDate(d)}</option>`).join('');
    if (saved) dataFilter.value = saved;
  }
  if (campoFilter) {
    const saved = campoFilter.value;
    const ffCampo = ffJogos.length ? ['Fase Final'] : [];
    campoFilter.innerHTML = '<option value="">Todos os campos</option>' +
      [...campos, ...ffCampo].map(c => `<option value="${c}">${c}</option>`).join('');
    if (saved) campoFilter.value = saved;
  }

  const selDate  = dataFilter?.value;
  const selCampo = campoFilter?.value || '';
  if (!selDate) return el.innerHTML = `<p style="color:var(--cinza-texto);padding:1rem">Sem jogos com data atribuída.</p>`;

  const dayJogos = allJogos.filter(j => j.data === selDate && (!selCampo || j.campo === selCampo));
  if (!dayJogos.length) return el.innerHTML = `<p style="color:var(--cinza-texto);padding:1rem">Sem jogos para os filtros seleccionados.</p>`;

  // Determine dominant minute offset (majority vote) — prevents 1 outlier game from
  // adding a whole second series of slots (e.g. one :00 game on a :30 day).
  const minuteCounts = {};
  dayJogos.forEach(j => {
    if (!j.hora) return;
    const min = j.hora.split(':')[1];
    minuteCounts[min] = (minuteCounts[min] || 0) + 1;
  });
  const dominantMin = Object.entries(minuteCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '00';
  const CLUB_SLOTS = [];
  for (let h = 6; h <= 23; h++) {
    const slot = `${String(h).padStart(2,'0')}:${dominantMin}`;
    if (slot <= '23:30') CLUB_SLOTS.push(slot);
  }
  // Always include actual game times (even if they don't match dominant minute)
  const times = [...new Set([...CLUB_SLOTS, ...dayJogos.map(j => j.hora).filter(Boolean)])].sort();
  const campoOrder = Object.fromEntries(getData('campos').map((c,i) => [c.nome, c.id ?? i]));
  const activeCampos = selCampo ? [selCampo] : [...new Set(dayJogos.map(j => j.campo))].sort((a,b) => (campoOrder[a]??99) - (campoOrder[b]??99));

  // Build player slots map to detect conflicts — any player with 2+ games on the same day
  const playerSlots = {};
  dayJogos.forEach(j => {
    [j.eq1, j.eq2].forEach(pair => {
      if (!pair) return;
      pair.split(' & ').forEach(player => {
        const key = player.trim().toLowerCase();
        if (!playerSlots[key]) playerSlots[key] = [];
        playerSlots[key].push(j.hora || '?');
      });
    });
  });
  // Flag any player who appears in more than 1 game (same-time OR different-time)
  const conflictPlayers = new Set(Object.entries(playerSlots)
    .filter(([,slots]) => slots.length > 1)
    .map(([k]) => k));

  // Back-to-back: player with games in consecutive hours (≤ 60 min apart)
  const backToBackPlayers = new Set(Object.entries(playerSlots)
    .filter(([,slots]) => {
      if (slots.length < 2) return false;
      const sorted = [...new Set(slots)].sort();
      for (let i = 0; i < sorted.length - 1; i++) {
        const [h1,m1] = sorted[i].split(':').map(Number);
        const [h2,m2] = sorted[i+1].split(':').map(Number);
        if ((h2*60+m2) - (h1*60+m1) <= 60) return true;
      }
      return false;
    })
    .map(([k]) => k));

  // Campo double-booked: same court + same hour → more than 1 game
  const campoSlotMap = {};
  dayJogos.forEach(j => {
    if (!j.hora || !j.campo) return;
    const key = `${j.campo}|${j.hora}`;
    campoSlotMap[key] = (campoSlotMap[key] || 0) + 1;
  });
  const campoConflicts = new Set(Object.entries(campoSlotMap).filter(([,n]) => n > 1).map(([k]) => k));

  // Games with missing campo or hora
  const incompleteJogos = dayJogos.filter(j => !j._isFaseFinal && (!j.campo || !j.hora));

  function hasConflict(j) {
    return [j.eq1, j.eq2].some(pair => pair?.split(' & ').some(p => conflictPlayers.has(p.trim().toLowerCase())))
      || (j.hora && j.campo && campoConflicts.has(`${j.campo}|${j.hora}`));
  }
  function hasBackToBack(j) {
    return [j.eq1, j.eq2].some(pair => pair?.split(' & ').some(p => backToBackPlayers.has(p.trim().toLowerCase())));
  }

  // Helper: resolve display name from key
  function playerDisplayName(k) {
    let name = k;
    dayJogos.forEach(j => [j.eq1, j.eq2].forEach(pair => { if (pair) pair.split(' & ').forEach(p => { if (p.trim().toLowerCase() === k) name = p.trim(); }); }));
    return name;
  }

  // Build conflict summary banner sections
  const bannerParts = [];

  if (conflictPlayers.size > 0) {
    const items = [...conflictPlayers].map(k => {
      const slots = playerSlots[k];
      return `<span style="font-weight:700;color:var(--branco)">${escHtml(playerDisplayName(k))}</span> (${slots.join(', ')})`;
    });
    bannerParts.push({ color: '#FF4A4A', icon: 'ph-warning', title: '⚠ Jogador com 2+ jogos no mesmo dia', items });
  }

  if (backToBackPlayers.size > 0) {
    const items = [...backToBackPlayers].map(k => {
      const sorted = [...new Set(playerSlots[k])].sort();
      return `<span style="font-weight:700;color:var(--branco)">${escHtml(playerDisplayName(k))}</span> (${sorted.join(' → ')})`;
    });
    bannerParts.push({ color: '#FF9A3C', icon: 'ph-clock-countdown', title: '⏱ Jogos consecutivos (≤1h de descanso)', items });
  }

  if (campoConflicts.size > 0) {
    const items = [...campoConflicts].map(k => {
      const [campo, hora] = k.split('|');
      return `<span style="font-weight:700;color:var(--branco)">${escHtml(campo)}</span> às ${hora}`;
    });
    bannerParts.push({ color: '#FF4A4A', icon: 'ph-warning-diamond', title: '🏟 Campo duplamente reservado', items });
  }

  if (incompleteJogos.length > 0) {
    const items = incompleteJogos.map(j => `<span style="font-weight:700;color:var(--branco)">#${j.id} ${escHtml(j.grupo)}</span> sem ${!j.hora?'hora':''}${!j.hora&&!j.campo?' e ':''}${!j.campo?'campo':''}`);
    bannerParts.push({ color: '#F5C518', icon: 'ph-clock', title: '📋 Jogos sem campo/hora', items });
  }

  const conflictSummary = bannerParts.length > 0
    ? bannerParts.map(b => `<div style="background:${b.color}18;border:1px solid ${b.color}55;border-radius:8px;padding:.65rem 1rem;margin-bottom:.6rem;font-size:.82rem;color:${b.color};display:flex;align-items:flex-start;gap:.6rem">
        <i class="ph ${b.icon}" style="font-size:1.1rem;flex-shrink:0;margin-top:.05rem"></i>
        <div><strong>${b.title}:</strong>&nbsp; ${b.items.join(' &nbsp;·&nbsp; ')}</div>
      </div>`).join('')
    : '';

  el.innerHTML = conflictSummary + `
    <div class="schedule-grid" style="grid-template-columns:80px ${activeCampos.map(()=>'1fr').join(' ')}">
      <div class="schedule-grid-header">Hora</div>
      ${activeCampos.map(c => `<div class="schedule-grid-header">${c}</div>`).join('')}
      ${times.map(t => `
        <div class="schedule-time" style="display:flex;align-items:center;padding:.4rem .6rem;font-weight:700;color:var(--cinza-texto)">${t}</div>
        ${activeCampos.map(campo => {
          const j = dayJogos.find(x => x.hora === t && x.campo === campo);
          const slotAttr = `ondragover="horarioDragOver(event)" ondragleave="horarioDragLeave(event)" ondrop="horarioDrop(event,'${t}','${escHtml(campo)}')"`;
          if (!j) return `<div class="schedule-slot" ${slotAttr}></div>`;
          const conflict = hasConflict(j);
          const btb = !conflict && hasBackToBack(j);
          const conflictTip = conflict ? (() => {
            const offenders = [j.eq1, j.eq2].flatMap(pair => (pair||'').split(' & ').filter(p => conflictPlayers.has(p.trim().toLowerCase())));
            return offenders.map(p => `${escHtml(p.trim())}: ${playerSlots[p.trim().toLowerCase()].join(', ')}`).join(' | ');
          })() : (btb ? (() => {
            const offenders = [j.eq1, j.eq2].flatMap(pair => (pair||'').split(' & ').filter(p => backToBackPlayers.has(p.trim().toLowerCase())));
            return 'Jogo consecutivo: ' + offenders.map(p => `${escHtml(p.trim())} (${[...new Set(playerSlots[p.trim().toLowerCase()])].sort().join(' → ')})`).join(' | ');
          })() : '');
          const conflictClass = conflict ? ' has-conflict' : btb ? ' has-btb' : '';
          const e1 = j.eq1 || 'A definir';
          const e2 = j.eq2 || 'A definir';
          const dragAttr = j._isFaseFinal ? '' : `draggable="true" ondragstart="horarioStartDrag(event,'${j.id}')" ondragend="horarioDragEnd(event)"`;
          const moverBtn = j._isFaseFinal ? '' : `<button onclick="event.stopPropagation();horarioMoverDia('${j.id}')" style="margin-top:.35rem;width:100%;background:transparent;border:1px solid var(--preto-borda);border-radius:4px;color:var(--cinza-texto);font-size:.62rem;padding:.15rem .3rem;cursor:pointer;text-align:center" title="Mover para outro dia">↗ outro dia</button>`;
          return `<div class="schedule-slot has-game${j.resultado?' has-result':''}${conflictClass}" ${dragAttr} ${slotAttr}>
            ${conflict ? `<span class="conflict-badge" title="${conflictTip}">⚠ CONFLITO</span>` : btb ? `<span class="conflict-badge" style="background:#FF9A3C" title="${conflictTip}">⏱ SEGUIDO</span>` : ''}
            <div style="font-size:.7rem;color:var(--cinza-texto);margin-bottom:.2rem;display:flex;justify-content:space-between;align-items:center">
              <span>${j.grupo} <span style="color:var(--verde);font-weight:700">${t}</span></span>
              ${j._isFaseFinal ? '' : `<span style="font-family:monospace;font-size:.62rem;color:var(--cinza-texto);opacity:.7">#${j.id}</span>`}
            </div>
            <div style="display:flex;align-items:center;gap:.3rem;font-size:.75rem;font-weight:600;color:var(--branco);line-height:1.4">
              <div style="flex:1;text-align:right">${e1.split(' & ').map(escHtml).join('<br>')}</div>
              <div style="color:var(--cinza-texto);font-size:.65rem;flex-shrink:0">vs</div>
              <div style="flex:1">${e2.split(' & ').map(escHtml).join('<br>')}</div>
            </div>
            ${j.resultado ? (() => { if (j.resultado.wo) return `<div style="font-size:.68rem;color:var(--vermelho);margin-top:.2rem;font-weight:700">W.O.</div>`; const {w1,w2} = matchSetsScore(j.resultado); return `<div style="font-size:.68rem;color:var(--verde);margin-top:.2rem">${w1}–${w2} sets</div>`; })() : ''}
            ${moverBtn}
          </div>`;
        }).join('')}
      `).join('')}
    </div>`;
}

// ── Horário drag-and-drop handlers ───────────────────────────
window.horarioStartDrag = function(ev, jogoId) {
  APP._dragJogoId = String(jogoId);
  ev.dataTransfer.effectAllowed = 'move';
  ev.dataTransfer.setData('text/plain', String(jogoId));
  // Mark source slot as dragging after a tick so it renders first
  requestAnimationFrame(() => ev.target.closest('.schedule-slot')?.classList.add('is-dragging'));
};

window.horarioDragEnd = function(ev) {
  ev.target.closest('.schedule-slot')?.classList.remove('is-dragging');
  APP._dragJogoId = null;
};

window.horarioDragOver = function(ev) {
  if (!APP._dragJogoId) return;
  ev.preventDefault();
  ev.dataTransfer.dropEffect = 'move';
  const slot = ev.currentTarget;
  // Show swap highlight if occupied by a different game, green if empty
  if (slot.classList.contains('has-game')) {
    slot.classList.add('drag-over-swap');
  } else {
    slot.classList.add('drag-over');
  }
};

window.horarioDragLeave = function(ev) {
  ev.currentTarget.classList.remove('drag-over', 'drag-over-swap');
};

window.horarioDrop = function(ev, hora, campo) {
  ev.preventDefault();
  const slot = ev.currentTarget;
  slot.classList.remove('drag-over', 'drag-over-swap');

  const jogoId = APP._dragJogoId;
  APP._dragJogoId = null;
  if (!jogoId) return;

  const selDate = document.getElementById('horarioDataFilter')?.value;
  const jogos = getData('jogos');
  const idx = jogos.findIndex(j => String(j.id) === jogoId);
  if (idx < 0) return;

  const oldHora  = jogos[idx].hora;
  const oldCampo = jogos[idx].campo;

  // If dropping onto itself, do nothing
  if (oldHora === hora && oldCampo === campo) return;

  // Check if target slot has a game — if so, swap
  const targetIdx = jogos.findIndex(j =>
    j.data === selDate && j.hora === hora && j.campo === campo && String(j.id) !== jogoId
  );
  if (targetIdx >= 0) {
    jogos[targetIdx].hora  = oldHora;
    jogos[targetIdx].campo = oldCampo;
    toast(`Jogos trocados: ${hora} · ${campo} ↔ ${oldHora} · ${oldCampo}`);
  } else {
    toast(`Jogo movido para ${hora} · ${campo}`);
  }

  jogos[idx].hora  = hora;
  jogos[idx].campo = campo;
  setData('jogos', jogos);
  Auth.log('HORARIO_DRAG', 'jogos', `Jogo #${jogoId} movido para ${hora} @ ${campo}`);
  renderHorario();
};

// ── Construtor de Grupos ──────────────────────────────────────
function renderConstrutorGrupos() {
  const el = document.getElementById('construtorGruposContent');
  const catSel = document.getElementById('cgFiltroCategoria');
  if (!el) return;

  const cats   = getData('categorias') || [];
  const grupos = getData('grupos')     || [];
  const duplas = getData('duplas')     || [];

  // Populate category filter
  if (catSel) {
    const saved = catSel.value;
    catSel.innerHTML = cats.map(c => `<option value="${c.id}">${c.id} — ${c.nome}</option>`).join('');
    if (saved && cats.find(c => c.id === saved)) catSel.value = saved;
  }
  const catId = catSel?.value || cats[0]?.id;
  if (!catId) { el.innerHTML = `<p style="color:var(--cinza-texto);padding:1rem">Sem categorias.</p>`; return; }

  const catGrupos = grupos.filter(g => g.cat === catId).sort((a,b) => a.letra.localeCompare(b.letra));

  // Duplas for this cat — both assigned and unassigned
  const catDuplas = duplas.filter(d => {
    // A dupla belongs to cat if its grupo starts with catId or if j1/j2 players have catId
    return d.grupo && d.grupo.startsWith(catId + '-');
  });
  const assignedIds = new Set(catDuplas.map(d => d.id));

  // All duplas for this cat (regardless of group assignment) — look at jogadores' cat
  const jogadores = getData('jogadores') || [];
  const allCatDuplas = duplas.filter(d => {
    if (!d.j1 || !d.j2) return false;
    // Check if already in a group of this cat
    if (d.grupo && d.grupo.startsWith(catId + '-')) return true;
    // Otherwise not in this cat
    return false;
  });

  function duplaLabel(d) {
    const j1 = jogadores.find(j => j.id === d.j1);
    const j2 = jogadores.find(j => j.id === d.j2);
    return `${j1?.nome || d.j1} & ${j2?.nome || d.j2}`;
  }

  // Count duplas per group
  const grupoCount = {};
  catGrupos.forEach(g => { grupoCount[g.id] = duplas.filter(d => d.grupo === g.id).length; });

  el.innerHTML = `
    <div style="display:flex;gap:1rem;align-items:center;margin-bottom:1rem;flex-wrap:wrap">
      <div style="display:flex;gap:.5rem;align-items:center">
        <label style="color:var(--cinza-texto);font-size:.82rem">Nº grupos:</label>
        <input id="cgNumGrupos" type="number" min="1" max="16" value="${catGrupos.length || 1}"
          class="form-input" style="width:70px;padding:.3rem .5rem"/>
        <button class="btn btn-ghost btn-sm" onclick="cgDefinirGrupos()">
          <i class="ph ph-arrows-clockwise"></i> Actualizar grupos
        </button>
      </div>
      <button class="btn btn-ghost btn-sm" style="color:var(--amarelo);border-color:rgba(245,197,24,.3)"
        onclick="cgAutoDistribuir()">
        <i class="ph ph-magic-wand"></i> Auto-distribuir
      </button>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem">
      ${catGrupos.map(g => {
        const gDuplas = duplas.filter(d => d.grupo === g.id);
        return `<div class="admin-group-card" id="cgCard_${g.id}"
            ondragover="cgDragOver(event,'${g.id}')" ondragleave="cgDragLeave(event,'${g.id}')"
            ondrop="cgDrop(event,'${g.id}')">
          <div class="admin-group-card-header" style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-weight:700;color:var(--branco)">${g.id}</span>
            <span style="font-size:.68rem;color:var(--cinza-texto)">${gDuplas.length} duplas</span>
          </div>
          <div id="cgSlot_${g.id}" style="min-height:60px;padding:.5rem 0">
            ${gDuplas.map(d => `
              <div class="cg-dupla-chip" draggable="true"
                ondragstart="cgDragStart(event,'${d.id}')"
                style="display:flex;align-items:center;justify-content:space-between;
                  background:var(--cinza-escuro);border:1px solid var(--preto-borda);
                  border-radius:6px;padding:.35rem .6rem;margin-bottom:.35rem;cursor:grab;font-size:.78rem">
                <span style="color:var(--branco)">${escHtml(duplaLabel(d))}</span>
                <button onclick="cgRemoverDupla('${d.id}')" style="background:none;border:none;
                  color:var(--cinza-texto);cursor:pointer;font-size:.8rem;padding:0 .2rem"
                  title="Remover do grupo">✕</button>
              </div>`).join('')}
            ${gDuplas.length === 0 ? `<p style="color:var(--cinza-texto);font-size:.75rem;text-align:center;padding:.5rem 0">Arraste duplas para aqui</p>` : ''}
          </div>
        </div>`;
      }).join('')}
    </div>

    ${catGrupos.length === 0 ? `<p style="color:var(--cinza-texto);padding:1rem">Defina o número de grupos e clique "Actualizar grupos".</p>` : ''}
  `;
}

window.cgDefinirGrupos = function() {
  const catSel = document.getElementById('cgFiltroCategoria');
  const catId  = catSel?.value;
  if (!catId) return;
  const n = parseInt(document.getElementById('cgNumGrupos')?.value) || 1;
  const grupos = getData('grupos') || [];
  const letras = 'ABCDEFGHIJKLMNOP'.slice(0, n).split('');

  // Remove existing grupos for this cat, add new ones
  const other = grupos.filter(g => g.cat !== catId);
  const novo  = letras.map(l => ({ id: `${catId}-${l}`, cat: catId, letra: l }));
  setData('grupos', [...other, ...novo]);
  Auth.log('CONSTRUTOR_GRUPOS', 'grupos', `${catId}: definidos ${n} grupos`);
  renderConstrutorGrupos();
};

window.cgAutoDistribuir = function() {
  const catSel = document.getElementById('cgFiltroCategoria');
  const catId  = catSel?.value;
  if (!catId) return;
  const grupos = (getData('grupos') || []).filter(g => g.cat === catId).sort((a,b) => a.letra.localeCompare(b.letra));
  if (!grupos.length) return toast('Defina os grupos primeiro.', 'error');
  const duplas = getData('duplas') || [];
  const catDuplas = duplas.filter(d => d.grupo && d.grupo.startsWith(catId + '-'));
  if (!catDuplas.length) return toast('Sem duplas nesta categoria.', 'error');

  // Warn if games with results already exist
  const jogos = getData('jogos') || [];
  const comResultado = jogos.filter(j => j.grupo?.startsWith(catId + '-') && j.resultado).length;
  if (comResultado > 0) {
    const conf = prompt(`⚠ ATENÇÃO: Existem ${comResultado} jogo(s) com resultado registado para ${catId}.\nA auto-distribuição irá reorganizar as duplas e pode invalidar os jogos existentes.\n\nEscreva CONFIRMAR para continuar:`);
    if (conf?.trim().toUpperCase() !== 'CONFIRMAR') return toast('Operação cancelada.', 'error');
  } else if (!confirm(`Auto-distribuir todas as duplas de ${catId} pelos ${grupos.length} grupos?`)) return;

  // Distribute round-robin across groups
  const updated = duplas.map(d => {
    if (!d.grupo || !d.grupo.startsWith(catId + '-')) return d;
    return d; // keep existing assignment; auto-distribute only unassigned
  });
  // Re-assign all cat duplas evenly
  catDuplas.forEach((d, i) => {
    const g = grupos[i % grupos.length];
    const idx = updated.findIndex(x => x.id === d.id);
    if (idx >= 0) updated[idx] = { ...updated[idx], grupo: g.id };
  });
  setData('duplas', updated);
  Auth.log('CONSTRUTOR_GRUPOS', 'duplas', `${catId}: auto-distribuição em ${grupos.length} grupos`);
  toast(`Duplas distribuídas por ${grupos.length} grupos`);
  renderConstrutorGrupos();
};

window.cgRemoverDupla = function(duplaId) {
  // This doesn't delete the dupla — it just clears its group assignment
  const duplas = getData('duplas') || [];
  const idx = duplas.findIndex(d => d.id === duplaId);
  if (idx < 0) return;
  duplas[idx] = { ...duplas[idx], grupo: null };
  setData('duplas', duplas);
  renderConstrutorGrupos();
};

APP._cgDragId = null;
window.cgDragStart = function(ev, duplaId) {
  APP._cgDragId = duplaId;
  ev.dataTransfer.effectAllowed = 'move';
};
window.cgDragOver = function(ev, grupoId) {
  ev.preventDefault();
  document.getElementById('cgCard_' + grupoId)?.classList.add('drag-over');
};
window.cgDragLeave = function(ev, grupoId) {
  document.getElementById('cgCard_' + grupoId)?.classList.remove('drag-over');
};
window.cgDrop = function(ev, grupoId) {
  ev.preventDefault();
  document.getElementById('cgCard_' + grupoId)?.classList.remove('drag-over');
  const duplaId = APP._cgDragId;
  APP._cgDragId = null;
  if (!duplaId) return;
  const duplas = getData('duplas') || [];
  const idx = duplas.findIndex(d => d.id === duplaId);
  if (idx < 0) return;
  duplas[idx] = { ...duplas[idx], grupo: grupoId };
  setData('duplas', duplas);
  Auth.log('CONSTRUTOR_GRUPOS', 'duplas', `Dupla ${duplaId} movida para ${grupoId}`);
  renderConstrutorGrupos();
};

// ── Construtor de Jogos (round-robin) ────────────────────────
function renderConstrutorJogos() {
  const el = document.getElementById('construtorJogosContent');
  const catSel = document.getElementById('cjFiltroCategoria');
  if (!el) return;

  const cats   = getData('categorias') || [];
  const grupos = getData('grupos')     || [];
  const duplas = getData('duplas')     || [];
  const jogos  = getData('jogos')      || [];

  if (catSel) {
    const saved = catSel.value;
    catSel.innerHTML = cats.map(c => `<option value="${c.id}">${c.id} — ${c.nome}</option>`).join('');
    if (saved && cats.find(c => c.id === saved)) catSel.value = saved;
  }
  const catId = catSel?.value || cats[0]?.id;
  if (!catId) { el.innerHTML = `<p style="color:var(--cinza-texto);padding:1rem">Sem categorias.</p>`; return; }

  const catGrupos = grupos.filter(g => g.cat === catId).sort((a,b) => a.letra.localeCompare(b.letra));
  if (!catGrupos.length) {
    el.innerHTML = `<p style="color:var(--cinza-texto);padding:1rem">Sem grupos para ${catId}. Crie grupos no Construtor de Grupos primeiro.</p>`;
    return;
  }

  const jogadores = getData('jogadores') || [];
  function duplaLabel(d) {
    const j1 = jogadores.find(j => j.id === d.j1);
    const j2 = jogadores.find(j => j.id === d.j2);
    return `${j1?.nome || d.j1} & ${j2?.nome || d.j2}`;
  }

  // Preview: for each group, list the round-robin games that would be generated
  const preview = catGrupos.map(g => {
    const gDuplas = duplas.filter(d => d.grupo === g.id);
    const pairs = [];
    for (let i = 0; i < gDuplas.length; i++)
      for (let j = i + 1; j < gDuplas.length; j++)
        pairs.push([gDuplas[i], gDuplas[j]]);
    const existing = jogos.filter(j => j.grupo === g.id);
    return { grupo: g, duplas: gDuplas, pairs, existing };
  });

  const totalNovo   = preview.reduce((s, p) => s + p.pairs.length, 0);
  const totalExiste = preview.reduce((s, p) => s + p.existing.length, 0);

  el.innerHTML = `
    <div style="background:var(--cinza-escuro);border-radius:8px;padding:1rem;margin-bottom:1.25rem;display:flex;gap:1.5rem;flex-wrap:wrap;align-items:flex-start">
      <div style="flex:1;min-width:220px">
        <p style="color:var(--cinza-texto);font-size:.82rem;margin-bottom:.75rem">
          Serão gerados <strong style="color:var(--branco)">${totalNovo}</strong> jogos round-robin
          para os <strong style="color:var(--branco)">${catGrupos.length}</strong> grupos de <strong style="color:var(--verde)">${catId}</strong>.
          ${totalExiste > 0 ? `<br><span style="color:var(--amarelo)">⚠ Já existem ${totalExiste} jogos para este grupo — serão substituídos.</span>` : ''}
        </p>
        <div style="display:flex;gap:.6rem;flex-wrap:wrap;margin-bottom:.75rem">
          <div>
            <label style="color:var(--cinza-texto);font-size:.75rem;display:block;margin-bottom:.2rem">Data por omissão</label>
            <input id="cjDataOmissao" type="date" class="form-input" style="padding:.3rem .5rem;font-size:.82rem"/>
          </div>
          <div>
            <label style="color:var(--cinza-texto);font-size:.75rem;display:block;margin-bottom:.2rem">Hora por omissão</label>
            <input id="cjHoraOmissao" type="time" class="form-input" style="padding:.3rem .5rem;font-size:.82rem"/>
          </div>
        </div>
        <div style="display:flex;gap:.6rem">
          <button class="btn btn-primary" onclick="cjGerarJogos()">
            <i class="ph ph-play"></i> Gerar jogos
          </button>
          ${totalExiste > 0 ? `<button class="btn btn-ghost" style="color:var(--vermelho);border-color:rgba(255,74,74,.3)" onclick="cjLimparJogos('${catId}')">
            <i class="ph ph-trash"></i> Limpar jogos de ${catId}
          </button>` : ''}
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1rem">
      ${preview.map(({ grupo: g, duplas: gDuplas, pairs, existing }) => `
        <div class="admin-group-card">
          <div class="admin-group-card-header" style="display:flex;justify-content:space-between">
            <span style="font-weight:700;color:var(--branco)">${g.id}</span>
            <span style="font-size:.68rem;color:var(--cinza-texto)">${gDuplas.length} duplas · ${pairs.length} jogos</span>
          </div>
          ${gDuplas.length < 2 ? `<p style="color:var(--amarelo);font-size:.75rem;padding:.5rem">Mínimo 2 duplas para gerar jogos.</p>` : ''}
          <div style="padding:.5rem 0">
            ${pairs.map(([d1, d2], i) => `
              <div style="display:flex;align-items:center;gap:.4rem;padding:.25rem 0;font-size:.75rem;
                border-bottom:1px solid var(--preto-borda);color:var(--cinza-texto)">
                <span style="min-width:14px;text-align:right;color:var(--cinza-texto);opacity:.5">${i+1}</span>
                <span style="flex:1;text-align:right;color:var(--branco)">${escHtml(duplaLabel(d1))}</span>
                <span style="color:var(--cinza-texto);font-size:.65rem;flex-shrink:0">vs</span>
                <span style="flex:1;color:var(--branco)">${escHtml(duplaLabel(d2))}</span>
              </div>`).join('')}
          </div>
        </div>`).join('')}
    </div>`;
}

window.cjGerarJogos = function() {
  const catId = document.getElementById('cjFiltroCategoria')?.value;
  if (!catId) return;

  // Count games with results
  const jogosExist = getData('jogos') || [];
  const comResultado = jogosExist.filter(j => j.grupo?.startsWith(catId + '-') && j.resultado).length;

  if (comResultado > 0) {
    const conf = prompt(`⚠ ATENÇÃO CRÍTICA: Existem ${comResultado} jogo(s) com resultado registado para ${catId}.\nGerar novos jogos irá ELIMINAR permanentemente todos os resultados desta categoria.\n\nEscreva CONFIRMAR para continuar:`);
    if (conf?.trim().toUpperCase() !== 'CONFIRMAR') return toast('Operação cancelada.', 'error');
  } else {
    if (!confirm(`Gerar todos os jogos round-robin para ${catId}?\nJogos existentes desta categoria serão removidos.`)) return;
  }

  const grupos   = (getData('grupos')   || []).filter(g => g.cat === catId);
  const duplas   = getData('duplas')    || [];
  const jogos    = getData('jogos')     || [];
  const jogadores = getData('jogadores') || [];
  const dataOm  = document.getElementById('cjDataOmissao')?.value  || '';
  const horaOm  = document.getElementById('cjHoraOmissao')?.value  || '';

  function duplaLabel(d) {
    const j1 = jogadores.find(j => j.id === d.j1);
    const j2 = jogadores.find(j => j.id === d.j2);
    return `${j1?.nome || d.j1} & ${j2?.nome || d.j2}`;
  }

  // Remove existing games for this cat
  const outros = jogos.filter(j => !j.grupo?.startsWith(catId + '-'));

  // Generate round-robin per group
  const novos = [];
  let maxId = jogos.reduce((m, j) => Math.max(m, typeof j.id === 'number' ? j.id : parseInt(j.id) || 0), 0);

  grupos.sort((a, b) => a.letra.localeCompare(b.letra)).forEach(g => {
    const gDuplas = duplas.filter(d => d.grupo === g.id);
    for (let i = 0; i < gDuplas.length; i++) {
      for (let k = i + 1; k < gDuplas.length; k++) {
        maxId++;
        novos.push({
          id:     maxId,
          grupo:  g.id,
          eq1:    duplaLabel(gDuplas[i]),
          eq2:    duplaLabel(gDuplas[k]),
          data:   dataOm || null,
          hora:   horaOm || null,
          campo:  null,
          resultado: null,
        });
      }
    }
  });

  setData('jogos', [...outros, ...novos]);
  Auth.log('CONSTRUTOR_JOGOS', 'jogos', `${catId}: gerados ${novos.length} jogos round-robin`);
  toast(`${novos.length} jogos gerados para ${catId}`);
  renderConstrutorJogos();
};

window.cjLimparJogos = function(catId) {
  if (!catId) return;
  const jogos = getData('jogos') || [];
  const comResultado = jogos.filter(j => j.grupo?.startsWith(catId + '-') && j.resultado).length;
  if (comResultado > 0) {
    const conf = prompt(`⚠ ATENÇÃO: Existem ${comResultado} jogo(s) com resultado para ${catId}.\nEscreva CONFIRMAR para eliminar tudo:`);
    if (conf?.trim().toUpperCase() !== 'CONFIRMAR') return toast('Operação cancelada.', 'error');
  } else {
    if (!confirm(`Eliminar todos os jogos de ${catId}?`)) return;
  }
  const filtrados = jogos.filter(j => !j.grupo?.startsWith(catId + '-'));
  setData('jogos', filtrados);
  Auth.log('CONSTRUTOR_JOGOS', 'jogos', `${catId}: jogos eliminados`);
  toast(`Jogos de ${catId} eliminados`);
  renderConstrutorJogos();
};

// ── Relatório de Jogos ───────────────────────────────────────
function renderRelatorioJogos() {
  const el = document.getElementById('relatorioJogosContent');
  if (!el) return;

  const CAT_CLR = { M1:'#4A9EFF', M2:'#00C37B', M3:'#39FF8F', M4:'#F5C518', M5:'#FF9A3C', F1:'#FF6BB0', F2:'#C97BFF' };

  // Merge fase-final games
  const jogos = getData('jogos') || [];
  const ffData = ffLoad();
  const faseLabels = { QF:'Quartos-Final', SF:'Meia-Final', F:'Final' };
  const ffJogos = Object.entries(ffData).flatMap(([catId, catData]) =>
    (catData?.jogos || []).filter(j => j.data).map(j => ({
      ...j,
      grupo: `${catId} ${faseLabels[j.fase] || j.fase}${j.num > 1 ? ' '+j.num : ''}`,
      campo: j.campo || 'Fase Final',
      _ff: true,
    }))
  );
  const allJogos = [...jogos, ...ffJogos];

  // Populate filters
  const dataEl   = document.getElementById('rjFiltroData');
  const grupoEl  = document.getElementById('rjFiltroGrupo');
  const estadoEl = document.getElementById('rjFiltroEstado');

  if (dataEl) {
    const saved = dataEl.value;
    const dates = [...new Set(allJogos.map(j => j.data).filter(Boolean))].sort();
    dataEl.innerHTML = '<option value="todos">Todas as datas</option>' +
      dates.map(d => `<option value="${d}">${formatDate(d)}</option>`).join('');
    if (saved && dates.includes(saved)) dataEl.value = saved;
  }
  if (grupoEl) {
    const saved = grupoEl.value;
    const grupos = [...new Set(allJogos.map(j => j.grupo).filter(Boolean))].sort();
    grupoEl.innerHTML = '<option value="todos">Todos os grupos</option>' +
      grupos.map(g => `<option value="${g}">${g}</option>`).join('');
    if (saved) grupoEl.value = saved;
  }

  const selData   = dataEl?.value   || 'todos';
  const selGrupo  = grupoEl?.value  || 'todos';
  const selEstado = estadoEl?.value || 'todos';

  let filtered = allJogos;
  if (selData   !== 'todos') filtered = filtered.filter(j => j.data  === selData);
  if (selGrupo  !== 'todos') filtered = filtered.filter(j => j.grupo === selGrupo);
  if (selEstado === 'pendente')  filtered = filtered.filter(j => !j.resultado && !j.suspenso && !j.adiado);
  if (selEstado === 'suspenso')  filtered = filtered.filter(j => !j.resultado &&  !!j.suspenso);
  if (selEstado === 'adiado')    filtered = filtered.filter(j => !j.resultado &&  !!j.adiado);
  if (selEstado === 'concluido') filtered = filtered.filter(j =>  j.resultado);
  filtered = [...filtered].sort((a, b) =>
    (a.data + (a.hora||'') + a.grupo).localeCompare(b.data + (b.hora||'') + b.grupo)
  );

  // Summary bar
  const total     = filtered.length;
  const concluido = filtered.filter(j => j.resultado).length;
  const pendente  = total - concluido;
  const pct       = total ? Math.round(concluido / total * 100) : 0;

  if (!total) {
    el.innerHTML = `<p style="color:var(--cinza-texto);padding:1rem">Sem jogos para os filtros seleccionados.</p>`;
    return;
  }

  el.innerHTML = `
    <div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:1.25rem">
      <div class="stat-card" style="flex:1;min-width:140px">
        <div class="stat-value">${total}</div><div class="stat-label">Total</div>
      </div>
      <div class="stat-card" style="flex:1;min-width:140px">
        <div class="stat-value" style="color:var(--verde)">${concluido}</div><div class="stat-label">Concluídos</div>
      </div>
      <div class="stat-card" style="flex:1;min-width:140px">
        <div class="stat-value" style="color:var(--amarelo)">${pendente}</div><div class="stat-label">Pendentes</div>
      </div>
      <div class="stat-card" style="flex:1;min-width:140px">
        <div class="stat-value">${pct}%</div><div class="stat-label">Concluído</div>
      </div>
    </div>
    <div style="overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;font-size:.82rem">
      <thead>
        <tr style="background:var(--cinza-escuro);color:var(--cinza-texto);font-size:.72rem;text-transform:uppercase;letter-spacing:.05em">
          <th style="padding:.5rem .75rem;text-align:left">#</th>
          <th style="padding:.5rem .75rem;text-align:left">Data</th>
          <th style="padding:.5rem .75rem;text-align:left">Hora</th>
          <th style="padding:.5rem .75rem;text-align:left">Campo</th>
          <th style="padding:.5rem .75rem;text-align:left">Grupo</th>
          <th style="padding:.5rem .75rem;text-align:left">Equipa 1</th>
          <th style="padding:.5rem .75rem;text-align:center">Resultado</th>
          <th style="padding:.5rem .75rem;text-align:left">Equipa 2</th>
          <th style="padding:.5rem .75rem;text-align:center">Estado</th>
          <th style="padding:.5rem .75rem;text-align:center">Foto</th>
        </tr>
      </thead>
      <tbody>
        ${filtered.map((j, i) => {
          const cat = (j.grupo || '').split(/[-\s]/)[0];
          const clr = CAT_CLR[cat] || '#8AA396';
          let res = '—', winner = 0;
          if (j.resultado) {
            if (j.resultado.wo) {
              winner = j.resultado.wo === 'eq1' ? 2 : 1;
              res = `<span style="background:rgba(255,74,74,.15);color:var(--vermelho);font-weight:700;padding:.1rem .35rem;border-radius:4px;font-size:.75rem">WO</span>`;
            } else {
              const { w1, w2 } = matchSetsScore(j.resultado);
              winner = w1 > w2 ? 1 : 2;
              const r = j.resultado;
              const sets = [[r.s1eq1,r.s1eq2],[r.s2eq1,r.s2eq2],[r.s3eq1,r.s3eq2]]
                .filter(([a]) => a != null).map(([a,b]) => `${a}-${b}`).join(' / ');
              res = `<span style="color:var(--verde);font-weight:700">${w1}–${w2}</span> <span style="color:var(--cinza-texto);font-size:.7rem">(${sets})</span>`;
            }
          }
          const e1style = winner === 1 ? 'color:var(--verde);font-weight:600' : winner === 2 ? 'color:var(--cinza-texto)' : 'color:var(--branco)';
          const e2style = winner === 2 ? 'color:var(--verde);font-weight:600' : winner === 1 ? 'color:var(--cinza-texto)' : 'color:var(--branco)';
          return `<tr style="background:${i%2===0?'var(--preto-card)':'var(--cinza-escuro)'};border-bottom:1px solid var(--preto-borda)">
            <td style="padding:.45rem .75rem;color:var(--cinza-texto);font-family:monospace;font-size:.75rem">${j._ff ? '—' : j.id}</td>
            <td style="padding:.45rem .75rem;color:var(--cinza-texto)">${j.data ? j.data.split('-').reverse().join('/') : '—'}</td>
            <td style="padding:.45rem .75rem;font-family:monospace;font-weight:700;color:var(--branco)">${j.hora || '—'}</td>
            <td style="padding:.45rem .75rem;color:var(--cinza-texto)">${escHtml(j.campo || '—')}</td>
            <td style="padding:.45rem .75rem"><span style="background:${clr}22;color:${clr};border-radius:4px;padding:.1rem .45rem;font-size:.72rem;font-weight:700">${escHtml(j.grupo || '—')}</span></td>
            <td style="padding:.45rem .75rem;${e1style}">${escHtml(j.eq1 || 'A definir')}</td>
            <td style="padding:.45rem .75rem;text-align:center">${res}</td>
            <td style="padding:.45rem .75rem;${e2style}">${escHtml(j.eq2 || 'A definir')}</td>
            <td style="padding:.45rem .75rem;text-align:center">
              ${j.resultado
                ? (j.resultado.wo
                    ? '<span style="color:var(--vermelho);font-size:.7rem;background:rgba(255,74,74,.12);padding:.1rem .45rem;border-radius:4px">WO</span>'
                    : '<span style="color:var(--verde);font-size:.7rem;background:rgba(0,195,123,.12);padding:.1rem .45rem;border-radius:4px">✓ Concluído</span>')
                : j.adiado
                  ? `<span style="color:#6B9CF7;font-size:.7rem;background:rgba(107,156,247,.12);padding:.1rem .45rem;border-radius:4px" title="${escHtml(j.adiado.motivo||'')}">📅 Adiado${j.adiado.motivo ? ' — '+escHtml(j.adiado.motivo.substring(0,40)) : ''}</span>`
                  : j.suspenso
                  ? `<span style="color:#FF9A3C;font-size:.7rem;background:rgba(255,154,60,.12);padding:.1rem .45rem;border-radius:4px">⏸ Suspenso${j.suspenso.nota ? ' — '+j.suspenso.nota.substring(0,30) : ''}</span>`
                  : '<span style="color:var(--amarelo);font-size:.7rem;background:rgba(245,197,24,.12);padding:.1rem .45rem;border-radius:4px">⏳ Pendente</span>'}
            </td>
            <td style="padding:.45rem .75rem;text-align:center">
              ${j.resultado ? (() => {
                const isWo = !!j.resultado.wo;
                return `<button class="btn-icon" style="color:${isWo ? 'var(--vermelho)' : 'var(--amarelo)'}" title="${isWo ? 'Panfleto WO' : 'Panfleto com foto'}" onclick="abrirPanfletoFoto('${j.id}',${j._ff ? 'true' : 'false'},'${j._cat || j._catId || ''}')"><i class="ph ph-${isWo ? 'warning-circle' : 'camera'}"></i></button>`;
              })() : j.adiado && !j._ff ? `<button class="btn-icon" style="color:#6B9CF7" title="Panfleto jogo adiado" onclick="_gerarPanfletoAdiado(getData('jogos').find(x=>String(x.id)==='${j.id}'))"><i class="ph ph-calendar-x"></i></button>` : j.suspenso && !j._ff ? `<button class="btn-icon" style="color:#FF9A3C" title="Panfleto jogo suspenso" onclick="_gerarPanfletoSuspenso(getData('jogos').find(x=>String(x.id)==='${j.id}'))"><i class="ph ph-pause-circle"></i></button>` : ''}
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    </div>`;
}

// ── Mover jogo para outro dia ─────────────────────────────────
window.horarioMoverDia = function(jogoId) {
  const jogos = getData('jogos');
  const j = jogos.find(x => String(x.id) === String(jogoId));
  if (!j) return;
  APP._moverDiaJogoId = String(jogoId);
  APP._moverDiaSlot   = null;
  const info = document.getElementById('moverDiaInfo');
  if (info) info.textContent = `${j.grupo || '#' + jogoId} — ${j.eq1 || '?'} vs ${j.eq2 || '?'}`;
  const inp = document.getElementById('moverDiaData');
  if (inp) inp.value = j.data || '';
  const err = document.getElementById('moverDiaError');
  if (err) err.style.display = 'none';
  horarioMoverDiaRefreshSlots();
  openModal('modalMoverDia');
};

window.horarioMoverDiaRefreshSlots = function() {
  const jogoId  = APP._moverDiaJogoId;
  const novaData = document.getElementById('moverDiaData')?.value;
  const container = document.getElementById('moverDiaSlots');
  if (!container) return;
  if (!novaData) { container.innerHTML = ''; return; }

  const jogos   = getData('jogos');
  const campos  = getData('campos').sort((a,b) => (a.id||0)-(b.id||0)).map(c => c.nome);
  const jogoAtual = jogos.find(x => String(x.id) === String(jogoId));

  // Games on target date, excluding the game being moved
  const dayJogos = jogos.filter(j => j.data === novaData && String(j.id) !== String(jogoId));

  // Dominant minute offset for target day; fallback to current game's minute
  const minuteCounts = {};
  dayJogos.forEach(j => {
    if (!j.hora) return;
    const min = j.hora.split(':')[1];
    minuteCounts[min] = (minuteCounts[min] || 0) + 1;
  });
  const fallbackMin = jogoAtual?.hora?.split(':')[1] || '00';
  const dominantMin = Object.entries(minuteCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || fallbackMin;

  const CLUB_SLOTS = [];
  for (let h = 6; h <= 23; h++) {
    const slot = `${String(h).padStart(2,'0')}:${dominantMin}`;
    if (slot <= '23:30') CLUB_SLOTS.push(slot);
  }
  const times = [...new Set([...CLUB_SLOTS, ...dayJogos.map(j => j.hora).filter(Boolean)])].sort();

  if (!times.length) {
    container.innerHTML = `<p style="color:var(--cinza-texto);font-size:.8rem;margin-top:.5rem">Nenhum jogo neste dia — slots de referência indisponíveis.</p>`;
    return;
  }

  // Occupation map {hora|campo : jogo}
  const occupied = {};
  dayJogos.forEach(j => { if (j.hora && j.campo) occupied[`${j.hora}|${j.campo}`] = j; });

  const sel = APP._moverDiaSlot;
  let html = `<p style="color:var(--cinza-texto);font-size:.75rem;margin:.4rem 0 .5rem">Clique num slot <span style="color:var(--verde)">livre</span> para seleccionar:</p>`;
  html += `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.72rem">`;
  html += `<thead><tr><th style="padding:.3rem .5rem;color:var(--cinza-texto);text-align:left;border-bottom:1px solid var(--preto-borda)">Hora</th>`;
  campos.forEach(c => { html += `<th style="padding:.3rem .5rem;color:var(--cinza-texto);text-align:center;border-bottom:1px solid var(--preto-borda)">${escHtml(c)}</th>`; });
  html += `</tr></thead><tbody>`;

  times.forEach(t => {
    html += `<tr><td style="padding:.25rem .5rem;color:var(--branco);font-weight:700;white-space:nowrap">${t}</td>`;
    campos.forEach(campo => {
      const key = `${t}|${campo}`;
      const occ = occupied[key];
      if (occ) {
        const short = [occ.eq1, occ.eq2].filter(Boolean)
          .map(e => e.split(' & ').map(n => n.split(' ')[0]).join('/'))
          .join(' vs ');
        html += `<td style="padding:.25rem .4rem;text-align:center"><span style="display:inline-block;background:var(--preto-borda);color:var(--cinza-texto);border-radius:4px;padding:.15rem .35rem;font-size:.65rem" title="${escHtml(occ.eq1||'')} vs ${escHtml(occ.eq2||'')}">🔒 ${escHtml(short)}</span></td>`;
      } else {
        const isSel = sel?.hora === t && sel?.campo === campo;
        const safeId = `moverSlot_${t.replace(':','')}_${campo.replace(/[^a-z0-9]/gi,'_')}`;
        html += `<td style="padding:.25rem .4rem;text-align:center">`;
        html += `<span id="${safeId}" onclick="horarioMoverDiaSelSlot('${t}','${escHtml(campo)}')" `;
        html += `style="display:inline-block;border-radius:4px;padding:.2rem .5rem;font-size:.65rem;cursor:pointer;`;
        html += `border:1px solid ${isSel ? 'var(--verde)' : 'var(--preto-borda)'};`;
        html += `background:${isSel ? 'rgba(0,195,123,.22)' : 'transparent'};`;
        html += `color:${isSel ? 'var(--verde)' : 'var(--cinza-texto)'};">✓ livre</span></td>`;
      }
    });
    html += `</tr>`;
  });

  html += `</tbody></table></div>`;
  container.innerHTML = html;
};

window.horarioMoverDiaSelSlot = function(hora, campo) {
  APP._moverDiaSlot = { hora, campo };
  const err = document.getElementById('moverDiaError');
  if (err) err.style.display = 'none';
  horarioMoverDiaRefreshSlots();
};

window.horarioConfirmarMoverDia = function() {
  const jogoId  = APP._moverDiaJogoId;
  const novaData = document.getElementById('moverDiaData')?.value;
  const slot     = APP._moverDiaSlot;
  const err      = document.getElementById('moverDiaError');
  if (!jogoId || !novaData) return;
  if (!slot) {
    if (err) { err.textContent = 'Seleccione um slot disponível na tabela.'; err.style.display = 'block'; }
    return;
  }
  const jogos = getData('jogos');
  const idx = jogos.findIndex(x => String(x.id) === jogoId);
  if (idx < 0) return;
  const antigaData  = jogos[idx].data;
  const antigaHora  = jogos[idx].hora;
  const antigoCampo = jogos[idx].campo;
  jogos[idx].data  = novaData;
  jogos[idx].hora  = slot.hora;
  jogos[idx].campo = slot.campo;
  setData('jogos', jogos);
  Auth.log('HORARIO_MOVER_DIA', 'jogos', `Jogo #${jogoId} de ${antigaData} ${antigaHora} ${antigoCampo} → ${novaData} ${slot.hora} ${slot.campo}`);
  closeModal('modalMoverDia');
  toast(`Jogo movido para ${formatDate(novaData)} — ${slot.hora} · ${slot.campo}`);
  const df = document.getElementById('horarioDataFilter');
  if (df) df.value = novaData;
  renderHorario();
};

// ============================================
//  GITHUB SYNC — UI
// ============================================

/** Open GitHub config modal, pre-filling saved values */
function ghShowConfig() {
  const c = GHSync.getCfg();
  document.getElementById('ghOwner').value  = c.owner  || '';
  document.getElementById('ghRepo').value   = c.repo   || '';
  document.getElementById('ghBranch').value = c.branch || 'main';
  document.getElementById('ghToken').value  = c.token  ? '••••••••' : '';
  openModal('modalGHSync');
}

/** Save config and run a test push */
async function ghSaveConfig() {
  const owner  = document.getElementById('ghOwner').value.trim();
  const repo   = document.getElementById('ghRepo').value.trim();
  const branch = document.getElementById('ghBranch').value.trim() || 'main';
  const rawToken = document.getElementById('ghToken').value.trim();
  if (!owner || !repo || !rawToken) { toast('Preencha todos os campos obrigatórios.', 'error'); return; }
  // Keep existing token if user left the masked placeholder
  const existing = GHSync.getCfg().token || '';
  const token = (rawToken === '••••••••') ? existing : rawToken;
  GHSync.setCfg({ owner, repo, branch, token });
  closeModal('modalGHSync');
  await ghSyncAll();
}

/** Push all data to GitHub and update button state */
async function ghSyncAll() {
  if (!GHSync.isConfigured()) { ghShowConfig(); return; }
  const btn   = document.getElementById('ghSyncBtn');
  const icon  = document.getElementById('ghSyncIcon');
  const label = document.getElementById('ghSyncLabel');
  const dot   = document.getElementById('ghDirtyDot');
  if (!btn) return;

  btn.disabled = true;
  icon.className  = 'ph ph-circle-notch gh-spin';
  label.textContent = 'A sincronizar…';
  dot.style.display = 'none';

  try {
    await GHSync.push(GHSync.getAllData());
    icon.className  = 'ph ph-check-circle';
    label.textContent = 'Sincronizado';
    btn.disabled = false;
    toast('Dados sincronizados! O site público actualiza em ~30 segundos.', 'success');
    setTimeout(() => {
      icon.className  = 'ph ph-cloud-arrow-up';
      label.textContent = 'Sync';
    }, 4000);
  } catch(err) {
    icon.className  = 'ph ph-warning-circle';
    label.textContent = 'Erro';
    btn.disabled = false;
    dot.style.display = 'block';
    toast('Erro ao sincronizar: ' + err.message, 'error');
    setTimeout(() => {
      icon.className  = 'ph ph-cloud-arrow-up';
      label.textContent = 'Sync';
    }, 4000);
  }
}

/** Wire dirty indicator to ghsync events */
document.addEventListener('ghsync:dirty', () => {
  const dot = document.getElementById('ghDirtyDot');
  if (dot) dot.style.display = 'block';
});
document.addEventListener('ghsync:clean', () => {
  const dot = document.getElementById('ghDirtyDot');
  if (dot) dot.style.display = 'none';
});
