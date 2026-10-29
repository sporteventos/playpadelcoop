(function () {
  'use strict';

  var token = '';

  function $(id) { return document.getElementById(id); }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  async function rpc(name, body) {
    var cloud = window.PP_CLOUD || (typeof PP_CLOUD !== 'undefined' ? PP_CLOUD : null);
    if (!cloud) throw new Error('cloud_unavailable');
    var response = await fetch(cloud.url + '/rest/v1/rpc/' + name, {
      method: 'POST',
      headers: { apikey: cloud.key, Authorization: 'Bearer ' + cloud.key, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error('rpc_' + response.status);
    return response.json();
  }

  function formatDeadline(value) {
    if (!value) return 'até ao início do torneio';
    var deadline = new Date(new Date(value).getTime() - 1);
    try {
      return new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Africa/Maputo' }).format(deadline);
    } catch (_) {
      return deadline.toLocaleDateString('pt-PT');
    }
  }

  function showMessage(icon, color, title, text, action) {
    $('announceLoading').hidden = true;
    $('announceCard').hidden = true;
    var box = $('announceMessage');
    box.hidden = false;
    box.innerHTML = '<div class="partner-announce-result" style="--status-color:' + color + '">' +
      '<i class="ph ' + icon + '"></i><h2>' + escapeHtml(title) + '</h2><p>' + text + '</p>' +
      (action || '<a class="tp-button tp-button--primary" href="index.html"><i class="ph ph-house"></i> Voltar ao início</a>') +
      '</div>';
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function statusLink(reference) {
    return '<a class="tp-button tp-button--primary" href="estado-inscricao.html?ref=' + encodeURIComponent(reference || '') +
      '"><i class="ph ph-magnifying-glass"></i> Ver estado da inscrição</a>';
  }

  function render(data) {
    switch (data && data.status) {
      case 'ok':
        $('announceLoading').hidden = true;
        $('announceCard').hidden = false;
        $('announcePlayer').textContent = data.nome || 'Jogador';
        $('announceCategory').textContent = data.categoriaNome || data.categoria || '';
        $('announceReference').textContent = data.referencia || '';
        $('announceDeadline').textContent = formatDeadline(data.prazo);
        $('announceCard').dataset.reference = data.referencia || '';
        return;
      case 'announced':
        return showMessage('ph-check-circle', '#54f653', 'Dupla já completa',
          'O parceiro(a) <strong>' + escapeHtml(data.parceiro || '') + '</strong> já foi anunciado para esta inscrição. Para alterações, contacta a organização.',
          statusLink(data.referencia));
      case 'closed':
        return showMessage('ph-x-circle', '#ff6b6b', 'Inscrição encerrada',
          'Esta inscrição foi cancelada ou não aprovada, pelo que já não é possível anunciar um parceiro(a).');
      case 'expired':
        return showMessage('ph-hourglass-simple-low', '#ff9a3c', 'Prazo terminado',
          'O prazo para anunciar o parceiro(a) através do site terminou. Contacta a organização.');
      default:
        return showMessage('ph-link-break', '#ff6b6b', 'Link inválido',
          'Este link não é válido. Confirma que abriste o link completo enviado por email ou contacta a organização.');
    }
  }

  function showError(message, field) {
    $('announceError').textContent = message || '';
    $('announceError').hidden = !message;
    document.querySelectorAll('.partner-announce-fields label > div').forEach(function (el) { el.classList.remove('invalid'); });
    var map = { nome: 'partnerName', telefone: 'partnerPhone', email: 'partnerEmail', tshirtNome: 'partnerShirtName', tshirtTamanho: 'partnerShirtSize' };
    if (field && map[field]) {
      var input = $(map[field]);
      input.parentElement.classList.add('invalid');
      input.focus();
    }
  }

  async function submit(event) {
    event.preventDefault();
    var nome = $('partnerName').value.trim().replace(/\s+/g, ' ');
    var telefone = $('partnerPhone').value.trim();
    var email = $('partnerEmail').value.trim();
    var tshirtNome = $('partnerShirtName').value.trim();
    var tshirtTamanho = $('partnerShirtSize').value;
    if (nome.length < 3) return showError('Indica o nome completo do(a) parceiro(a).', 'nome');
    if (telefone.replace(/\D/g, '').length < 9) return showError('Indica um número de telefone válido.', 'telefone');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showError('O email indicado não é válido.', 'email');
    if (!tshirtNome) return showError('Indica o nome a imprimir na t-shirt.', 'tshirtNome');
    if (!tshirtTamanho) return showError('Selecciona o tamanho da t-shirt.', 'tshirtTamanho');
    showError('');

    var button = $('announceSubmit');
    button.disabled = true;
    button.innerHTML = '<i class="ph ph-spinner ph-spin"></i> A enviar…';
    try {
      var result = await rpc('announce_partner', {
        p_token: token, p_nome: nome, p_telefone: telefone, p_email: email,
        p_tshirt_nome: tshirtNome, p_tshirt_tamanho: tshirtTamanho
      });
      if (result && result.status === 'ok') {
        var reference = $('announceCard').dataset.reference;
        showMessage('ph-confetti', '#54f653', 'Dupla completa!',
          '<strong>' + escapeHtml(result.parceiro || nome) + '</strong> foi associado(a) à tua inscrição' +
          (result.categoria ? ' na categoria <strong>' + escapeHtml(result.categoria) + '</strong>' : '') + '. ' +
          (email ? 'O teu parceiro(a) vai receber a confirmação por email. ' : '') +
          'A organização irá validar a dupla e entrar em contacto.', statusLink(reference));
        return;
      }
      if (result && result.status === 'error') return showError(result.message, result.field);
      render(result);
    } catch (_) {
      showError('Não foi possível enviar neste momento. Verifica a ligação e tenta novamente.');
    } finally {
      button.disabled = false;
      button.innerHTML = '<i class="ph ph-user-plus"></i> Anunciar parceiro(a)';
    }
  }

  function applyIdentity() {
    var cfg = typeof window.ppGet === 'function' ? window.ppGet('config') || {} : {};
    var nome = cfg.tornNome || 'Torneio Clausura';
    var ids = {
      cfgNomeTorneio: cfg.tornClube || 'Play Padel',
      cfgSubtituloNav: cfg.tornSubtitulo || nome,
      cfgHeroTournament: nome,
      cfgStatusCopy: '© ' + ((cfg.tornInicio || '2026').slice(0, 4)) + ' Play Padel · ' + nome
    };
    Object.keys(ids).forEach(function (id) {
      var element = $(id);
      if (element) element.textContent = ids[id];
    });
  }

  async function init() {
    applyIdentity();
    window.addEventListener('pp:datasynced', applyIdentity);
    $('announceForm').addEventListener('submit', submit);
    $('partnerShirtName').addEventListener('input', function () { this.value = this.value.toUpperCase(); });

    token = (new URLSearchParams(window.location.search).get('t') || '').trim();
    if (!/^[0-9a-f]{32,}$/i.test(token)) return render({ status: 'invalid' });
    try {
      render(await rpc('partner_reservation', { p_token: token }));
    } catch (_) {
      showMessage('ph-wifi-slash', '#ff9a3c', 'Sem ligação',
        'Não foi possível carregar a reserva. Verifica a ligação e tenta novamente.',
        '<a class="tp-button tp-button--primary" href="' + escapeHtml(window.location.href) + '"><i class="ph ph-arrow-clockwise"></i> Tentar novamente</a>');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
