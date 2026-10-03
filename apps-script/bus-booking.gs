/**
 * ระบบจองรถบัส Company Trip 2026 (Google Form + Apps Script)
 *
 * กติกา
 *  - เปิดจองตามเวลา OPEN_AT – CLOSE_AT (คำตอบที่ส่งนอกช่วงเวลาไม่นับ)
 *  - เรียงตามเวลาที่ส่ง ใครส่งก่อนได้ก่อน
 *  - เลือกรถ 2 คัน: ถ้าอันดับ 1 เต็ม จะได้อันดับ 2 อัตโนมัติ ถ้าเต็มทั้งคู่ → รายชื่อรอจัดสรร
 *  - 1 รหัสพนักงาน นับเฉพาะคำตอบแรก
 *
 * ติดตั้ง (ทำครั้งเดียว)
 *  1. script.google.com → New project → วางโค้ดนี้ → Save
 *  2. เลือกฟังก์ชัน setup → Run → อนุญาตสิทธิ์
 *     (จะสร้าง Google Form + Google Sheet และตั้งเวลาเปิด/ปิดฟอร์มให้อัตโนมัติ)
 *  3. Deploy → New deployment → Web app
 *     Execute as: Me · Who has access: Anyone → Deploy → คัดลอก URL
 *  4. ใส่ URL ใน bus.html ตรง BUS_CONFIG.endpoint
 */

const CONFIG = {
  OPEN_AT: '2026-10-26T09:00:00+07:00',
  CLOSE_AT: '2026-10-30T17:00:00+07:00',
  CAPACITY: 50,
  BUSES: [
    { id: 1, emoji: '😇', name: 'รถนักบุญ', tag: 'นอนยาวๆ ไม่มีใครรบกวน' },
    { id: 2, emoji: '🎤', name: 'รถร้องเล่น', tag: 'คาราโอเกะ เบาะตามอารมณ์' },
    { id: 3, emoji: '🪩', name: 'รถแดนซ์มันๆ', tag: 'เปิดเพลงแดนซ์ทั้งทาง' },
    { id: 4, emoji: '🃏', name: 'Bus 888', tag: 'วงไพ่ ลุ้นโชค สนุกทั้งทาง (ไม่เล่นเงินจริง)' },
    { id: 5, emoji: '🎉', name: 'รถสุดเหวี่ยง', tag: 'ปาร์ตี้สุดทาง' }
  ]
};

const TITLES = {
  emp: 'รหัสพนักงาน (4 หลัก)',
  nick: 'ชื่อเล่น',
  c1: 'รถที่ชอบที่สุด (อันดับ 1)',
  c2: 'รถอันดับ 2 (ถ้าอันดับ 1 เต็ม จะได้คันนี้อัตโนมัติ)'
};

const busChoice_ = (b) => `${b.id}. ${b.emoji} ${b.name} — ${b.tag}`;
const busIdFromChoice_ = (text) => {
  const m = String(text || '').match(/^(\d+)\./);
  return m ? Number(m[1]) : null;
};
const fmtThai_ = (iso) =>
  Utilities.formatDate(new Date(iso), 'Asia/Bangkok', "d MMM yyyy 'เวลา' HH:mm 'น.'");

function formDescription_() {
  return [
    'เลือกรถบัสที่อยากนั่งไปทริป 20–21 พ.ย. 2569',
    `เปิดจอง: ${fmtThai_(CONFIG.OPEN_AT)}  ·  ปิดจอง: ${fmtThai_(CONFIG.CLOSE_AT)}`,
    '',
    'กติกา',
    '• ใครส่งก่อนได้ก่อน (เรียงตามเวลาที่ส่ง)',
    '• เลือก 2 คัน — ถ้าคันอันดับ 1 เต็ม จะได้คันอันดับ 2 อัตโนมัติ',
    `• รถคันละ ${CONFIG.CAPACITY} ที่นั่ง`,
    '• 1 รหัสพนักงาน นับเฉพาะการจองครั้งแรก'
  ].join('\n');
}

/** รันหลังแก้ CONFIG (จำนวนที่นั่ง / วันเปิด-ปิด): อัปเดตคำอธิบายฟอร์ม + ตั้งเวลาใหม่ + ล้าง cache */
function refreshForm() {
  const form = getForm_();
  form.setDescription(formDescription_());
  const choices = CONFIG.BUSES.map(busChoice_);
  form.getItems(FormApp.ItemType.MULTIPLE_CHOICE).forEach((it) => {
    const title = it.getTitle();
    if (title === TITLES.c1 || title === TITLES.c2) it.asMultipleChoiceItem().setChoiceValues(choices);
  });
  try {
    form.setCustomClosedFormMessage(
      `ยังไม่เปิดจอง หรือปิดจองแล้ว 🙏\nเปิดจอง ${fmtThai_(CONFIG.OPEN_AT)} – ปิด ${fmtThai_(CONFIG.CLOSE_AT)}`);
  } catch (e) {
    Logger.log('ข้ามการแก้ข้อความตอนปิดฟอร์ม (Google ไม่ให้แก้หลังเผยแพร่): ' + e.message);
  }
  scheduleTriggers();
  CacheService.getScriptCache().remove('payload');
  Logger.log('อัปเดตฟอร์มแล้ว: ' + form.getDescription());
}

