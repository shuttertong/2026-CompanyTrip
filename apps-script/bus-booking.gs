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

// ---------- สรุปผลแบบสำรวจหลัก แยกรายการเป็นชีต (รัน buildSurveySheets จาก editor; รันซ้ำได้ ชีต "สรุป …" จะถูกสร้างใหม่) ----------
const SURVEY_FORM_SHEET = 'การตอบแบบฟอร์ม 1';
const ACT_RAFT = 'ล่องแก่งเรือยาง';
const ACT_BOAT = 'ล่องเรือชมสันเขื่อน';
const ACT_PRICE = 130;

function surveyKey_(v) {
  const t = String(v).replace(/[^0-9A-Za-z]/g, '');
  return /^\d+$/.test(t) ? String(Number(t)) : t.toLowerCase();
}

/** คำตอบล่าสุดของแต่ละรหัสพนักงาน จับคู่กับชีตรายชื่อพนักงาน */
function surveyPeople_(ss) {
  const tz = 'Asia/Bangkok';
  const empSh = ss.getSheetByName(SURVEY_EMP_SHEET);
  const emps = {};
  const empRows = empSh.getRange(2, 1, empSh.getLastRow() - 1, 9).getValues().filter((r) => String(r[1]).trim() !== '');
  empRows.forEach((r) => { emps[surveyKey_(r[1])] = r; });
  const rows = ss.getSheetByName(SURVEY_FORM_SHEET).getDataRange().getValues().slice(1).filter((r) => r[0] instanceof Date);
  const latest = {};
  rows.forEach((r) => { const k = surveyKey_(r[1]); if (!latest[k] || r[0] > latest[k][0]) latest[k] = r; });
  const s = (v) => String(v == null ? '' : v).replace(/​/g, '').trim();
  const people = Object.keys(latest).map((k) => {
    const r = latest[k]; const e = emps[k];
    const acts = s(r[9]);
    return {
      matched: !!e,
      code: /^\d+$/.test(k) ? ('0000' + k).slice(-4) : (e ? s(e[1]) : s(r[1])),
      name: e ? s(e[6]) : s(r[2]), nick: e ? s(e[7]) : '', section: e ? s(e[3]) : s(r[3]) + ' (จากฟอร์ม)',
      time: Utilities.formatDate(r[0], tz, 'd/M/yy HH:mm'),
      size: s(r[6]), food: s(r[7]), allergy: s(r[8]), acts: acts,
      raft: acts.indexOf(ACT_RAFT) >= 0, boat: acts.indexOf(ACT_BOAT) >= 0, noAct: acts.indexOf('ไม่เข้าร่วม') >= 0,
      travel: s(r[10]), line: s(r[11]), when: s(r[12]) || s(r[14]), vanPhone: s(r[13]) || s(r[16]), pickup: s(r[15]), contact: s(r[17])
    };
  });
  people.sort((a, b) => a.section.localeCompare(b.section) || a.code.localeCompare(b.code));
  return { people: people, empCount: empRows.length, joinCount: empRows.filter((r) => String(r[8]).indexOf('ไม่เข้าร่วม') !== 0).length, responses: rows.length };
}

function countBy_(people, fn, order) {
  const m = {};
  people.forEach((p) => { const k = fn(p); m[k] = (m[k] || 0) + 1; });
  const keys = Object.keys(m).sort((a, b) => {
    const ia = order ? order.indexOf(a) : -1, ib = order ? order.indexOf(b) : -1;
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || m[b] - m[a];
  });
  const total = people.length || 1;
  return keys.map((k) => [k, m[k], Math.round((m[k] / total) * 1000) / 10 + '%']).concat([['รวม', people.length, '100%']]);
}

