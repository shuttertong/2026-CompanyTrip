/* Survey status: ดึงสรุปจาก Apps Script (?summary=1) แล้วแสดงแยกตามแผนก */
(() => {
  const C = window.SUMMARY_CONFIG || {};
  const $ = (s) => document.querySelector(s);
  const DEMO = new URLSearchParams(location.search).has('demo') || !C.endpoint;
  const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  let data = null, filter = 'all', q = '', sort = 'pct';

  const menuBtn = $('.menu-btn'), menu = $('#menu');
  if (menuBtn) menuBtn.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', open);
  });

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // "3/10/26 14:05" -> { key: sortable number, label: "3 ต.ค. 14:05" }
  function parseT(t) {
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2})/.exec(t || '');
    if (!m) return { key: 0, label: t || '' };
    const [, d, mo, y, h, mi] = m.map(Number);
    return { key: ((y % 100) * 1e8) + mo * 1e6 + d * 1e4 + h * 100 + mi, label: `${d} ${MONTHS[mo - 1] || ''} ${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')} น.` };
  }

  function stats(people) {
    const s = { done: 0, partial: 0, pending: 0, out: 0 };
    people.forEach((p) => { s[p.st] = (s[p.st] || 0) + 1; });
    s.need = s.done + s.partial + s.pending;
    s.pct = s.need ? Math.round((s.done / s.need) * 100) : 100;
    return s;
  }

  function renderTotals() {
    const all = stats(data.sections.flatMap((s) => s.people));
    $('#st-need').textContent = all.need;
    $('#st-done').textContent = all.done;
    $('#st-partial').textContent = all.partial;
    $('#st-pending').textContent = all.pending;
    $('#sum-pct').textContent = all.pct + '%';
    $('#sum-ring').style.setProperty('--p', all.pct);
    const out = all.out ? ` · ไม่เข้าร่วม ${all.out} คน (ไม่นับ)` : '';
    $('#sum-state').textContent = (DEMO ? 'ข้อมูลจำลอง (demo)' : 'ข้อมูลสดจากแบบสำรวจ · อัปเดตทุก 1 นาที') + out;
    const u = new Date(data.updatedAt);
    $('#updated-at').textContent = 'อัปเดตล่าสุด ' + u.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
  }

  function renderSections() {
    const needle = q.trim().toLowerCase();
    let secs = data.sections.map((s) => ({ ...s, s: stats(s.people) })).filter((s) => s.s.need > 0);
    secs.sort(sort === 'name' ? (a, b) => a.name.localeCompare(b.name, 'th')
      : sort === 'left' ? (a, b) => (b.s.need - b.s.done) - (a.s.need - a.s.done)
      : (a, b) => b.s.pct - a.s.pct || b.s.need - a.s.need);
    const html = secs.map((sec) => {
      const secHit = needle && sec.name.toLowerCase().includes(needle);
      const ppl = sec.people.filter((p) => p.st !== 'out')
        .filter((p) => filter === 'all' || (filter === 'done' ? p.st !== 'pending' : p.st !== 'done'))
        .filter((p) => !needle || secHit || p.nick.toLowerCase().includes(needle))
        .map((p) => ({ ...p, T: parseT(p.t) }))
        .sort((a, b) => (a.st === 'pending') - (b.st === 'pending') || a.T.key - b.T.key || a.nick.localeCompare(b.nick, 'th'));
      if (!ppl.length) return '';
      const rows = ppl.map((p) => `<li class="${p.st}"><span class="who">${esc(p.nick || '(ไม่มีชื่อเล่น)')}${p.note ? `<small>${esc(p.note)}</small>` : ''}</span>${p.st === 'pending' ? '<span class="t">ยังไม่ส่ง</span>' : `<time>${esc(p.T.label)}</time>`}</li>`).join('');
      return `<article class="sec${sec.s.pct === 100 ? ' full' : ''}">
        <div class="sec-head"><h3>${sec.s.pct === 100 ? '🏆 ' : ''}${esc(sec.name)}</h3><span class="n"><b>${sec.s.done}</b>/${sec.s.need} · ${sec.s.pct}%</span></div>
        <div class="bar" role="img" aria-label="ส่งแล้ว ${sec.s.pct}%"><i style="width:${sec.s.pct}%"></i></div>
        <ul class="ppl">${rows}</ul>
        ${sec.s.out ? `<p class="out">ไม่เข้าร่วม ${sec.s.out} คน</p>` : ''}
      </article>`;
    }).join('');
    $('#sum-grid').innerHTML = html || '<p class="sum-empty">ไม่พบรายการที่ตรงกับตัวกรอง</p>';
  }

  function renderRecent() {
    const rec = data.sections.flatMap((s) => s.people.filter((p) => p.t).map((p) => ({ ...p, sec: s.name, T: parseT(p.t) })))
      .sort((a, b) => b.T.key - a.T.key).slice(0, 12);
    $('#sum-recent').innerHTML = rec.length
      ? rec.map((p) => `<li><div><b>${esc(p.nick)}</b> <em>· ${esc(p.sec)}</em></div><span>${esc(p.T.label)}</span></li>`).join('')
      : '<li>ยังไม่มีคนส่ง</li>';
  }

  function render() { if (!data) return; renderTotals(); renderSections(); renderRecent(); }

  function tickDeadline() {
    const ms = new Date((data && data.deadline) || C.deadline) - Date.now();
    const el = $('#sum-left');
    if (ms <= 0) { el.textContent = 'ปิดรับแล้ว'; return; }
    const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24;
    el.textContent = d ? `เหลืออีก ${d} วัน ${h} ชม.` : `เหลืออีก ${h} ชม. ${Math.floor(ms / 6e4) % 60} นาที`;
  }

  function demoData() {
    const secs = ['Production 1', 'Production 2', 'QA', 'Maintenance', 'Warehouse', 'HR & GA', 'Accounting', 'Engineering'];
    const nicks = ['ต้น', 'ฝน', 'เบียร์', 'มายด์', 'บอส', 'แนน', 'ก้อง', 'ปุ๊ก', 'โอ๊ต', 'มิ้นท์', 'เจมส์', 'พลอย', 'อาร์ม', 'แพร', 'นัท', 'ออม'];
    let k = 7; const rnd = () => (k = (k * 16807) % 2147483647) / 2147483647;
    return {
      updatedAt: new Date().toISOString(), deadline: C.deadline,
      sections: secs.map((name, i) => ({
        name, people: Array.from({ length: 5 + Math.floor(rnd() * 12) }, () => {
          const r = rnd(); const st = i === 5 ? 'done' : r < .45 ? 'done' : r < .5 ? 'partial' : r < .9 ? 'pending' : 'out';
          return { nick: nicks[Math.floor(rnd() * nicks.length)], st, note: st === 'partial' ? 'ขาด: ไซซ์เสื้อ' : '',
            t: st === 'done' || st === 'partial' ? `${1 + Math.floor(rnd() * 3)}/10/26 ${String(8 + Math.floor(rnd() * 10)).padStart(2, '0')}:${String(Math.floor(rnd() * 60)).padStart(2, '0')}` : '' };
        })
      }))
    };
  }

  async function load(retry) {
    if (DEMO) { data = demoData(); render(); return; }
    try {
      const r = await fetch(C.endpoint + '?summary=1', { redirect: 'follow' });
      const j = JSON.parse(await r.text());
      if (!j.sections) throw new Error('no sections');
      data = j; render(); tickDeadline();
    } catch (e) {
      if (retry) return setTimeout(() => load(false), 1500);
      if (!data) $('#sum-state').textContent = 'โหลดข้อมูลไม่สำเร็จ ลองรีเฟรชอีกครั้ง';
    }
  }

  document.querySelectorAll('.chip').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach((x) => x.classList.toggle('on', x === b));
    filter = b.dataset.f; if (data) renderSections();
  }));
  $('#sum-q').addEventListener('input', (e) => { q = e.target.value; if (data) renderSections(); });
  $('#sum-sort').addEventListener('change', (e) => { sort = e.target.value; if (data) renderSections(); });

  tickDeadline(); setInterval(tickDeadline, 60000);
  load(true); setInterval(() => load(false), 60000);
})();