function setup() {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('FORM_ID')) {
    throw new Error('ติดตั้งไปแล้ว — ถ้าต้องการเริ่มใหม่ ให้ลบ Script Properties ก่อน');
  }

  const form = FormApp.create('จองรถบัส Company Trip 2026 🚌');
  form.setDescription(formDescription_());

  form.addTextItem()
    .setTitle(TITLES.emp)
    .setRequired(true)
    .setValidation(FormApp.createTextValidation()
      .requireTextMatchesPattern('^[0-9]{4}$')
      .setHelpText('กรอกตัวเลข 4 หลัก')
      .build());
  form.addTextItem().setTitle(TITLES.nick).setRequired(true);

  const choices = CONFIG.BUSES.map(busChoice_);
  form.addMultipleChoiceItem().setTitle(TITLES.c1).setChoiceValues(choices).setRequired(true);
  form.addMultipleChoiceItem().setTitle(TITLES.c2).setChoiceValues(choices).setRequired(true);

  const ss = SpreadsheetApp.create('จองรถบัส Company Trip 2026 (คำตอบ)');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  form.setCustomClosedFormMessage(
    `ยังไม่เปิดจอง หรือปิดจองแล้ว 🙏\nเปิดจอง ${fmtThai_(CONFIG.OPEN_AT)} – ปิด ${fmtThai_(CONFIG.CLOSE_AT)}`);
  if (typeof form.setPublished === 'function') form.setPublished(true);
  form.setAcceptingResponses(Date.now() >= +new Date(CONFIG.OPEN_AT) && Date.now() < +new Date(CONFIG.CLOSE_AT));

  props.setProperties({ FORM_ID: form.getId(), SHEET_ID: ss.getId() });
  scheduleTriggers();

  Logger.log('แก้ไขฟอร์ม: ' + form.getEditUrl());
  Logger.log('ลิงก์ให้พนักงาน: ' + form.getPublishedUrl());
  Logger.log('Google Sheet: ' + ss.getUrl());
}

/** ตั้งเวลาเปิด/ปิดรับคำตอบอัตโนมัติ (รันซ้ำได้ถ้าแก้ OPEN_AT / CLOSE_AT) */
function scheduleTriggers() {
  ScriptApp.getProjectTriggers()
    .filter((t) => ['openBooking', 'closeBooking'].includes(t.getHandlerFunction()))
    .forEach((t) => ScriptApp.deleteTrigger(t));
  const now = new Date();
  const open = new Date(CONFIG.OPEN_AT);
  const close = new Date(CONFIG.CLOSE_AT);
  if (open > now) ScriptApp.newTrigger('openBooking').timeBased().at(open).create();
  if (close > now) ScriptApp.newTrigger('closeBooking').timeBased().at(close).create();
}

function openBooking() { getForm_().setAcceptingResponses(true); CacheService.getScriptCache().remove('payload'); }
function closeBooking() { getForm_().setAcceptingResponses(false); CacheService.getScriptCache().remove('payload'); }

function getForm_() {
  return FormApp.openById(PropertiesService.getScriptProperties().getProperty('FORM_ID'));
}

/** จัดที่นั่ง: ใครส่งก่อนได้ก่อน อันดับ 1 เต็ม → อันดับ 2 → รอจัดสรร */
function allocate_(rows) {
  const open = +new Date(CONFIG.OPEN_AT);
  const close = +new Date(CONFIG.CLOSE_AT);
  const seats = {};
  CONFIG.BUSES.forEach((b) => { seats[b.id] = []; });
  const waitlist = [];
  const seen = {};
  rows.slice().sort((a, b) => a.t - b.t).forEach((r) => {
    if (r.t < open || r.t > close || !r.emp) return;
    if (seen[r.emp]) return;
    seen[r.emp] = true;
    const p = { emp: r.emp, nick: r.nick, t: r.t, c1: r.c1, c2: r.c2 };
    if (seats[r.c1] && seats[r.c1].length < CONFIG.CAPACITY) {
      seats[r.c1].push(Object.assign(p, { rank: 1 }));
    } else if (r.c2 && r.c2 !== r.c1 && seats[r.c2] && seats[r.c2].length < CONFIG.CAPACITY) {
      seats[r.c2].push(Object.assign(p, { rank: 2 }));
    } else {
      waitlist.push(p);
    }
  });
  return { seats, waitlist };
}

function readRows_() {
  return getForm_().getResponses().map((res) => {
    const a = {};
    res.getItemResponses().forEach((ir) => { a[ir.getItem().getTitle()] = ir.getResponse(); });
    return {
      t: res.getTimestamp().getTime(),
      emp: String(a[TITLES.emp] || '').trim(),
      nick: String(a[TITLES.nick] || '').trim().slice(0, 20),
      c1: busIdFromChoice_(a[TITLES.c1]),
      c2: busIdFromChoice_(a[TITLES.c2])
    };
  });
}

function buildPayload_() {
  const form = getForm_();
  const { seats, waitlist } = allocate_(readRows_());
  const strip = (p) => ({ emp: p.emp, nick: p.nick, rank: p.rank, t: p.t });
  return {
    updatedAt: new Date().toISOString(),
    openAt: CONFIG.OPEN_AT,
    closeAt: CONFIG.CLOSE_AT,
    capacity: CONFIG.CAPACITY,
    accepting: form.isAcceptingResponses(),
    formUrl: form.getPublishedUrl(),
    buses: CONFIG.BUSES.map((b) => Object.assign({}, b, { seats: seats[b.id].map(strip) })),
    waitlist: waitlist.map((p) => ({ emp: p.emp, nick: p.nick, t: p.t }))
  };
}

/** Web app endpoint ที่หน้า bus.html ดึงไปแสดง (cache 15 วินาที) */
function doGet() {
  const cache = CacheService.getScriptCache();
  let json = cache.get('payload');
  if (!json) {
    json = JSON.stringify(buildPayload_());
    cache.put('payload', json, 15);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
