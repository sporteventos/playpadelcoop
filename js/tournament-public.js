(function () {
  function ready(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
    } else {
      callback();
    }
  }

  ready(function () {
    var config = {};
    try {
      config = JSON.parse(localStorage.getItem('pp_config') || 'null') || {};
    } catch (_) {}
    var identity = {
      cfgNomeTorneio: config.tornNome,
      cfgSubtituloNav: config.tornSubtitulo,
      cfgHeroTournament: config.tornNome,
      cfgRegistrationDates: config.tornDatas,
      cfgRegistrationLocation: config.tornLocal
    };
    Object.keys(identity).forEach(function (id) {
      var element = document.getElementById(id);
      if (element && identity[id]) element.textContent = identity[id];
    });
    var footerTournament = document.getElementById('cfgFooterTournament');
    var footerDescription = document.getElementById('cfgRegistrationFooter');
    var footerCopy = document.getElementById('cfgRegistrationCopy');
    if (footerTournament && config.tornNome) footerTournament.textContent = config.tornNome;
    if (footerDescription && (config.tornNome || config.tornDatas || config.tornLocal)) {
      footerDescription.innerHTML = 'Pré-inscrições do ' + (config.tornNome || 'torneio') + '<br>'
        + (config.tornDatas || '') + (config.tornLocal ? ' · ' + config.tornLocal : '');
    }
    if (footerCopy && (config.tornNome || config.tornLocal)) {
      footerCopy.textContent = '© 2026 ' + (config.tornNome || 'Torneio')
        + (config.tornLocal ? ' · ' + config.tornLocal + ', Moçambique' : '');
    }

    var form = document.getElementById('insForm');
    if (!form) return;

    var steps = Array.prototype.slice.call(form.querySelectorAll('.registration-step'));
    var progress = Array.prototype.slice.call(document.querySelectorAll('.tp-step-progress button'));
    var currentStep = 1;
    var draftReady = false;
    var restoringDraft = false;
    var suppressNextReset = false;
    var draftTimer = null;

    function draftKey() {
      var cfg = typeof window.ppGet === 'function' ? window.ppGet('config') || {} : config;
      var slug = String(cfg.tornSlug || 'torneio').replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
      return 'pp_registration_draft_' + slug;
    }

    function collectDraftValues() {
      var values = {};
      Array.prototype.forEach.call(form.elements, function (field) {
        if (!field.name || field.disabled || field.readOnly || field.type === 'submit' || field.type === 'button') return;
        if ((field.type === 'radio' || field.type === 'checkbox') && !field.checked) return;
        values[field.name] = field.value;
      });
      return values;
    }

    function saveDraft() {
      if (!draftReady || restoringDraft) return;
      try {
        localStorage.setItem(draftKey(), JSON.stringify({
          tournament: draftKey(),
          savedAt: new Date().toISOString(),
          step: currentStep,
          values: collectDraftValues()
        }));
        var state = document.getElementById('draftState');
        if (state) state.hidden = false;
      } catch (_) {}
    }

    function scheduleDraftSave() {
      if (!draftReady || restoringDraft) return;
      window.clearTimeout(draftTimer);
      draftTimer = window.setTimeout(saveDraft, 350);
    }

    function clearDraft(suppressReset) {
      window.clearTimeout(draftTimer);
      try { localStorage.removeItem(draftKey()); } catch (_) {}
      suppressNextReset = !!suppressReset;
      var notice = document.getElementById('draftNotice');
      var state = document.getElementById('draftState');
      if (notice) notice.hidden = true;
      if (state) state.hidden = true;
    }

    function restoreDraft() {
      if (draftReady) return;
      var draft = null;
      try { draft = JSON.parse(localStorage.getItem(draftKey()) || 'null'); } catch (_) {}
      if (!draft || !draft.values || !draft.savedAt) {
        draftReady = true;
        return;
      }
      var age = Date.now() - new Date(draft.savedAt).getTime();
      if (!Number.isFinite(age) || age > 30 * 24 * 60 * 60 * 1000) {
        clearDraft(false);
        draftReady = true;
        return;
      }

      restoringDraft = true;
      var values = draft.values;
      ['genero', 'modo'].forEach(function (name) {
        if (!values[name]) return;
        var radio = Array.prototype.find.call(form.querySelectorAll('input[name="' + name + '"]'), function (field) {
          return field.value === values[name];
        });
        if (radio) {
          radio.checked = true;
          radio.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      Object.keys(values).forEach(function (name) {
        if (name === 'genero' || name === 'modo') return;
        var field = form.elements[name];
        if (field && typeof field.value !== 'undefined') {
          field.value = values[name];
          field.dispatchEvent(new Event('input', { bubbles: true }));
          field.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      showStep(Number(draft.step) || 1);
      updateReview();
      restoringDraft = false;
      draftReady = true;
      var notice = document.getElementById('draftNotice');
      var state = document.getElementById('draftState');
      if (notice) notice.hidden = false;
      if (state) state.hidden = false;
    }

    function value(name) {
      var field = form.elements[name];
      if (!field) return '';
      if (typeof RadioNodeList !== 'undefined' && field instanceof RadioNodeList) return field.value || '';
      return String(field.value || '').trim();
    }

    function labelForSelect(name) {
      var field = form.elements[name];
      if (!field || !field.options || field.selectedIndex < 0) return '';
      return field.options[field.selectedIndex].textContent || '';
    }

    function validateStep(step) {
      var invalid = [];
      if (step === 1) {
        ['nome1', 'telefone'].forEach(function (name) {
          var field = form.elements[name];
          if (field && !String(field.value || '').trim()) invalid.push(field);
        });
      }
      if (step === 2) {
        var category = form.elements.categoria;
        if (category && !category.value) invalid.push(category);
      }
      invalid.forEach(function (field) { field.classList.add('invalid'); });
      if (invalid[0]) invalid[0].focus();
      return invalid.length === 0;
    }

    function updateReview() {
      var modeLabels = {
        parceiro: 'Com parceiro(a)',
        reserva: 'Parceiro(a) a anunciar',
        solo: 'Inscrição individual'
      };
      var gender = value('genero') === 'F' ? 'Feminino' : 'Masculino';
      var partner = value('parceiro');
      var mode = value('modo') || 'parceiro';
      var pairs = {
        reviewName: value('nome1') || '—',
        reviewContact: value('telefone') || '—',
        reviewCategory: labelForSelect('categoria') || '—',
        reviewGender: gender,
        reviewMode: modeLabels[mode] || '—',
        reviewPartner: mode === 'reserva' ? 'A anunciar' : (mode === 'solo' ? 'Sem parceiro por agora' : (partner || 'Por indicar')),
        summaryPlayer: value('nome1') || 'Por preencher',
        summaryCategory: value('categoria') || '—',
        summaryPartner: mode === 'reserva' ? 'A anunciar' : (mode === 'solo' ? 'Individual' : (partner || 'Por indicar'))
      };
      Object.keys(pairs).forEach(function (id) {
        var element = document.getElementById(id);
        if (element) element.textContent = pairs[id];
      });
    }

    function showStep(nextStep) {
      nextStep = Math.max(1, Math.min(steps.length, nextStep));
      currentStep = nextStep;
      steps.forEach(function (step) {
        step.classList.toggle('active', Number(step.dataset.step) === currentStep);
      });
      progress.forEach(function (button) {
        var number = Number(button.dataset.stepTarget);
        button.classList.toggle('active', number === currentStep);
        button.classList.toggle('complete', number < currentStep);
      });
      var current = document.getElementById('currentStep');
      if (current) current.textContent = String(currentStep).padStart(2, '0');
      if (currentStep === steps.length) updateReview();
      var card = document.querySelector('.tp-form-card');
      if (card && window.scrollY > card.offsetTop - 120) {
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      scheduleDraftSave();
    }

    form.addEventListener('input', function (event) {
      if (event.target.classList) event.target.classList.remove('invalid');
      updateReview();
      scheduleDraftSave();
    });
    form.addEventListener('change', function () {
      updateReview();
      scheduleDraftSave();
    });
    form.addEventListener('reset', function () {
      window.setTimeout(function () {
        var suppress = suppressNextReset;
        suppressNextReset = false;
        restoringDraft = true;
        showStep(1);
        updateReview();
        restoringDraft = false;
        if (!suppress) clearDraft(false);
      }, 0);
    });

    document.addEventListener('click', function (event) {
      var next = event.target.closest('[data-step-next]');
      var back = event.target.closest('[data-step-back]');
      var target = event.target.closest('[data-step-target]');
      if (next) {
        if (validateStep(currentStep)) showStep(currentStep + 1);
      } else if (back) {
        showStep(currentStep - 1);
      } else if (target) {
        var requested = Number(target.dataset.stepTarget);
        if (requested <= currentStep || validateStep(currentStep)) showStep(requested);
      }
    });

    showStep(1);
    updateReview();

    window.ppRegistrationDraft = { clear: clearDraft, save: saveDraft };
    window.addEventListener('pp:registration-ready', restoreDraft);
    var discard = document.getElementById('discardDraft');
    if (discard) {
      discard.addEventListener('click', function () {
        clearDraft(true);
        form.reset();
        var gender = form.querySelector('input[name="genero"]:checked');
        var mode = form.querySelector('input[name="modo"]:checked');
        if (gender) gender.dispatchEvent(new Event('change', { bubbles: true }));
        if (mode) mode.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }
  });
}());
