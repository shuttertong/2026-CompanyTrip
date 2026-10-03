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
 *  5. (ถ้าต้องการชื่อ/แผนก/รูปบนรถ) รัน setupEmployeeSheet แล้วกรอกชีต Employees
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


// ---------- ข้อมูลพนักงาน (ชีตที่ 2) สำหรับแสดงชื่อ แผนก และรูปบนรถในแอนิเมชัน ----------
const EMP_SHEET = 'Employees';
const GUIDE_SHEET = 'คู่มือการกรอก';
const EMP_HEADERS = ['emp_id', 'short_name', 'short_section', 'emp_pic_path'];
const SECTIONS = ['Personnel&GA', 'Account', 'Import & Logistic', 'IT', 'SALES-1', 'SALES-2', 'SALES-3', 'SALES-4', 'SALES-5', 'PC', 'Quality', 'Rework/Repack', 'Safety', 'FACTORY DEPT./PD SUPPORT', 'Slitter-1', 'Slitter-2', 'Slitter-3', 'M1', 'M2', 'M3', 'M4', 'SHEAR', 'Delivery-1', 'Delivery-2', 'SKID', 'MS1', 'L1', 'Maintenance', 'PD Support'];

/** สร้างชีต Employees (ชีตที่ 2) + ชีตคู่มือ ใน Google Sheet เดียวกับคำตอบ (รันซ้ำได้ ไม่ลบข้อมูลเดิม) */
function setupEmployeeSheet() {
  const ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEET_ID'));
  let sh = ss.getSheetByName(EMP_SHEET);
  if (!sh) sh = ss.insertSheet(EMP_SHEET, 1);
  sh.getRange(1, 1, 1, EMP_HEADERS.length).setValues([EMP_HEADERS])
    .setFontWeight('bold').setBackground('#0f2a44').setFontColor('#ffffff').setHorizontalAlignment('center');
  sh.setFrozenRows(1);
  const notes = [
    'รหัสพนักงาน 4 หลัก ต้องตรงกับที่กรอกในฟอร์มจองรถ (เช่น 0123, 2034)',
    'ชื่อเล่นสั้น ๆ ที่จะแสดงบนรถ (ไม่เกิน 10 ตัวอักษร) เว้นว่าง = ใช้ชื่อเล่นจากฟอร์ม',
    'ชื่อแผนกแบบย่อ เลือกจากรายการ หรือพิมพ์เองได้ (เช่น IT, ACC, SALES-1)',
    'ลิงก์รูปหน้าตรง: ลิงก์แชร์ Google Drive / File ID / ลิงก์รูปสาธารณะ (.jpg .png) เว้นว่าง = ใช้ตัวการ์ตูน'
  ];
  notes.forEach((n, i) => sh.getRange(1, i + 1).setNote(n));
  const maxRows = Math.max(sh.getMaxRows(), 400);
  if (sh.getMaxRows() < maxRows) sh.insertRowsAfter(sh.getMaxRows(), maxRows - sh.getMaxRows());
  sh.getRange(2, 1, maxRows - 1, 1).setNumberFormat('@');
  sh.getRange(2, 1, maxRows - 1, 1).setDataValidation(SpreadsheetApp.newDataValidation()
    .requireFormulaSatisfied('=OR(A2="",REGEXMATCH(TO_TEXT(A2),"^[0-9]{4}$"))')
    .setHelpText('กรอกรหัสพนักงาน 4 หลัก').setAllowInvalid(false).build());
  sh.getRange(2, 3, maxRows - 1, 1).setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList(SECTIONS, true).setAllowInvalid(true).build());
  [90, 140, 200, 420].forEach((w, i) => sh.setColumnWidth(i + 1, w));
  sh.getRange('A1:D1').setBorder(true, true, true, true, true, true);

  let g = ss.getSheetByName(GUIDE_SHEET);
  if (!g) g = ss.insertSheet(GUIDE_SHEET, 2);
  g.clear();
  const rows = [
    ['คู่มือการกรอกชีต Employees (ใช้แสดงชื่อ แผนก และรูปบนรถบัสในแอนิเมชัน)', ''],
    ['', ''],
    ['คอลัมน์', 'วิธีกรอก'],
    ['emp_id', 'รหัสพนักงาน 4 หลัก ตรงกับที่พนักงานกรอกในฟอร์มจองรถ (คอลัมน์นี้เก็บเป็นข้อความ จึงพิมพ์ 0 นำหน้าได้)'],
    ['short_name', 'ชื่อเล่นที่จะแสดงเหนือหัวตัวการ์ตูน ไม่เกิน 10 ตัวอักษร (เว้นว่างได้ ระบบจะใช้ชื่อเล่นจากฟอร์ม)'],
    ['short_section', 'แผนกแบบย่อ เช่น IT, ACC, SALES-1 จะแสดงตอนชี้ที่ตัวการ์ตูนและในรายชื่อ'],
    ['emp_pic_path', 'รูปหน้าตรงของพนักงาน รองรับ 3 แบบ:\n1) ลิงก์แชร์ Google Drive เช่น https://drive.google.com/file/d/xxxxxxxx/view\n2) File ID ของ Google Drive\n3) ลิงก์รูปสาธารณะที่ลงท้าย .jpg / .png'],
    ['', ''],
    ['คำแนะนำรูปภาพ', '• รูปสี่เหลี่ยมจัตุรัส หน้าอยู่กลางภาพ พื้นหลังเรียบ\n• ขนาดไม่เกิน 2 MB (ระบบย่อเหลือ ~200px ให้อัตโนมัติ)\n• เก็บรูปในโฟลเดอร์ Drive ของบัญชีเจ้าของสคริปต์ หรือแชร์ให้บัญชีนั้นอ่านได้'],
    ['ความเป็นส่วนตัว', 'หน้าเว็บเป็นสาธารณะ: จะแสดงรูป/ชื่อ/แผนก เฉพาะคนที่จองรถแล้วเท่านั้น ควรได้รับความยินยอมจากพนักงานก่อนใส่รูป'],
    ['อัปเดตเมื่อไร', 'แก้ชีตได้ตลอด หน้าเว็บจะดึงข้อมูลใหม่ภายในประมาณ 1 นาที']
  ];
  g.getRange(1, 1, rows.length, 2).setValues(rows).setVerticalAlignment('top').setWrap(true);
  g.getRange('A1').setFontSize(14).setFontWeight('bold');
  g.getRange('A3:B3').setFontWeight('bold').setBackground('#0f2a44').setFontColor('#ffffff');
  g.getRange('A4:A11').setFontWeight('bold');
  g.setColumnWidth(1, 160); g.setColumnWidth(2, 640);
  ss.setActiveSheet(sh);
  Logger.log('สร้างชีต Employees + คู่มือ แล้ว: ' + ss.getUrl());
}