function pivot_(people, fn, options) {
  const secs = []; const m = {};
  people.forEach((p) => {
    if (!m[p.section]) { m[p.section] = {}; secs.push(p.section); }
    const k = fn(p); m[p.section][k] = (m[p.section][k] || 0) + 1;
  });
  const rows = secs.map((sec) => [sec].concat(options.map((o) => m[sec][o] || 0), [options.reduce((a, o) => a + (m[sec][o] || 0), 0)]));
  rows.push(['รวม'].concat(options.map((o) => people.filter((p) => fn(p) === o).length), [people.length]));
  return { header: ['แผนก'].concat(options, ['รวม']), rows: rows };
}

/** blocks: [{ title, header, rows, text }] เรียงต่อกันแนวตั้ง; text=true เก็บเป็นข้อความ (รหัส/เบอร์โทรไม่เสียเลข 0) */
function writeSheet_(ss, name, title, blocks) {
  const old = ss.getSheetByName(name);
  if (old) ss.deleteSheet(old);
  const sh = ss.insertSheet(name, ss.getNumSheets());
  sh.getRange(1, 1).setValue(title).setFontSize(14).setFontWeight('bold');
  sh.getRange(2, 1).setValue('อัปเดต ' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'd/M/yyyy HH:mm') + ' · นับคำตอบล่าสุดของแต่ละรหัสพนักงาน').setFontColor('#666666');
  let row = 4; let maxCols = 1;
  blocks.forEach((b) => {
    sh.getRange(row, 1).setValue(b.title).setFontWeight('bold').setFontSize(12).setFontColor('#08231f');
    row++;
    const n = b.header.length; maxCols = Math.max(maxCols, n);
    sh.getRange(row, 1, 1, n).setValues([b.header]).setFontWeight('bold').setBackground('#08231f').setFontColor('#ffffff').setWrap(true).setVerticalAlignment('middle');
    row++;
    if (b.rows.length) {
      const rg = sh.getRange(row, 1, b.rows.length, n);
      if (b.text) rg.setNumberFormat('@');
      rg.setValues(b.rows).setVerticalAlignment('top').setBorder(true, true, true, true, true, true, '#d8c9aa', SpreadsheetApp.BorderStyle.SOLID);
      if (!b.text && b.total !== false) sh.getRange(row + b.rows.length - 1, 1, 1, n).setFontWeight('bold').setBackground('#f4efe4');
      row += b.rows.length;
    } else {
      sh.getRange(row, 1).setValue('(ไม่มี)'); row++;
    }
    row += 2;
  });
  sh.autoResizeColumns(1, maxCols);
  for (let c = 1; c <= maxCols; c++) if (sh.getColumnWidth(c) > 320) sh.setColumnWidth(c, 320);
  if (sh.getColumnWidth(1) < 150) sh.setColumnWidth(1, 150);
  return sh;
}

function isAllergic_(t) { return /กุ้ง|ปู|หอย|หมึก|หมู|ปลา|สัตว์ปีก|ไก่|เป็ด|นม|ถั่ว|ไข่|ทะเล|เนื้อ|แป้ง|ผัก|เห็ด/.test(t); }

