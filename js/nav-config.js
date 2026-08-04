/**
 * nav-config.js — aplica visibilidade de páginas/secções com base no config
 * Incluir em todas as páginas públicas secundárias (não index.html nem admin.html)
 */
(function () {
  function ppGet(key) {
    try { return JSON.parse(localStorage.getItem('pp_' + key)); } catch (e) { return null; }
  }

  // Map: href fragment → config key
  var PAGE_MAP = {
    'calendario.html':    'calendarioVisible',
    'classificacoes.html':'classificacoesVisible',
    'fasefinal.html':     'fasefinalVisible',
    'jogadores.html':     'jogadoresVisible',
    'inscricoes.html':    'inscricoesVisible',
    'estatisticas.html':  'estatisticasVisible',
    'regulamento.html':   'regulamentoVisible',
  };

  function applyNavConfig() {
    var cfg = ppGet('config') || {};

    // Hide/show nav, drawer, and footer links based on config
    var allLinks = document.querySelectorAll('.nav-links a, .nav-drawer a, .footer-links a');
    allLinks.forEach(function (a) {
      var href = a.getAttribute('href') || '';
      var file = href.split('/').pop().split('?')[0];
      var key  = PAGE_MAP[file];
      if (!key) return;
      var visible = cfg[key] !== false;
      var li = a.parentElement;
      if (li && li.tagName === 'LI') {
        li.style.display = visible ? '' : 'none';
      } else {
        a.style.display = visible ? '' : 'none';
      }
    });
  }

  applyNavConfig();
  window.addEventListener('pp:datasynced', applyNavConfig);
}());