function readEmployees_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('employees');
  if (hit) return JSON.parse(hit);
  const ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEET_ID'));
  const sh = ss.getSheetByName(EMP_SHEET);
  const map = {};
  if (sh && sh.getLastRow() > 1) {
    sh.getRange(2, 1, sh.getLastRow() - 1, 4).getDisplayValues().forEach(([id, name, sec, pic]) => {
      id = String(id).trim();
      if (/^[0-9]{4}$/.test(id)) map[id] = { name: String(name).trim().slice(0, 12), section: String(sec).trim().slice(0, 24), pic: String(pic).trim() };
    });
  }
  cache.put('employees', JSON.stringify(map), 60);
  return map;
}

function driveId_(path) {
  const m = String(path).match(/(?:\/d\/|id=)([A-Za-z0-9_-]{20,})/);
  if (m) return m[1];
  return /^[A-Za-z0-9_-]{25,}$/.test(path) ? path : null;
}

/** รูปพนักงาน (ย่อแล้ว) เป็น data URL — ให้เฉพาะคนที่จองรถแล้ว */
function picFor_(emp) {
  const cache = CacheService.getScriptCache();
  const key = 'pic_' + emp;
  const hit = cache.get(key);
  if (hit) return hit;
  const e = readEmployees_()[emp];
  if (!e || !e.pic) return '';
  let blob = null;
  try {
    const id = driveId_(e.pic);
    if (id) {
      const res = UrlFetchApp.fetch('https://drive.google.com/thumbnail?sz=w200&id=' + id,
        { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
      blob = res.getResponseCode() === 200 ? res.getBlob() : DriveApp.getFileById(id).getThumbnail();
    } else if (/^https:\/\//.test(e.pic)) {
      const res = UrlFetchApp.fetch(e.pic, { muteHttpExceptions: true });
      if (res.getResponseCode() === 200) blob = res.getBlob();
    }
  } catch (err) {
    Logger.log('โหลดรูปไม่ได้ ' + emp + ': ' + err.message);
  }
  if (!blob) return '';
  const src = 'data:' + (blob.getContentType() || 'image/jpeg') + ';base64,' + Utilities.base64Encode(blob.getBytes());
  if (src.length < 95000) cache.put(key, src, 21600);
  return src.length < 400000 ? src : '';
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
  const emps = readEmployees_();
  const strip = (p) => {
    const e = emps[p.emp] || {};
    return { emp: p.emp, nick: e.name || p.nick, section: e.section || '', pic: !!e.pic, rank: p.rank, t: p.t };
  };
  return {
    updatedAt: new Date().toISOString(),
    openAt: CONFIG.OPEN_AT,
    closeAt: CONFIG.CLOSE_AT,
    capacity: CONFIG.CAPACITY,
    accepting: form.isAcceptingResponses(),
    formUrl: form.getPublishedUrl(),
    buses: CONFIG.BUSES.map((b) => Object.assign({}, b, { seats: seats[b.id].map(strip) })),
    waitlist: waitlist.map((p) => ({ emp: p.emp, nick: (emps[p.emp] || {}).name || p.nick, section: (emps[p.emp] || {}).section || '', t: p.t }))
  };
}


// ---------- สรุปการตอบแบบสำรวจหลัก (สำหรับหน้า survey-status.html) ----------
// อ่านจากชีต "รายชื่อพนักงาน" ของไฟล์คำตอบแบบสำรวจ: D=Section, H=Nick Name, I=Check, J=เวลาตอบล่าสุด, R=สถานะการกรอก
const SURVEY_SHEET_ID = '1xBILAH3otwEE_XllL2Lr1zExX724JEr2P_ywLraC6VE';
const SURVEY_EMP_SHEET = 'รายชื่อพนักงาน';
const SURVEY_DEADLINE = '2026-10-08T23:59:00+07:00';

function surveySummary_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('survey');
  if (hit) return hit;
  const sh = SpreadsheetApp.openById(SURVEY_SHEET_ID).getSheetByName(SURVEY_EMP_SHEET);
  const rows = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 18).getDisplayValues();
  const order = []; const map = {};
  rows.forEach((r) => {
    const code = String(r[1]).trim(); if (!code) return;
    const section = String(r[3]).trim() || '-';
    const status = String(r[17]);
    const st = status.indexOf('✅') === 0 ? 'done' : status.indexOf('⚠') === 0 ? 'partial' : status.indexOf('❌') === 0 ? 'pending' : 'out';
    if (!map[section]) { map[section] = { name: section, people: [] }; order.push(section); }
    map[section].people.push({
      nick: String(r[7]).trim().slice(0, 16),
      st: st,
      t: st === 'done' || st === 'partial' ? String(r[9]).trim() : '',
      note: st === 'partial' ? status.replace(/^[^:]*:\s*/, '').slice(0, 80) : ''
    });
  });
  const json = JSON.stringify({ updatedAt: new Date().toISOString(), deadline: SURVEY_DEADLINE, sections: order.map((k) => map[k]) });
  cache.put('survey', json, 60);
  return json;
}

/** Web app endpoint ที่หน้า bus.html ดึงไปแสดง (cache 15 วินาที) */
function doGet(e) {
  if (e && e.parameter && e.parameter.summary) {
    return ContentService.createTextOutput(surveySummary_()).setMimeType(ContentService.MimeType.JSON);
  }
  const emp = e && e.parameter && e.parameter.pic;
  if (emp) {
    let src = '';
    if (/^[0-9]{4}$/.test(emp)) {
      const booked = JSON.parse(cachedPayload_()).buses.some((b) => b.seats.some((p) => p.emp === emp));
      if (booked) src = picFor_(emp);
    }
    return ContentService.createTextOutput(JSON.stringify({ emp, src })).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(cachedPayload_()).setMimeType(ContentService.MimeType.JSON);
}

function cachedPayload_() {
  const cache = CacheService.getScriptCache();
  let json = cache.get('payload');
  if (!json) {
    json = JSON.stringify(buildPayload_());
    cache.put('payload', json, 15);
  }
  return json;
}
