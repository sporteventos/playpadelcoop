(function () {
  'use strict';

  var deferredInstallPrompt = null;
  var shell = null;

  var tabs = [
    { file: 'index.html', label: 'Início', icon: 'ph-house', key: null, slot: 1 },
    { file: 'inscricoes.html', label: 'Inscrever', icon: 'ph-plus', key: 'inscricoesVisible', primary: true, slot: 3 },
    { file: 'estado-inscricao.html', label: 'Estado', icon: 'ph-magnifying-glass', key: 'inscricoesVisible', slot: 4 }
  ];

  var secondaryTabs = [
    { file: 'inscritos.html', label: 'Inscritos', icon: 'ph-list-checks', key: null, slot: 2 },
    { file: 'premios.html', label: 'Prémios', icon: 'ph-gift', key: 'premiosVisible', slot: 2 },
    { file: 'regulamento.html', label: 'Regras', icon: 'ph-book-open', key: 'regulamentoVisible', slot: 2 }
  ];

  var morePages = [
    { file: 'jogadores.html', label: 'Jogadores', icon: 'ph-users', key: 'jogadoresVisible' },
    { file: 'calendario.html', label: 'Calendário', icon: 'ph-calendar', key: 'calendarioVisible' },
    { file: 'classificacoes.html', label: 'Classificações', icon: 'ph-trophy', key: 'classificacoesVisible' },
    { file: 'fasefinal.html', label: 'Fase Final', icon: 'ph-brackets-round', key: 'fasefinalVisible' },
    { file: 'estatisticas.html', label: 'Estatísticas', icon: 'ph-chart-bar', key: 'estatisticasVisible' },
    { file: 'premios.html', label: 'Prémios', icon: 'ph-gift', key: 'premiosVisible' },
    { file: 'regulamento.html', label: 'Regulamento', icon: 'ph-book-open', key: 'regulamentoVisible' }
  ];

  function currentFile() {
    var path = window.location.pathname;
    var file = path.substring(path.lastIndexOf('/') + 1);
    return file || 'index.html';
  }

  function config() {
    if (typeof window.ppGet === 'function') return window.ppGet('config') || {};
    try { return JSON.parse(localStorage.getItem('pp_config') || '{}'); } catch (_) { return {}; }
  }

  function isVisible(item, cfg) {
    if (!item.key) return true;
    return item.key === 'premiosVisible' ? cfg[item.key] === true : cfg[item.key] !== false;
  }

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  function isIos() {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  }

  function closeMore() {
    if (!shell) return;
    shell.backdrop.hidden = true;
    shell.moreButton.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('mobile-sheet-open');
  }

  function openMore() {
    if (!shell) return;
    shell.backdrop.hidden = false;
    shell.moreButton.setAttribute('aria-expanded', 'true');
    document.body.classList.add('mobile-sheet-open');
    var first = shell.backdrop.querySelector('a, button');
    if (first) first.focus({ preventScroll: true });
  }

  function showInstallHelp() {
    var toast = shell && shell.toast;
    if (!toast) return;
    toast.innerHTML = isIos()
      ? '<i class="ph ph-share-network"></i><span>No Safari, toque em <strong>Partilhar</strong> e depois em <strong>Adicionar ao ecrã principal</strong>.</span>'
      : '<i class="ph ph-download-simple"></i><span>Abra o menu do browser e escolha <strong>Instalar aplicação</strong> ou <strong>Adicionar ao ecrã principal</strong>.</span>';
    toast.hidden = false;
    window.setTimeout(function () { toast.hidden = true; }, 7000);
  }

  async function installApp() {
    if (!deferredInstallPrompt) {
      showInstallHelp();
      return;
    }
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    render();
  }

  function linkHtml(item, active) {
    return '<a href="' + item.file + '" class="mobile-tabbar__item mobile-tabbar__slot-' + item.slot + (item.primary ? ' mobile-tabbar__primary' : '') + (active ? ' active' : '') + '"' +
      (active ? ' aria-current="page"' : '') + '>' +
      '<i class="ph ' + item.icon + '"></i><span>' + item.label + '</span></a>';
  }

  function render() {
    if (!shell) return;
    var cfg = config();
    var file = currentFile();
    var visibleTabs = tabs.filter(function (item) { return isVisible(item, cfg); });
    var secondaryTab = secondaryTabs.find(function (item) { return isVisible(item, cfg); });
    if (secondaryTab) visibleTabs.push(secondaryTab);
    visibleTabs.sort(function (a, b) { return a.slot - b.slot; });
    var visibleMore = morePages.filter(function (item) {
      return isVisible(item, cfg) && (!secondaryTab || item.file !== secondaryTab.file);
    });
    var moreActive = visibleMore.some(function (item) { return item.file === file; });

    shell.tabbar.innerHTML = visibleTabs.map(function (item) {
      return linkHtml(item, item.file === file);
    }).join('') +
      '<button type="button" class="mobile-tabbar__item mobile-tabbar__more mobile-tabbar__slot-5' + (moreActive ? ' active' : '') + '"' +
      ' aria-label="Abrir mais opções" aria-expanded="false">' +
      '<i class="ph ph-dots-three-outline"></i><span>Mais</span></button>';

    shell.moreButton = shell.tabbar.querySelector('.mobile-tabbar__more');
    shell.moreButton.addEventListener('click', openMore);

    shell.grid.innerHTML = visibleMore.map(function (item) {
      return '<a href="' + item.file + '" class="mobile-more-sheet__item' + (item.file === file ? ' active' : '') + '"' +
        (item.file === file ? ' aria-current="page"' : '') + '>' +
        '<i class="ph ' + item.icon + '"></i><span>' + item.label + '</span></a>';
    }).join('');

    var install = shell.install;
    if (!isStandalone() && (deferredInstallPrompt || isIos())) {
      install.hidden = false;
    } else {
      install.hidden = true;
    }
  }

  function createShell() {
    if (document.querySelector('.mobile-tabbar')) return;

    document.body.classList.add('has-mobile-app-shell');
    document.body.insertAdjacentHTML('beforeend',
      '<div class="mobile-install-toast" role="status" hidden></div>' +
      '<div class="mobile-more-backdrop" hidden>' +
        '<section class="mobile-more-sheet" role="dialog" aria-modal="true" aria-labelledby="mobileMoreTitle">' +
          '<div class="mobile-more-sheet__handle" aria-hidden="true"></div>' +
          '<div class="mobile-more-sheet__head">' +
            '<div><small>Play Padel</small><h2 id="mobileMoreTitle">Mais opções</h2></div>' +
            '<button type="button" class="mobile-more-sheet__close" aria-label="Fechar"><i class="ph ph-x"></i></button>' +
          '</div>' +
          '<div class="mobile-more-sheet__grid"></div>' +
          '<button type="button" class="mobile-install-button" hidden>' +
            '<i class="ph ph-download-simple"></i><span><strong>Instalar Play Padel</strong><small>Abrir em ecrã completo como uma aplicação</small></span><i class="ph ph-caret-right"></i>' +
          '</button>' +
        '</section>' +
      '</div>' +
      '<nav class="mobile-tabbar" aria-label="Navegação principal mobile"></nav>'
    );

    shell = {
      tabbar: document.querySelector('.mobile-tabbar'),
      backdrop: document.querySelector('.mobile-more-backdrop'),
      grid: document.querySelector('.mobile-more-sheet__grid'),
      install: document.querySelector('.mobile-install-button'),
      toast: document.querySelector('.mobile-install-toast'),
      moreButton: null
    };

    shell.backdrop.addEventListener('click', function (event) {
      if (event.target === shell.backdrop) closeMore();
    });
    shell.backdrop.querySelector('.mobile-more-sheet__close').addEventListener('click', closeMore);
    shell.install.addEventListener('click', installApp);
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeMore();
    });
    window.addEventListener('pp:datasynced', render);
    render();
  }

  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    deferredInstallPrompt = event;
    render();
  });
  window.addEventListener('appinstalled', function () {
    deferredInstallPrompt = null;
    render();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createShell);
  } else {
    createShell();
  }
}());
