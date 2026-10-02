(function () {
  const CFG = window.BUS_CONFIG;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- mobile menu ----------
  const menuBtn = $('.menu-btn'), menu = $('#menu');
  menuBtn.addEventListener('click', () => menuBtn.setAttribute('aria-expanded', menu.classList.toggle('open')));
  menu.addEventListener('click', (e) => { if (e.target.tagName === 'A') { menu.classList.remove('open'); menuBtn.setAttribute('aria-expanded', false); } });

  // ---------- cute avatar generator (deterministic from employee id) ----------
  function hash(s) {
    let h = 2166136261;
    for (const ch of String(s)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  const KINDS = ['bear', 'cat', 'bunny', 'panda', 'chick', 'frog', 'pig', 'dog'];
  const TONES = [
    ['#ffd6a5', '#d9905a'], ['#ffe5b4', '#c98b4f'], ['#e9d5ff', '#9b6dd6'], ['#cdeafe', '#5b9bd5'],
    ['#ffd1dc', '#e87a9a'], ['#d8f3dc', '#5fae7b'], ['#fff1a8', '#d6a92c'], ['#f1dfd1', '#a9785a']
  ];
  const INK = '#2b2d42';

  function avatar(seed, mood) {
    const h = hash(seed);
    const kind = KINDS[h % KINDS.length];
    let [face, deep] = TONES[(h >>> 4) % TONES.length];
    if (kind === 'panda') { face = '#ffffff'; deep = '#2b2d42'; }
    if (kind === 'chick') { face = '#ffe066'; deep = '#f4a300'; }
    if (kind === 'frog') { face = '#9be3b0'; deep = '#3f9d63'; }
    if (kind === 'pig') { face = '#ffc6d9'; deep = '#e58aa9'; }
    const delay = ((h >>> 9) % 40) / 10;
    let ears = '', extra = '', mouth = `<path d="M28.5 43.5q1.75 2.2 3.5 0q1.75 2.2 3.5 0" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`;
    let ey = 35, ex1 = 25, ex2 = 39;

    switch (kind) {
      case 'bear':
        ears = `<circle cx="15" cy="20" r="8" fill="${deep}"/><circle cx="49" cy="20" r="8" fill="${deep}"/><circle cx="15" cy="20" r="4" fill="${face}"/><circle cx="49" cy="20" r="4" fill="${face}"/>`;
        extra = `<ellipse cx="32" cy="43" rx="8" ry="6" fill="#fff" opacity=".75"/><ellipse cx="32" cy="40.5" rx="2.6" ry="1.8" fill="${INK}"/>`;
        break;
      case 'cat':
        ears = `<path d="M12 28 15 7 29 18Z" fill="${face}" stroke="${deep}" stroke-width="2" stroke-linejoin="round"/><path d="M52 28 49 7 35 18Z" fill="${face}" stroke="${deep}" stroke-width="2" stroke-linejoin="round"/><path d="M16 22 17 13 23 18Z" fill="#ffb3c6"/><path d="M48 22 47 13 41 18Z" fill="#ffb3c6"/>`;
        extra = `<path d="M30.5 40h3l-1.5 1.8z" fill="#ff8fab"/><path d="M12 40h7M12 44h7M45 40h7M45 44h7" stroke="${deep}" stroke-width="1.2" stroke-linecap="round"/>`;
        break;
      case 'bunny':
        ears = `<ellipse cx="23" cy="13" rx="5.5" ry="14" fill="${face}" stroke="${deep}" stroke-width="2"/><ellipse cx="41" cy="13" rx="5.5" ry="14" fill="${face}" stroke="${deep}" stroke-width="2"/><ellipse cx="23" cy="14" rx="2.5" ry="9" fill="#ffb3c6"/><ellipse cx="41" cy="14" rx="2.5" ry="9" fill="#ffb3c6"/>`;
        extra = `<ellipse cx="32" cy="40.5" rx="2" ry="1.5" fill="#ff8fab"/>`;
        break;
      case 'panda':
        ears = `<circle cx="15" cy="20" r="8" fill="${INK}"/><circle cx="49" cy="20" r="8" fill="${INK}"/>`;
        extra = `<ellipse cx="25" cy="35" rx="5.5" ry="6.5" fill="${INK}" transform="rotate(-20 25 35)"/><ellipse cx="39" cy="35" rx="5.5" ry="6.5" fill="${INK}" transform="rotate(20 39 35)"/><ellipse cx="32" cy="41" rx="2.6" ry="1.8" fill="${INK}"/>`;
        break;
      case 'chick':
        ears = `<path d="M30 14q2-7 4 0q3-5 4 1" fill="none" stroke="${deep}" stroke-width="2.2" stroke-linecap="round"/>`;
        mouth = `<path d="M28.5 41h7l-3.5 4.5z" fill="#ff9f1c" stroke="#e07b00" stroke-width="1" stroke-linejoin="round"/>`;
        break;
      case 'frog':
        ears = `<circle cx="21" cy="21" r="9" fill="${face}" stroke="${deep}" stroke-width="2"/><circle cx="43" cy="21" r="9" fill="${face}" stroke="${deep}" stroke-width="2"/>`;
        ey = 21; ex1 = 21; ex2 = 43;
        mouth = `<path d="M24 42q8 6 16 0" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>`;
        break;
      case 'pig':
        ears = `<path d="M13 24 16 11 26 19Z" fill="${deep}"/><path d="M51 24 48 11 38 19Z" fill="${deep}"/>`;
        extra = `<ellipse cx="32" cy="42" rx="7.5" ry="5.5" fill="${deep}"/><ellipse cx="29.5" cy="42" rx="1.4" ry="2" fill="${INK}"/><ellipse cx="34.5" cy="42" rx="1.4" ry="2" fill="${INK}"/>`;
        mouth = '';
        break;
      case 'dog':
        ears = `<ellipse cx="13" cy="32" rx="6.5" ry="12" fill="${deep}" transform="rotate(18 13 32)"/><ellipse cx="51" cy="32" rx="6.5" ry="12" fill="${deep}" transform="rotate(-18 51 32)"/>`;
        extra = `<circle cx="41" cy="30" r="5" fill="${deep}" opacity=".35"/><ellipse cx="32" cy="40.5" rx="3" ry="2.1" fill="${INK}"/>`;
        break;
    }

    const eyes = mood === 'sleep'
      ? `<g><path d="M${ex1 - 3.5} ${ey}q3.5 3 7 0M${ex2 - 3.5} ${ey}q3.5 3 7 0" fill="none" stroke="${kind === 'panda' ? '#fff' : INK}" stroke-width="1.8" stroke-linecap="round"/></g>`
      : mood === 'laugh'
        ? `<g><path d="M${ex1 - 3.5} ${ey + 1}q3.5 -4 7 0M${ex2 - 3.5} ${ey + 1}q3.5 -4 7 0" fill="none" stroke="${kind === 'panda' ? '#fff' : INK}" stroke-width="1.8" stroke-linecap="round"/></g>`
        : `<g class="eyes"><circle cx="${ex1}" cy="${ey}" r="3.2" fill="${kind === 'panda' ? '#fff' : INK}"/><circle cx="${ex2}" cy="${ey}" r="3.2" fill="${kind === 'panda' ? '#fff' : INK}"/><circle cx="${ex1 + 1}" cy="${ey - 1.2}" r="1.1" fill="${kind === 'panda' ? INK : '#fff'}"/><circle cx="${ex2 + 1}" cy="${ey - 1.2}" r="1.1" fill="${kind === 'panda' ? INK : '#fff'}"/></g>`;
    if (mood === 'sing' && kind !== 'chick' && kind !== 'pig') mouth = `<ellipse cx="32" cy="45" rx="3" ry="3.6" fill="#e2445c"/>`;
    if (mood === 'laugh' && kind !== 'chick' && kind !== 'pig') mouth = `<path d="M26 42h12q-1 7-6 7t-6-7z" fill="#e2445c" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>`;
    const prop = mood === 'party' ? `<path d="M26 16 32 1 38 16Z" fill="#ff4f8b" stroke="#fff" stroke-width="1"/><circle cx="32" cy="1.5" r="2.2" fill="#ffd23f"/>` : '';

    return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" style="--d:-${delay}s" aria-hidden="true">${ears}<circle cx="32" cy="36" r="21" fill="${face}" stroke="${deep}" stroke-width="2"/>${extra}${eyes}<circle cx="19.5" cy="42" r="3.4" fill="#ff8fab" opacity=".55"/><circle cx="44.5" cy="42" r="3.4" fill="#ff8fab" opacity=".55"/>${mouth}${prop}</svg>`;
  }

  // ---------- side-view mini bus for the hero convoy ----------
  function miniBus(b) {
    return `<svg class="mini-bus" viewBox="0 0 160 84" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="4" y="12" width="150" height="56" rx="12" fill="${b.color}"/>
      <rect x="4" y="52" width="150" height="6" fill="#000" opacity=".12"/>
      <rect x="16" y="20" width="22" height="18" rx="4" fill="#e9f6ff"/><rect x="42" y="20" width="22" height="18" rx="4" fill="#e9f6ff"/>
      <rect x="68" y="20" width="22" height="18" rx="4" fill="#e9f6ff"/><rect x="94" y="20" width="22" height="18" rx="4" fill="#e9f6ff"/>
      <rect x="122" y="20" width="26" height="30" rx="5" fill="#cfe8ff"/><rect x="120" y="44" width="2" height="20" fill="#fff" opacity=".6"/>
      <circle cx="151" cy="56" r="3" fill="#ffe066"/>
      <rect x="40" y="2" width="70" height="14" rx="7" fill="#fff"/><text x="75" y="12.5" text-anchor="middle" font-size="10" font-family="Mitr, sans-serif" fill="#0f2a44">BUS ${b.id} ${b.emoji}</text>
      <g class="wheel"><circle cx="36" cy="68" r="11" fill="#2b2d42"/><circle cx="36" cy="68" r="4.5" fill="#cfd6df"/><path d="M36 59v18M27 68h18" stroke="#cfd6df" stroke-width="2"/></g>
      <g class="wheel"><circle cx="124" cy="68" r="11" fill="#2b2d42"/><circle cx="124" cy="68" r="4.5" fill="#cfd6df"/><path d="M124 59v18M115 68h18" stroke="#cfd6df" stroke-width="2"/></g>
    </svg>`;
  }
  $('#convoy').innerHTML = CFG.buses.map(miniBus).join('');

  // ---------- allocation (same rules as apps-script/bus-booking.gs) ----------
  function allocate(rows, capacity, openAt, closeAt) {
    const seats = {}; CFG.buses.forEach((b) => (seats[b.id] = []));
    const waitlist = []; const seen = new Set(); const log = [];
    rows.slice().sort((a, b) => a.t - b.t).forEach((r) => {
      if ((openAt && r.t < openAt) || (closeAt && r.t > closeAt) || seen.has(r.emp)) return;
      seen.add(r.emp);
      if (seats[r.c1] && seats[r.c1].length < capacity) { seats[r.c1].push({ ...r, rank: 1 }); log.push({ r, bus: r.c1, rank: 1 }); }
      else if (r.c2 && r.c2 !== r.c1 && seats[r.c2] && seats[r.c2].length < capacity) { seats[r.c2].push({ ...r, rank: 2 }); log.push({ r, bus: r.c2, rank: 2 }); }
      else { waitlist.push(r); log.push({ r, bus: null }); }
    });
    return { seats, waitlist, log };
  }

  // ---------- rendering ----------
  const busById = Object.fromEntries(CFG.buses.map((b) => [b.id, b]));
  let capacity = CFG.capacity;
  let current = { seats: {}, waitlist: [] };
  let known = new Set();

  function layout(cap) {
    const pos = []; const rows = Math.floor(cap / 4); const rem = cap % 4;
    const back5 = rem === 1 && rows > 0; const reg = back5 ? rows - 1 : rows;
    for (let r = 0; r < reg; r++) for (let c = 0; c < 4; c++) pos.push({ r, c: c < 2 ? c + 1 : c + 2 });
    if (back5) for (let c = 1; c <= 5; c++) pos.push({ r: reg, c });
    else for (let c = 0; c < rem; c++) pos.push({ r: reg, c: c < 2 ? c + 1 : c + 2 });
    return pos;
  }

  const row = $('#bus-row');
  row.innerHTML = CFG.buses.map((b) => `
    <article class="bus-card" id="bus-${b.id}" data-mood="${b.mood}" style="--c:${b.color}">
      <header>
        <span class="bus-emoji">${b.emoji}</span>
        <h3>Bus ${b.id} · ${esc(b.name)}</h3>
        <p class="bus-tag">${esc(b.tag)}</p>
        <div class="cap-bar"><span></span></div>
        <div class="cap-text"><span><b class="cnt">0</b> / <span data-cap>${capacity}</span> ที่นั่ง</span><span class="full-badge">เต็มแล้ว</span></div>
      </header>
      <div class="bus-body">
        ${b.mood === 'sleep' ? '<span class="zzz">z Z z</span>' : ''}
        <span class="driver" title="คนขับ">🧑‍✈️</span><span class="door"></span>
        <div class="seats"></div>
      </div>
      <button class="list-btn" data-bus="${b.id}">ดูรายชื่อ</button>
    </article>`).join('');

  function render(data, fresh = new Set()) {
    current = data;
    document.querySelectorAll('[data-cap]').forEach((el) => (el.textContent = capacity));
    const pos = layout(capacity);
    CFG.buses.forEach((b) => {
      const card = $('#bus-' + b.id);
      const list = data.seats[b.id] || [];
      card.querySelector('.cnt').textContent = list.length;
      card.querySelector('.cap-bar span').style.width = Math.min(100, (list.length / capacity) * 100) + '%';
      card.classList.toggle('is-full', list.length >= capacity);
      card.querySelector('.seats').innerHTML = pos.map((p, i) => {
        const st = `grid-row:${p.r + 1};grid-column:${p.c}`;
        const s = list[i];
        if (!s) return `<span class="seat empty" style="${st}"></span>`;
        return `<button class="seat taken${fresh.has(s.emp) ? ' pop' : ''}" style="${st}" data-emp="${esc(s.emp)}" title="${esc(s.nick)} · ${esc(s.emp)} · อันดับ ${s.rank}">
          <span class="rk">${s.rank === 1 ? '⭐' : '🔁'}</span><span class="av">${avatar(s.emp, b.mood)}</span><span class="nm">${esc(s.nick)}</span></button>`;
      }).join('');
    });
    const wl = data.waitlist || [];
    $('#waitlist').hidden = !wl.length;
    $('#wait-count').textContent = wl.length ? `(${wl.length} คน)` : '';
    $('#wait-list').innerHTML = wl.map((p) => `<span class="wait-chip">${avatar(p.emp)}${esc(p.nick)} · ${esc(p.emp)}</span>`).join('');
    renderStats();
    runFind();
  }

  function renderStats() {
    const booked = CFG.buses.reduce((n, b) => n + (current.seats[b.id] || []).length, 0);
    const left = CFG.buses.length * capacity - booked;
    $('#stats').innerHTML = `
      <div class="stat"><b>${booked}</b><small>จองแล้ว</small></div>
      <div class="stat"><b>${left}</b><small>ที่นั่งว่าง</small></div>
      <div class="stat"><b>${(current.waitlist || []).length}</b><small>รอจัดสรร</small></div>`;
  }

  // passenger list dialog
  const dlg = $('#pax-dialog');
  row.addEventListener('click', (e) => {
    const seat = e.target.closest('.seat.taken');
    const btn = e.target.closest('.list-btn');
    if (seat) { $('#find-input').value = seat.dataset.emp; runFind(true); return; }
    if (!btn) return;
    const b = busById[btn.dataset.bus];
    const list = current.seats[b.id] || [];
    $('#pax-body').innerHTML = `<div class="pax-head"><span>${b.emoji}</span><h3>Bus ${b.id} · ${esc(b.name)} <small class="muted">(${list.length}/${capacity})</small></h3></div>
      ${list.length ? `<ol class="pax-list">${list.map((p, i) => `<li>${avatar(p.emp, b.mood)}<div><b>${i + 1}. ${esc(p.nick)}</b><small>รหัส ${esc(p.emp)} · ${p.rank === 1 ? '⭐ อันดับ 1' : '🔁 อันดับ 2'}</small></div></li>`).join('')}</ol>` : '<p class="muted">ยังไม่มีคนจอง</p>'}`;
    dlg.showModal();
  });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });

  // find my seat
  const findInput = $('#find-input');
  function runFind(scroll) {
    const q = findInput.value.trim().toLowerCase();
    document.querySelectorAll('.seat.hit').forEach((s) => s.classList.remove('hit'));
    const out = $('#find-result');
    if (!q) { out.textContent = ''; return; }
    for (const b of CFG.buses) {
      const list = current.seats[b.id] || [];
      const i = list.findIndex((p) => p.emp === q || p.nick.toLowerCase() === q);
      if (i > -1) {
        const p = list[i];
        out.innerHTML = `🎉 <b>${esc(p.nick)} (${esc(p.emp)})</b> ได้นั่ง <b style="color:${b.color}">Bus ${b.id} ${b.emoji} ${esc(b.name)}</b> · ที่นั่งลำดับ ${i + 1} · ${p.rank === 1 ? 'ได้รถอันดับ 1 ⭐' : 'อันดับ 1 เต็ม ได้รถอันดับ 2 🔁'}`;
        const el = document.querySelector(`#bus-${b.id} .seat[data-emp="${CSS.escape(p.emp)}"]`);
        if (el) { el.classList.add('hit'); if (scroll) el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }); }
        return;
      }
    }
    const w = (current.waitlist || []).find((p) => p.emp === q || p.nick.toLowerCase() === q);
    out.innerHTML = w ? `⏳ <b>${esc(w.nick)} (${esc(w.emp)})</b> อยู่ในรายชื่อรอจัดสรร — ทีมงานจะจัดที่นั่งให้` : (q.length >= 2 ? 'ยังไม่พบการจอง' : '');
  }
  let findTimer;
  findInput.addEventListener('input', () => { clearTimeout(findTimer); findTimer = setTimeout(() => runFind(true), 250); });

  // ---------- status + countdown ----------
  let openAt = +new Date(CFG.openAt), closeAt = +new Date(CFG.closeAt), accepting = null, formUrl = CFG.formUrl;
  const fmt = (ms) => new Date(ms).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'long', timeStyle: 'short' }) + ' น.';
  const pad = (n) => String(n).padStart(2, '0');
  function tickStatus() {
    const now = Date.now();
    const isOpen = accepting !== null ? accepting && now < closeAt : now >= openAt && now < closeAt;
    const pill = $('#status-pill'), cd = $('#bus-countdown'), btn = $('#book-btn');
    $('#rule-time').textContent = `เปิดจอง ${fmt(openAt)} – ปิด ${fmt(closeAt)} · ส่งนอกช่วงเวลาไม่นับ`;
    if (now < openAt && !isOpen) {
      pill.className = 'pill soon'; pill.textContent = 'เร็ว ๆ นี้';
      $('#status-title').textContent = 'เปิดจองอีก…';
      $('#status-sub').textContent = `เปิดจอง ${fmt(openAt)}`;
      cd.hidden = false; btn.hidden = true;
      const d = openAt - now;
      cd.querySelector('[data-cd=d]').textContent = Math.floor(d / 864e5);
      cd.querySelector('[data-cd=h]').textContent = pad(Math.floor(d / 36e5) % 24);
      cd.querySelector('[data-cd=m]').textContent = pad(Math.floor(d / 6e4) % 60);
      cd.querySelector('[data-cd=s]').textContent = pad(Math.floor(d / 1e3) % 60);
    } else if (isOpen) {
      pill.className = 'pill open'; pill.textContent = '● เปิดจองแล้ว';
      $('#status-title').textContent = 'เปิดจองแล้ว รีบเลย!';
      $('#status-sub').textContent = `ปิดจอง ${fmt(closeAt)}`;
      cd.hidden = true; btn.hidden = !formUrl; if (formUrl) btn.href = formUrl;
    } else {
      pill.className = 'pill closed'; pill.textContent = 'ปิดจองแล้ว';
      $('#status-title').textContent = 'ปิดจองแล้ว';
      $('#status-sub').textContent = 'ดูผังที่นั่งด้านล่าง หรือค้นหาที่นั่งของคุณ';
      cd.hidden = true; btn.hidden = true;
    }
  }
  tickStatus();
  setInterval(tickStatus, 1000);

  // ---------- live mode (Apps Script endpoint) ----------
  async function loadLive() {
    try {
      const res = await fetch(CFG.endpoint + (CFG.endpoint.includes('?') ? '&' : '?') + 't=' + Date.now());
      const d = await res.json();
      capacity = d.capacity || capacity;
      openAt = +new Date(d.openAt || CFG.openAt); closeAt = +new Date(d.closeAt || CFG.closeAt);
      accepting = typeof d.accepting === 'boolean' ? d.accepting : null;
      formUrl = d.formUrl || formUrl;
      const seats = {}; (d.buses || []).forEach((b) => (seats[b.id] = b.seats || []));
      const all = [...Object.values(seats).flat(), ...(d.waitlist || [])].map((p) => p.emp);
      const fresh = new Set(all.filter((e) => known.size && !known.has(e)));
      known = new Set(all);
      render({ seats, waitlist: d.waitlist || [] }, fresh);
      $('#updated-at').textContent = 'อัปเดตล่าสุด ' + new Date(d.updatedAt || Date.now()).toLocaleTimeString('th-TH');
      tickStatus();
    } catch (err) {
      $('#ticker').textContent = 'โหลดข้อมูลการจองไม่สำเร็จ จะลองใหม่อัตโนมัติ';
    }
  }

  // ---------- demo / simulation mode ----------
  const NICKS = ['บอล', 'มิ้นท์', 'ฝน', 'ต้น', 'แบงค์', 'ปุ้ย', 'เบียร์', 'น้ำ', 'ฟ้า', 'กอล์ฟ', 'เอ็ม', 'ออย', 'แนน', 'ตาล', 'พลอย', 'โอ๊ต', 'บอส', 'นุ่น', 'ปาล์ม', 'เจ', 'ป๊อป', 'มด', 'หนิง', 'จอย', 'กิ๊ฟ', 'อาร์ม', 'ตูน', 'เบนซ์', 'ไอซ์', 'ปอนด์', 'แพร', 'ก้อย', 'นิว', 'ฟลุ๊ค', 'บีม', 'เต้', 'แอน', 'ปู', 'หมิว', 'ต่าย', 'โบ๊ท', 'เก่ง', 'จูน', 'ใบเตย', 'ข้าวหอม', 'หมู', 'ไก่', 'ตั้ม', 'ป่าน', 'เฟิร์น'];
  const W1 = { 1: 0.12, 2: 0.25, 3: 0.2, 4: 0.18, 5: 0.25 };
  function rng(seed) { let s = seed >>> 0; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9 >>> 0) / 4294967296); }
  function pick(r, weights, exclude) {
    const ids = Object.keys(weights).map(Number).filter((i) => i !== exclude);
    const total = ids.reduce((n, i) => n + weights[i], 0);
    let x = r() * total;
    for (const i of ids) { if ((x -= weights[i]) <= 0) return i; }
    return ids[ids.length - 1];
  }
  function mockRows(n = 236) {
    const r = rng(20261120); const used = new Set(); const rows = [];
    const t0 = openAt;
    for (let i = 0; i < n; i++) {
      let emp; do { emp = String(1001 + Math.floor(r() * 2990)); } while (used.has(emp)); used.add(emp);
      const c1 = pick(r, W1); const c2 = pick(r, W1, c1);
      rows.push({ emp, nick: NICKS[Math.floor(r() * NICKS.length)], c1, c2, t: t0 + Math.floor(i * 900 + r() * 800) });
    }
    return rows;
  }

  let simTimer = null;
  function simReset() {
    clearInterval(simTimer); simTimer = null;
    $('#sim-play').textContent = '▶ เริ่มจำลองการจอง';
    $('#ticker').innerHTML = '';
    render({ seats: {}, waitlist: [] });
  }
  function simPlay() {
    if (simTimer) { clearInterval(simTimer); simTimer = null; $('#sim-play').textContent = '▶ เล่นต่อ'; return; }
    if (!simPlay.log || simPlay.i >= simPlay.log.length) {
      simPlay.log = allocate(mockRows(), capacity).log; simPlay.i = 0;
      simPlay.state = { seats: Object.fromEntries(CFG.buses.map((b) => [b.id, []])), waitlist: [] };
    }
    $('#sim-play').textContent = '⏸ หยุด';
    document.getElementById('buses').scrollIntoView({ behavior: 'smooth' });
    simTimer = setInterval(() => {
      const ev = simPlay.log[simPlay.i++];
      if (!ev) { clearInterval(simTimer); simTimer = null; $('#sim-play').textContent = '↻ จำลองอีกครั้ง'; return; }
      const { r, bus, rank } = ev;
      if (bus) simPlay.state.seats[bus].push({ ...r, rank }); else simPlay.state.waitlist.push(r);
      render(simPlay.state, new Set([r.emp]));
      const time = new Date(r.t).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' });
      const b1 = busById[r.c1], b = busById[bus];
      $('#ticker').innerHTML = bus
        ? (rank === 1
          ? `⏱ ${time} · <b>${esc(r.nick)} (${r.emp})</b> → ${b.emoji} ${esc(b.name)} <small>(อันดับ 1)</small>`
          : `⏱ ${time} · <b>${esc(r.nick)} (${r.emp})</b> ${b1.emoji} เต็ม → ได้ ${b.emoji} ${esc(b.name)} <small>(อันดับ 2)</small>`)
        : `⏱ ${time} · <b>${esc(r.nick)} (${r.emp})</b> เต็มทั้ง 2 คัน → รอจัดสรร`;
    }, 70);
  }

  if (CFG.endpoint) {
    loadLive();
    setInterval(loadLive, 20000);
  } else {
    $('#demo-bar').hidden = false;
    $('#sim-play').addEventListener('click', simPlay);
    $('#sim-reset').addEventListener('click', () => { simPlay.log = null; simReset(); });
    // show a filled example on first load so the page isn't empty
    const ex = allocate(mockRows(150), capacity);
    render({ seats: ex.seats, waitlist: ex.waitlist });
    $('#ticker').innerHTML = '<small>ตัวอย่างข้อมูลจำลอง 150 คน — กด “เริ่มจำลองการจอง” เพื่อดูการจองทีละคน</small>';
  }
})();