function buildSurveySheets() {
  const ss = SpreadsheetApp.openById(SURVEY_SHEET_ID);
  const d = surveyPeople_(ss); const P = d.people;
  const who = (p) => [p.code, p.name, p.nick, p.section];
  const WHO = ['รหัส', 'ชื่อ-สกุล', 'ชื่อเล่น', 'แผนก'];
  const by = (fn) => P.slice().sort((a, b) => String(fn(a)).localeCompare(String(fn(b))) || a.section.localeCompare(b.section) || a.code.localeCompare(b.code));

  // 1 ไซซ์เสื้อ
  const SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL', 'มากกว่า 3XL ขึ้นไป'];
  const pvS = pivot_(P, (p) => p.size, SIZES);
  const sizeRows = P.slice().sort((a, b) => SIZES.indexOf(a.size) - SIZES.indexOf(b.size) || a.section.localeCompare(b.section) || a.code.localeCompare(b.code));
  writeSheet_(ss, 'สรุป 1 ไซซ์เสื้อ', '3.2 ไซซ์เสื้อ — สรุปจำนวนสั่งทำ', [
    { title: 'จำนวนตามไซซ์', header: ['ไซซ์', 'จำนวน (ตัว)', '%'], rows: countBy_(P, (p) => p.size, SIZES) },
    { title: 'แยกตามแผนก', header: pvS.header, rows: pvS.rows },
    { title: 'รายละเอียดรายคน', header: WHO.concat(['ไซซ์']), rows: sizeRows.map((p) => who(p).concat([p.size])), text: true }
  ]);

  // 2 อาหารเช้า
  const foods = countBy_(P, (p) => p.food).slice(0, -1).map((r) => r[0]);
  const pvF = pivot_(P, (p) => p.food, foods);
  writeSheet_(ss, 'สรุป 2 อาหารเช้า', '3.3 อาหารเช้า — สรุปจำนวนสั่ง', [
    { title: 'จำนวนตามเมนู', header: ['เมนู', 'จำนวน (ชุด)', '%'], rows: countBy_(P, (p) => p.food) },
    { title: 'แยกตามแผนก', header: pvF.header, rows: pvF.rows },
    { title: 'รายละเอียดรายคน', header: WHO.concat(['เมนู', 'แพ้อาหาร (ตามที่กรอก)']), rows: by((p) => p.food).map((p) => who(p).concat([p.food, p.allergy])), text: true }
  ]);

  // 3 แพ้อาหาร
  const al = P.filter((p) => isAllergic_(p.allergy));
  const odd = P.filter((p) => !isAllergic_(p.allergy) && !/^ไม่แพ้$/.test(p.allergy));
  writeSheet_(ss, 'สรุป 3 แพ้อาหาร', '3.4 แพ้อาหาร — รายชื่อที่ต้องแจ้งครัว/ร้านอาหาร', [
    { title: 'สรุป', header: ['รายการ', 'จำนวน (คน)', '%'], rows: countBy_(P, (p) => (isAllergic_(p.allergy) ? 'ระบุอาหารที่แพ้/ทานไม่ได้' : 'ไม่แพ้'), ['ระบุอาหารที่แพ้/ทานไม่ได้', 'ไม่แพ้']) },
    { title: 'ผู้ที่ระบุอาหารที่แพ้/ทานไม่ได้ (ควรยืนยันกับเจ้าตัว)', header: WHO.concat(['ที่กรอก', 'อาหารเช้าที่เลือก']), rows: al.map((p) => who(p).concat([p.allergy, p.food])), text: true },
    { title: 'คำตอบอื่น ๆ ที่ตีความว่า "ไม่แพ้" (ตรวจทานได้)', header: WHO.concat(['ที่กรอก']), rows: odd.map((p) => who(p).concat([p.allergy])), text: true }
  ]);

  // 4 กิจกรรมเสริม
  const act = P.filter((p) => p.raft || p.boat);
  const nRaft = P.filter((p) => p.raft).length, nBoat = P.filter((p) => p.boat).length;
  const pvA = pivot_(P, (p) => (p.raft && p.boat ? 'ทั้ง 2 กิจกรรม' : p.raft ? 'ล่องแก่งเรือยาง' : p.boat ? 'ล่องเรือชมเขื่อน' : 'ไม่เข้าร่วม'), ['ล่องแก่งเรือยาง', 'ล่องเรือชมเขื่อน', 'ทั้ง 2 กิจกรรม', 'ไม่เข้าร่วม']);
  writeSheet_(ss, 'สรุป 4 กิจกรรมเสริม', '3.5 กิจกรรมเสริม (พนักงานชำระเอง ' + ACT_PRICE + ' บาท/ท่าน/กิจกรรม)', [
    { title: 'จำนวนตามกิจกรรม', header: ['กิจกรรม', 'จำนวน (คน)', 'ยอดเงิน (บาท)'], rows: [
      ['ล่องแก่งเรือยาง ลำน้ำเพชรบุรี 9 กม.', nRaft, nRaft * ACT_PRICE],
      ['ล่องเรือชมสันเขื่อนแก่งกระจาน + ถ่ายภาพสะพานแขวน', nBoat, nBoat * ACT_PRICE],
      ['รวม (คน-กิจกรรม) · มีผู้เข้าร่วมอย่างน้อย 1 กิจกรรม ' + act.length + ' คน · ไม่เข้าร่วม ' + (P.length - act.length) + ' คน', nRaft + nBoat, (nRaft + nBoat) * ACT_PRICE]] },
    { title: 'แยกตามแผนก (คน)', header: pvA.header, rows: pvA.rows },
    { title: 'รายละเอียดผู้เข้าร่วมกิจกรรม', header: WHO.concat(['ล่องแก่งเรือยาง', 'ล่องเรือชมเขื่อน', 'ยอดชำระ (บาท)', 'เบอร์โทร', 'หมายเหตุ']),
      rows: act.map((p) => who(p).concat([p.raft ? '✔' : '', p.boat ? '✔' : '', String(((p.raft ? 1 : 0) + (p.boat ? 1 : 0)) * ACT_PRICE), p.vanPhone || p.contact, p.noAct ? 'เลือก "ไม่เข้าร่วม" มาด้วย — ควรยืนยัน' : ''])), text: true }
  ]);

  // 5 การเดินทางมาบริษัท
  const mode = (p) => (p.travel.indexOf('ด้วยตนเอง') >= 0 ? 'เดินทางมาเอง' : p.travel.indexOf('ไม่เคย') >= 0 ? 'ขอรถตู้ (ไม่เคยนั่งประจำ)' : 'รถตู้สายประจำ');
  const MODES = ['เดินทางมาเอง', 'รถตู้สายประจำ', 'ขอรถตู้ (ไม่เคยนั่งประจำ)'];
  const pvT = pivot_(P, mode, MODES);
  writeSheet_(ss, 'สรุป 5 การเดินทาง', 'Confirm การเดินทางมาถึงบริษัทก่อน 06:30 น.', [
    { title: 'จำนวนตามวิธีเดินทาง', header: ['วิธีเดินทาง', 'จำนวน (คน)', '%'], rows: countBy_(P, mode, MODES) },
    { title: 'แยกตามแผนก', header: pvT.header, rows: pvT.rows },
    { title: 'รายละเอียดรายคน', header: WHO.concat(['วิธีเดินทาง', 'สายรถตู้ / จุดขึ้น', 'เบอร์โทร']),
      rows: P.slice().sort((a, b) => MODES.indexOf(mode(a)) - MODES.indexOf(mode(b)) || a.section.localeCompare(b.section) || a.code.localeCompare(b.code)).map((p) => who(p).concat([mode(p), p.line || p.pickup, p.vanPhone || p.contact])), text: true }
  ]);

  // 6 รถตู้
  const van = P.filter((p) => p.line); const fresh = P.filter((p) => !p.line && mode(p) !== 'เดินทางมาเอง');
  const lines = countBy_(van, (p) => p.line).slice(0, -1).map((r) => r[0]);
  const short = (w) => (w.indexOf('เฉพาะตอนไป') >= 0 ? 'เฉพาะตอนไป' : w ? 'ไป-กลับ' : '');
  const lineRows = lines.map((l) => { const g = van.filter((p) => p.line === l); const one = g.filter((p) => short(p.when) === 'เฉพาะตอนไป').length; return [l, g.length, g.length - one, one]; });
  lineRows.push(['รวม', van.length, van.filter((p) => short(p.when) === 'ไป-กลับ').length, van.filter((p) => short(p.when) === 'เฉพาะตอนไป').length]);
  writeSheet_(ss, 'สรุป 6 รถตู้', 'ข้อ 4–5 รถตู้รับ-ส่ง — จำนวนตามสายและรายชื่อผู้โดยสาร', [
    { title: 'จำนวนตามสายรถตู้ (ผู้นั่งประจำ)', header: ['สาย', 'รวม (คน)', 'ไป-กลับ', 'เฉพาะตอนไป'], rows: lineRows },
    { title: 'ขอรถตู้เพิ่ม (ไม่เคยนั่งประจำ) — ต้องจัดสาย', header: WHO.concat(['จุดขึ้น-ลง', 'ช่วงเวลา', 'เบอร์โทร']), rows: fresh.map((p) => who(p).concat([p.pickup, short(p.when), p.vanPhone])), text: true },
    { title: 'รายชื่อผู้โดยสารตามสาย', header: ['สาย'].concat(WHO, ['ช่วงเวลา', 'เบอร์โทร']),
      rows: van.slice().sort((a, b) => lines.indexOf(a.line) - lines.indexOf(b.line) || a.section.localeCompare(b.section) || a.code.localeCompare(b.code)).map((p) => [p.line].concat(who(p), [short(p.when), p.vanPhone])), text: true }
  ]);

  // 0 ภาพรวม (สร้างท้ายสุดแล้วย้ายมาไว้หน้าชีตสรุป)
  const un = P.filter((p) => !p.matched);
  const ov = writeSheet_(ss, 'สรุป 0 ภาพรวม', 'สรุปผลแบบสำรวจ Company Trip 2026', [
    { title: 'ภาพรวมการตอบ', total: false, header: ['รายการ', 'จำนวน', 'หมายเหตุ'], rows: [
      ['พนักงานทั้งหมดในรายชื่อ', d.empCount, ''],
      ['แจ้งเข้าร่วม (คอลัมน์ Check)', d.joinCount, ''],
      ['คำตอบในฟอร์มทั้งหมด (แถว)', d.responses, 'รวมคำตอบซ้ำ ' + (d.responses - P.length) + ' แถว'],
      ['ผู้ตอบไม่ซ้ำ (ใช้คำตอบล่าสุด)', P.length, 'ตัวเลขในทุกชีตสรุปนับจากจำนวนนี้'],
      ['รหัสที่ไม่พบในรายชื่อพนักงาน', un.length, un.map((p) => p.code + ' ' + p.name).join(', ')]] },
    { title: 'ไซซ์เสื้อ → ชีต "สรุป 1 ไซซ์เสื้อ"', header: ['ไซซ์', 'จำนวน', '%'], rows: countBy_(P, (p) => p.size, SIZES) },
    { title: 'อาหารเช้า → ชีต "สรุป 2 อาหารเช้า"', header: ['เมนู', 'จำนวน', '%'], rows: countBy_(P, (p) => p.food) },
    { title: 'แพ้อาหาร → ชีต "สรุป 3 แพ้อาหาร"', total: false, header: ['รายการ', 'จำนวน', 'รายละเอียด'], rows: [['ระบุอาหารที่แพ้/ทานไม่ได้', al.length, al.map((p) => (p.nick || p.name) + ': ' + p.allergy).join(' · ')], ['ไม่แพ้', P.length - al.length, '']] },
    { title: 'กิจกรรมเสริม → ชีต "สรุป 4 กิจกรรมเสริม"', header: ['กิจกรรม', 'จำนวน (คน)', 'ยอดเงิน (บาท)'], rows: [['ล่องแก่งเรือยาง', nRaft, nRaft * ACT_PRICE], ['ล่องเรือชมเขื่อน', nBoat, nBoat * ACT_PRICE], ['รวม', nRaft + nBoat, (nRaft + nBoat) * ACT_PRICE]] },
    { title: 'การเดินทาง → ชีต "สรุป 5 การเดินทาง" / "สรุป 6 รถตู้"', header: ['วิธีเดินทาง', 'จำนวน', '%'], rows: countBy_(P, mode, MODES) }
  ]);
  try { ss.setActiveSheet(ov); ss.moveActiveSheet(ss.getNumSheets() - 6); } catch (err) { /* ลำดับชีตไม่สำคัญ */ }
  return P.length;
}
