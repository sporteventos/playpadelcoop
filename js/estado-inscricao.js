(function () {
  'use strict';

  var form;
  var phoneInput;
  var referenceInput;
  var error;
  var results;
  var list;
  var submit;

  var STATES = {
    nova: { label: 'Pendente', title: 'Pré-inscrição recebida', icon: 'ph-clock', color: '#f5c518' },
    confirmada: { label: 'Confirmada', title: 'Inscrição confirmada', icon: 'ph-check-circle', color: '#54f653' },
    espera: { label: 'Lista de espera', title: 'Em lista de espera', icon: 'ph-hourglass-medium', color: '#ff9a3c' },
    cancelada: { label: 'Cancelada', title: 'Inscrição cancelada', icon: 'ph-x-circle', color: '#ff6b6b' },
    rejeitada: { label: 'Não aprovada', title: 'Inscrição não aprovada', icon: 'ph-warning-circle', color: '#ff6b6b' }
  };

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function formatReference(id) {
    return 'PP-' + String(id || '').replace(/^ins-/, '').replace(/-p$/, '');
  }

  function formatDate(value) {
    if (!value) return '';
    try {
      return new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
    } catch (_) {
      return '';
    }
  }

  function normalizeReference(value) {
    var ref = String(value || '').trim().toLowerCase().replace(/\s+/g, '');
    if (!ref) return '';
    if (ref.indexOf('pp-') === 0) return 'ins-' + ref.slice(3);
    return ref.indexOf('ins-') === 0 ? ref : 'ins-' + ref.replace(/^pp/, '').replace(/^-/, '');
  }

  function statusCard(entry) {
    var state = STATES[entry.estado] || STATES.nova;
    var partner = entry.reservado ? 'Parceiro a anunciar' : (entry.parceiro || 'Inscrição individual');
    return '<article class="registration-status-card" style="--status-color:' + state.color + '">' +
      '<div class="registration-status-card__icon"><i class="ph ' + state.icon + '"></i></div>' +
      '<div class="registration-status-card__body">' +
        '<small>' + escapeHtml(state.title) + '</small>' +
        '<h3>' + escapeHtml(entry.nome1 || 'Participante') + '</h3>' +
        '<div class="registration-status-card__meta">' +
          '<span><i class="ph ph-medal"></i>' + escapeHtml(entry.categoria || 'Sem categoria') + '</span>' +
          '<span><i class="ph ph-users"></i>' + escapeHtml(partner) + '</span>' +
          (entry.criadoem ? '<span><i class="ph ph-calendar"></i>' + escapeHtml(formatDate(entry.criadoem)) + '</span>' : '') +
        '</div>' +
      '</div>' +
      '<span class="registration-status-card__state">' + escapeHtml(state.label) + '</span>' +
      '<div class="registration-status-card__reference"><span>Referência</span><strong>' + escapeHtml(formatReference(entry.id)) + '</strong></div>' +
    '</article>';
  }

  function showError(message) {
    error.textContent = message;
    error.hidden = !message;
  }

  async function lookup() {
    var phone = phoneInput.value.trim();
    var reference = normalizeReference(referenceInput.value);
    var phoneDigits = phone.replace(/\D/g, '');
    if (!phone && !reference) {
      showError('Introduz o telefone ou a referência da inscrição.');
      phoneInput.focus();
      return;
    }
    if (phone && phoneDigits.length < 8) {
      showError('Introduz um número de telefone completo.');
      phoneInput.focus();
      return;
    }
    if (reference && !/^ins-\d{10,}(?:-p)?$/.test(reference)) {
      showError('Confirma a referência. O formato esperado é PP- seguido dos números apresentados no final da inscrição.');
      referenceInput.focus();
      return;
    }

    showError('');
    submit.disabled = true;
    submit.innerHTML = '<i class="ph ph-spinner ph-spin"></i> A consultar…';
    var entries = [];
    try {
      if (window.ppCloudState && window.ppCloudState.lookupInscricoes) {
        entries = await window.ppCloudState.lookupInscricoes({ telefone: phone, id: reference });
      }
    } catch (_) {
      try {
        var local = JSON.parse(localStorage.getItem('pp_inscricoes') || '[]');
        var digits = phoneDigits;
        entries = local.filter(function (entry) {
          var phoneMatch = !digits || String(entry.telefone || '').replace(/\D/g, '') === digits;
          var refMatch = !reference || entry.id === reference;
          return phoneMatch && refMatch;
        });
      } catch (_) {
        entries = [];
      }
    } finally {
      submit.disabled = false;
      submit.innerHTML = '<i class="ph ph-magnifying-glass"></i> Consultar estado';
    }

    results.hidden = false;
    if (!entries.length) {
      document.getElementById('lookupResultTitle').textContent = 'Nenhuma inscrição encontrada';
      list.innerHTML = '<div class="registration-status-empty"><i class="ph ph-magnifying-glass"></i><h3>Confirma os dados</h3><p>Não encontrámos uma inscrição com os dados indicados.</p></div>';
    } else {
      document.getElementById('lookupResultTitle').textContent = entries.length === 1
        ? 'Inscrição encontrada'
        : entries.length + ' inscrições encontradas';
      list.innerHTML = entries.map(statusCard).join('');
    }
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      var element = document.getElementById(id);
      if (element) element.textContent = ids[id];
    });
  }

  function init() {
    form = document.getElementById('registrationLookupForm');
    phoneInput = document.getElementById('lookupPhone');
    referenceInput = document.getElementById('lookupReference');
    error = document.getElementById('lookupError');
    results = document.getElementById('lookupResults');
    list = document.getElementById('lookupResultList');
    submit = document.getElementById('lookupSubmit');

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      lookup();
    });
    document.getElementById('newLookup').addEventListener('click', function () {
      results.hidden = true;
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
      phoneInput.focus();
    });

    var params = new URLSearchParams(window.location.search);
    if (params.get('ref')) {
      referenceInput.value = params.get('ref');
      window.setTimeout(lookup, 350);
    }

    applyIdentity();
    window.addEventListener('pp:datasynced', applyIdentity);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
