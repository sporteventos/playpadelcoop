// ============================================
//  PLAY PADEL — Script Principal
// ============================================

document.addEventListener('DOMContentLoaded', () => {

  // ---------- Navbar scroll ----------
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  });

  // ---------- Hamburger menu ----------
  const hamburger = document.getElementById('hamburger');
  const drawer    = document.getElementById('navDrawer');

  hamburger.addEventListener('click', () => {
    const isOpen = drawer.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', isOpen);
    hamburger.querySelectorAll('span')[0].style.transform = isOpen ? 'rotate(45deg) translate(5px,5px)' : '';
    hamburger.querySelectorAll('span')[1].style.opacity  = isOpen ? '0' : '1';
    hamburger.querySelectorAll('span')[2].style.transform = isOpen ? 'rotate(-45deg) translate(5px,-5px)' : '';
  });

  // Fechar drawer ao clicar em link
  drawer.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      drawer.classList.remove('open');
      hamburger.querySelectorAll('span').forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
    });
  });

  // ---------- Countdown ao torneio ----------
  // Use the earliest game date from the schedule; fall back to a hardcoded date
  let TARGET_DATE = new Date('2026-09-10T07:00:00');
  (function() {
    const jogos = ppGet('jogos');
    if (!jogos || !jogos.length) return;
    const first = jogos
      .filter(j => j.data && j.hora)
      .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora))[0];
    if (first) TARGET_DATE = new Date(first.data + 'T' + first.hora + ':00');
  }());

  function pad(n) { return String(n).padStart(2, '0'); }

  function updateCountdown() {
    const now  = new Date();
    const diff = TARGET_DATE - now;

    if (diff <= 0) {
      // Torneio já começou
      document.getElementById('cdDias').textContent   = '00';
      document.getElementById('cdHoras').textContent  = '00';
      document.getElementById('cdMins').textContent   = '00';
      document.getElementById('cdSegs').textContent   = '00';
      document.getElementById('cdLabel').textContent  = 'O Torneio está em curso! 🎾';
      return;
    }

    const dias  = Math.floor(diff / 86400000);
    const horas = Math.floor((diff % 86400000) / 3600000);
    const mins  = Math.floor((diff % 3600000)  / 60000);
    const segs  = Math.floor((diff % 60000)    / 1000);

    document.getElementById('cdDias').textContent  = pad(dias);
    document.getElementById('cdHoras').textContent = pad(horas);
    document.getElementById('cdMins').textContent  = pad(mins);
    document.getElementById('cdSegs').textContent  = pad(segs);
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);

  // ---------- Scroll suave nos links de âncora ----------
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ---------- Animação de entrada dos cards ----------
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity  = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.nav-card, .jogo-card, .stat-item').forEach((el, i) => {
    el.style.opacity   = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = `opacity 0.5s ease ${i * 0.06}s, transform 0.5s ease ${i * 0.06}s`;
    observer.observe(el);
  });

});
