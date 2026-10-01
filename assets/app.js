(function () {
  const cfg = window.TRIP_CONFIG || {};

  // Mobile menu
  const btn = document.querySelector('.menu-btn');
  const menu = document.getElementById('menu');
  btn.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
  });
  menu.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') { menu.classList.remove('open'); btn.setAttribute('aria-expanded', false); }
  });

  // Countdown
  const cd = document.getElementById('countdown');
  const target = new Date(cfg.departure || '2026-11-20T06:30:00+07:00').getTime();
  const parts = {};
  cd.querySelectorAll('[data-cd]').forEach((el) => (parts[el.dataset.cd] = el));
  const pad = (n) => String(n).padStart(2, '0');
  function tick() {
    const diff = target - Date.now();
    if (diff <= 0) {
      cd.classList.add('done');
      cd.textContent = Date.now() < target + 2 * 86400000 ? 'เที่ยวให้สนุกนะทุกคน! 🎉' : 'ขอบคุณที่ร่วมเดินทางด้วยกัน 💙';
      return;
    }
    parts.d.textContent = Math.floor(diff / 86400000);
    parts.h.textContent = pad(Math.floor(diff / 3600000) % 24);
    parts.m.textContent = pad(Math.floor(diff / 60000) % 60);
    parts.s.textContent = pad(Math.floor(diff / 1000) % 60);
    setTimeout(tick, 1000 - (Date.now() % 1000));
  }
  tick();

  // Day tabs
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  function select(tab) {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      select(next); next.focus();
    });
  });
  // Auto-open Day 2 on 21 Nov 2026 (Bangkok time)
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
  if (today === '2026-11-21') select(tabs[1]);

  // Survey link
  if (cfg.surveyUrl) {
    const a = document.getElementById('survey-link');
    a.href = cfg.surveyUrl; a.hidden = false;
    document.getElementById('survey-pending').hidden = true;
  }

  // Lightbox
  const lb = document.getElementById('lightbox');
  const lbImg = lb.querySelector('img');
  document.querySelectorAll('main img:not(.hero-bg)').forEach((img) => {
    if (img.closest('a')) return;
    img.addEventListener('click', () => {
      lbImg.src = img.currentSrc || img.src; lbImg.alt = img.alt;
      lb.showModal();
    });
  });
  lb.addEventListener('click', () => lb.close());

  // Social embeds (Instagram / TikTok) — load only when near the viewport
  const embeds = document.querySelector('[data-embeds]');
  if (embeds) {
    const load = () => {
      [['https://www.instagram.com/embed.js', '.instagram-media'], ['https://www.tiktok.com/embed.js', '.tiktok-embed']].forEach(([src, sel]) => {
        if (!embeds.querySelector(sel)) return;
        const sc = document.createElement('script');
        sc.async = true; sc.src = src;
        document.body.appendChild(sc);
      });
    };
    if ('IntersectionObserver' in window) {
      const eo = new IntersectionObserver((en) => { if (en.some((e) => e.isIntersecting)) { eo.disconnect(); load(); } }, { rootMargin: '600px 0px' });
      eo.observe(embeds);
    } else load();
  }

  // Reveal on scroll
  if ('IntersectionObserver' in window) {
    const els = document.querySelectorAll('.sec-head, .tl-card, .gallery figure, .act, .dish, .prize, .lucky, .backdrop, .shirts figure, .qs li, .fact');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    els.forEach((el) => { el.classList.add('reveal'); io.observe(el); });
  }
})();
