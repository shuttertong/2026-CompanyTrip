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

// ---------- สรุปผลแบบสำรวจหลัก แยกรายการเป็นชีต (สูตรอ้างอิงชีต "รายชื่อพนักงาน" — อัปเดตเอง) ----------
// รัน buildSurveySheets จาก editor ครั้งเดียว (รันซ้ำได้ ชีต "สรุป …" จะถูกสร้างใหม่)
// นับเฉพาะแถวที่คอลัมน์ K (ตอบในฟอร์ม ข้อ 1.4) = "เข้าร่วมกิจกรรม"
const SURVEY_FORM_SHEET = 'การตอบแบบฟอร์ม 1';
const ACT_PRICE = 130;
const ALLERGY_PAT = '"กุ้ง|ปู|หอย|หมึก|หมู|ปลา|สัตว์ปีก|ไก่|เป็ด|นม|ถั่ว|ไข่|ทะเล|เนื้อ|แป้ง|ผัก|เห็ด"';
const SEC_WINDOW = 50; // จำนวนแถวที่เผื่อไว้สำหรับรายชื่อแผนก

function ec_(c) { return "'" + SURVEY_EMP_SHEET + "'!$" + c + '$2:$' + c; }
function joined_() { return ec_('K') + '="เข้าร่วมกิจกรรม"'; }
function codeExpr_() { const b = ec_('B'); return 'IF(ISNUMBER(' + b + '),TEXT(' + b + ',"0000"),' + b + '&"")'; }
function whoCols_() { return [codeExpr_(), ec_('G'), ec_('H'), ec_('D')]; }

/** รายชื่อรายคนแบบสูตร: cols = นิพจน์ของแต่ละคอลัมน์, cond = เงื่อนไข, keys = คีย์เรียงลำดับ (ไม่แสดง) แล้วเรียงต่อด้วยแผนก/รหัส */
function detailFormula_(cols, cond, keys) {
  const all = cols.concat(keys || []).map((x) => 'FILTER(' + x + ',f)').join(',');
  const n = cols.length;
  const sortArgs = (keys || []).map((k, i) => (n + 1 + i) + ',TRUE').concat(['4,TRUE', '1,TRUE']).join(',');
  const pick = cols.map((x, i) => i + 1).join(',');
  return '=IFERROR(ARRAYFORMULA(LET(f,' + cond + ',CHOOSECOLS(SORT(HSTACK(' + all + '),' + sortArgs + '),' + pick + '))),"(ไม่มี)")';
}

/** คอลัมน์ช่วย W:Z ในชีตรายชื่อพนักงาน: สายรถตู้ / ช่วงเวลา / จุดขึ้น-ลง / เบอร์โทร (ดึงคำตอบล่าสุดจากฟอร์ม) */
function addSurveyHelperColumns_(ss) {
  const sh = ss.getSheetByName(SURVEY_EMP_SHEET);
  const F = (c) => "'" + SURVEY_FORM_SHEET + "'!$" + c + '$2:$' + c;
  const keys = 'INDEX(IFERROR(VALUE(' + F('B') + '),' + F('B') + '))';
  const look = (r, src) => '=IF($B' + r + '="","",XLOOKUP(IFERROR($B' + r + '*1,$B' + r + '),' + keys + ',' + src + ',"",0,-1))';
  const src = [
    F('L'),
    'INDEX(IF(' + F('M') + '<>"",' + F('M') + ',' + F('O') + '))',
    F('P'),
    'INDEX(IF(' + F('N') + '<>"",' + F('N') + '&"",IF(' + F('Q') + '<>"",' + F('Q') + '&"",' + F('R') + '&"")))'
  ];
  if (sh.getMaxColumns() < 26) sh.insertColumnsAfter(sh.getMaxColumns(), 26 - sh.getMaxColumns());
  sh.getRange(1, 23, 1, 4).setValues([['สายรถตู้', 'ช่วงเวลารถตู้', 'จุดขึ้น-ลงรถตู้', 'เบอร์โทร']]).setFontWeight('bold').setBackground('#08231f').setFontColor('#ffffff');
  const last = sh.getLastRow(); const fs = [];
  for (let r = 2; r <= last; r++) fs.push(src.map((x) => look(r, x)));
  sh.getRange(2, 23, fs.length, 4).setFormulas(fs);
}

function newSummarySheet_(ss, name, title) {
  const old = ss.getSheetByName(name);
  if (old) ss.deleteSheet(old);
  const sh = ss.insertSheet(name, ss.getNumSheets());
  sh.getRange(1, 1).setValue(title).setFontSize(14).setFontWeight('bold');
  sh.getRange(2, 1).setValue('สูตรอ้างอิงจากชีต "' + SURVEY_EMP_SHEET + '" (อัปเดตอัตโนมัติ) · นับเฉพาะผู้ที่ตอบฟอร์มว่าเข้าร่วม').setFontColor('#666666');
  return sh;
}
function blockTitle_(sh, row, t) { sh.getRange(row, 1).setValue(t).setFontWeight('bold').setFontSize(12).setFontColor('#08231f'); }
function headerRow_(sh, row, vals) {
  sh.getRange(row, 1, 1, vals.length).setValues([vals]).setFontWeight('bold').setBackground('#08231f').setFontColor('#ffffff').setWrap(true).setVerticalAlignment('middle');
}
function finishSheet_(sh, cols) {
  SpreadsheetApp.flush();
  sh.autoResizeColumns(1, cols);
  for (let c = 1; c <= cols; c++) { const w = sh.getColumnWidth(c); if (w > 320) sh.setColumnWidth(c, 320); else if (w < 90) sh.setColumnWidth(c, 90); }
  if (sh.getColumnWidth(1) < 170) sh.setColumnWidth(1, 170);
}

/**
 * ชีตสรุป 1 รายการ: ตารางจำนวน → ตารางแยกแผนก → รายชื่อรายคน
 * o = { col, options:[{label, crit}], unit, amount, extra:[[label, formula]], details:[{title, header, formula, reserve}] }
 */
function itemSheet_(ss, name, title, o) {
  const sh = newSummarySheet_(ss, name, title);
  const K = ec_('K'), D = ec_('D'), col = ec_(o.col);
  let r = 4; let maxCols = 4;
  blockTitle_(sh, r, 'สรุปจำนวน'); r++;
  headerRow_(sh, r, ['รายการ', o.unit, '%'].concat(o.amount ? ['ยอดเงิน (บาท)'] : [])); r++;
  const first = r; const totalRow = first + o.options.length;
  o.options.forEach((op) => {
    sh.getRange(r, 1).setValue(op.label);
    sh.getRange(r, 2).setFormula('=COUNTIFS(' + col + ',' + op.crit + ',' + K + ',"เข้าร่วมกิจกรรม")');
    sh.getRange(r, 3).setFormula('=IF($B$' + totalRow + '=0,0,B' + r + '/$B$' + totalRow + ')');
    if (o.amount) sh.getRange(r, 4).setFormula('=B' + r + '*' + ACT_PRICE);
    r++;
  });
  sh.getRange(r, 1).setValue(o.totalLabel || 'รวม');
  sh.getRange(r, 2).setFormula('=SUM(B' + first + ':B' + (r - 1) + ')');
  sh.getRange(r, 3).setValue(1);
  if (o.amount) sh.getRange(r, 4).setFormula('=SUM(D' + first + ':D' + (r - 1) + ')');
  sh.getRange(r, 1, 1, o.amount ? 4 : 3).setFontWeight('bold').setBackground('#f4efe4');
  sh.getRange(first, 3, o.options.length + 1, 1).setNumberFormat('0.0%');
  r++;
  (o.extra || []).forEach((x) => { sh.getRange(r, 1).setValue(x[0]); sh.getRange(r, 2).setFormula(x[1]); r++; });
  r += 2;

  // แยกตามแผนก
  blockTitle_(sh, r, 'แยกตามแผนก'); r++;
  const labels = o.options.map((op) => op.short || op.label);
  headerRow_(sh, r, ['แผนก'].concat(labels, ['ผู้ตอบทั้งหมด'])); r++;
  maxCols = Math.max(maxCols, labels.length + 2);
  sh.getRange(r, 1).setValue('รวมทุกแผนก');
  o.options.forEach((op, i) => sh.getRange(r, 2 + i).setFormula('=COUNTIFS(' + col + ',' + op.crit + ',' + K + ',"เข้าร่วมกิจกรรม")'));
  sh.getRange(r, 2 + labels.length).setFormula('=COUNTIF(' + K + ',"เข้าร่วมกิจกรรม")');
  sh.getRange(r, 1, 1, labels.length + 2).setFontWeight('bold').setBackground('#f4efe4');
  r++;
  const win = '$A' + r + ':$A' + (r + SEC_WINDOW - 1);
  sh.getRange(r, 1).setFormula('=IFERROR(SORT(UNIQUE(FILTER(' + D + ',' + joined_() + '))),"")');
  o.options.forEach((op, i) => sh.getRange(r, 2 + i).setFormula('=ARRAYFORMULA(IF(' + win + '="","",COUNTIFS(' + D + ',' + win + ',' + col + ',' + op.crit + ',' + K + ',"เข้าร่วมกิจกรรม")))'));
  sh.getRange(r, 2 + labels.length).setFormula('=ARRAYFORMULA(IF(' + win + '="","",COUNTIFS(' + D + ',' + win + ',' + K + ',"เข้าร่วมกิจกรรม")))');
  r += SEC_WINDOW + 2;

  o.details.forEach((d) => {
    blockTitle_(sh, r, d.title); r++;
    headerRow_(sh, r, d.header); r++;
    maxCols = Math.max(maxCols, d.header.length);
    sh.getRange(r, 1).setFormula(d.formula);
    r += (d.reserve || 0) + 2;
  });
  finishSheet_(sh, maxCols);
  return sh;
}

function buildSurveySheets() {
  const ss = SpreadsheetApp.openById(SURVEY_SHEET_ID);
  addSurveyHelperColumns_(ss);
  const J = joined_(); const K = ec_('K');
  const L = ec_('L'), M = ec_('M'), N = ec_('N'), O = ec_('O'), P = ec_('P'), W = ec_('W'), X = ec_('X'), Y = ec_('Y'), Z = ec_('Z');
  const WHO = ['รหัส', 'ชื่อ-สกุล', 'ชื่อเล่น', 'แผนก'];
  const who = whoCols_();
  const lit = (t) => '"' + t.replace(/"/g, '""') + '"';
  const exact = (labels) => labels.map((l) => ({ label: l, crit: lit(l) }));
  const re = (rng, pat) => 'REGEXMATCH(' + rng + '&"",' + pat + ')';

  // 1 ไซซ์เสื้อ
  const SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL', 'มากกว่า 3XL ขึ้นไป'];
  itemSheet_(ss, 'สรุป 1 ไซซ์เสื้อ', '3.2 ไซซ์เสื้อ — สรุปจำนวนสั่งทำ', {
    col: 'L', unit: 'จำนวน (ตัว)', options: exact(SIZES),
    details: [{ title: 'รายละเอียดรายคน (เรียงตามไซซ์ → แผนก)', header: WHO.concat(['ไซซ์']),
      formula: detailFormula_(who.concat([L]), J, ['IFERROR(MATCH(' + L + ',{' + SIZES.map(lit).join(';') + '},0),99)']) }]
  });

  // 2 อาหารเช้า
  const FOODS = ["Box Set McDonald's (เบอร์เกอร์ & พาย)", 'ข้าวผัดกะเพราหมู + ไข่ดาว', 'ข้าวหน้าปลาแกะ + ไข่ต้ม'];
  itemSheet_(ss, 'สรุป 2 อาหารเช้า', '3.3 อาหารเช้า — สรุปจำนวนสั่ง', {
    col: 'M', unit: 'จำนวน (ชุด)', options: exact(FOODS),
    details: [{ title: 'รายละเอียดรายคน (เรียงตามเมนู → แผนก)', header: WHO.concat(['เมนู', 'แพ้อาหาร (ตามที่กรอก)']),
      formula: detailFormula_(who.concat([M, N]), J, [M]) }]
  });

  // 3 แพ้อาหาร
  const sh3 = newSummarySheet_(ss, 'สรุป 3 แพ้อาหาร', '3.4 แพ้อาหาร — รายชื่อที่ต้องแจ้งครัว/ร้านอาหาร');
  blockTitle_(sh3, 4, 'สรุปจำนวน'); headerRow_(sh3, 5, ['รายการ', 'จำนวน (คน)', '%']);
  sh3.getRange(6, 1, 3, 1).setValues([['ระบุอาหารที่แพ้/ทานไม่ได้'], ['ไม่แพ้'], ['รวม']]);
  sh3.getRange(6, 2).setFormula('=SUMPRODUCT((' + J + ')*' + re(N, ALLERGY_PAT) + ')');
  sh3.getRange(7, 2).setFormula('=B8-B6');
  sh3.getRange(8, 2).setFormula('=COUNTIF(' + K + ',"เข้าร่วมกิจกรรม")');
  sh3.getRange(6, 3, 3, 1).setFormulas([['=IF($B$8=0,0,B6/$B$8)'], ['=IF($B$8=0,0,B7/$B$8)'], ['=IF($B$8=0,0,1)']]).setNumberFormat('0.0%');
  sh3.getRange(8, 1, 1, 3).setFontWeight('bold').setBackground('#f4efe4');
  blockTitle_(sh3, 11, 'ผู้ที่ระบุอาหารที่แพ้/ทานไม่ได้ (ควรยืนยันกับเจ้าตัว)'); headerRow_(sh3, 12, WHO.concat(['ที่กรอก', 'อาหารเช้าที่เลือก']));
  sh3.getRange(13, 1).setFormula(detailFormula_(who.concat([N, M]), '(' + J + ')*' + re(N, ALLERGY_PAT), []));
  blockTitle_(sh3, 45, 'คำตอบอื่น ๆ ที่ตีความว่า "ไม่แพ้" (ตรวจทานได้)'); headerRow_(sh3, 46, WHO.concat(['ที่กรอก']));
  sh3.getRange(47, 1).setFormula(detailFormula_(who.concat([N]), '(' + J + ')*NOT(' + re(N, ALLERGY_PAT) + ')*(TRIM(' + N + ')<>"ไม่แพ้")', []));
  finishSheet_(sh3, 6);

  // 4 กิจกรรมเสริม
  const RAFT = '"ล่องแก่ง"', BOAT = '"ล่องเรือชม"';
  const anyAct = '(' + J + ')*' + re(O, '"ล่องแก่ง|ล่องเรือชม"');
  itemSheet_(ss, 'สรุป 4 กิจกรรมเสริม', '3.5 กิจกรรมเสริม (พนักงานชำระเอง ' + ACT_PRICE + ' บาท/ท่าน/กิจกรรม)', {
    col: 'O', unit: 'จำนวน (คน)', amount: true, totalLabel: 'รวม (คน-กิจกรรม)',
    options: [
      { label: 'ล่องแก่งเรือยาง ลำน้ำเพชรบุรี 9 กม.', short: 'ล่องแก่งเรือยาง', crit: '"*ล่องแก่งเรือยาง*"' },
      { label: 'ล่องเรือชมสันเขื่อนแก่งกระจาน + ถ่ายภาพสะพานแขวน', short: 'ล่องเรือชมเขื่อน', crit: '"*ล่องเรือชมสันเขื่อน*"' }],
    extra: [
      ['ผู้เข้าร่วมอย่างน้อย 1 กิจกรรม (คน)', '=SUMPRODUCT(' + anyAct + ')'],
      ['ไม่เข้าร่วมกิจกรรมเสริม (คน)', '=COUNTIF(' + K + ',"เข้าร่วมกิจกรรม")-SUMPRODUCT(' + anyAct + ')']],
    details: [{ title: 'รายละเอียดผู้เข้าร่วมกิจกรรม', header: WHO.concat(['ล่องแก่งเรือยาง', 'ล่องเรือชมเขื่อน', 'ยอดชำระ (บาท)', 'เบอร์โทร', 'หมายเหตุ']),
      formula: detailFormula_(who.concat([
        'IF(' + re(O, RAFT) + ',"✔","")', 'IF(' + re(O, BOAT) + ',"✔","")',
        '(' + re(O, RAFT) + '+' + re(O, BOAT) + ')*' + ACT_PRICE, Z,
        'IF(' + re(O, '"ไม่เข้าร่วม"') + ',"เลือก ""ไม่เข้าร่วม"" มาด้วย — ควรยืนยัน","")']), anyAct, []) }]
  });

  // 5 การเดินทาง
  const modeKey = 'IF(' + re(P, '"ด้วยตนเอง"') + ',1,IF(' + re(P, '"ไม่เคย"') + ',3,2))';
  const modeLabel = 'IF(' + re(P, '"ด้วยตนเอง"') + ',"เดินทางมาเอง",IF(' + re(P, '"ไม่เคย"') + ',"ขอรถตู้ (ไม่เคยนั่งประจำ)","รถตู้สายประจำ"))';
  itemSheet_(ss, 'สรุป 5 การเดินทาง', 'Confirm การเดินทางมาถึงบริษัทก่อน 06:30 น.', {
    col: 'P', unit: 'จำนวน (คน)',
    options: [
      { label: 'เดินทางมาเอง', crit: '"*ด้วยตนเอง*"' },
      { label: 'รถตู้สายประจำ', crit: '"*ขึ้นอยู่ประจำ*"' },
      { label: 'ขอรถตู้ (ไม่เคยนั่งประจำ)', crit: '"*ไม่เคย*"' }],
    details: [{ title: 'รายละเอียดรายคน (เรียงตามวิธีเดินทาง → แผนก)', header: WHO.concat(['วิธีเดินทาง', 'สายรถตู้ / จุดขึ้น', 'เบอร์โทร']),
      formula: detailFormula_(who.concat([modeLabel, 'IF(' + W + '<>"",' + W + ',' + Y + ')', Z]), J, [modeKey]) }]
  });

  // 6 รถตู้
  const sh6 = newSummarySheet_(ss, 'สรุป 6 รถตู้', 'ข้อ 4–5 รถตู้รับ-ส่ง — จำนวนตามสายและรายชื่อผู้โดยสาร');
  const when = 'IF(' + re(X, '"เฉพาะตอนไป"') + ',"เฉพาะตอนไป",IF(' + X + '<>"","ไป-กลับ",""))';
  const hasLine = '(' + J + ')*(' + W + '<>"")';
  blockTitle_(sh6, 4, 'จำนวนตามสายรถตู้ (ผู้นั่งประจำ)'); headerRow_(sh6, 5, ['สาย', 'รวม (คน)', 'ไป-กลับ', 'เฉพาะตอนไป']);
  sh6.getRange(6, 1).setValue('รวมทุกสาย');
  sh6.getRange(6, 2).setFormula('=SUMPRODUCT(' + hasLine + ')');
  sh6.getRange(6, 3).setFormula('=B6-D6');
  sh6.getRange(6, 4).setFormula('=SUMPRODUCT(' + hasLine + '*' + re(X, '"เฉพาะตอนไป"') + ')');
  sh6.getRange(6, 1, 1, 4).setFontWeight('bold').setBackground('#f4efe4');
  const w6 = '$A7:$A36';
  sh6.getRange(7, 1).setFormula('=IFERROR(SORT(UNIQUE(FILTER(' + W + ',' + hasLine + '))),"")');
  sh6.getRange(7, 2).setFormula('=ARRAYFORMULA(IF(' + w6 + '="","",COUNTIFS(' + W + ',' + w6 + ',' + K + ',"เข้าร่วมกิจกรรม")))');
  sh6.getRange(7, 3).setFormula('=ARRAYFORMULA(IF(' + w6 + '="","",$B7:$B36-$D7:$D36))');
  sh6.getRange(7, 4).setFormula('=ARRAYFORMULA(IF(' + w6 + '="","",COUNTIFS(' + W + ',' + w6 + ',' + X + ',"*เฉพาะตอนไป*",' + K + ',"เข้าร่วมกิจกรรม")))');
  blockTitle_(sh6, 39, 'ขอรถตู้เพิ่ม (ไม่เคยนั่งประจำ) — ต้องจัดสาย'); headerRow_(sh6, 40, WHO.concat(['จุดขึ้น-ลง', 'ช่วงเวลา', 'เบอร์โทร']));
  sh6.getRange(41, 1).setFormula(detailFormula_(who.concat([Y, when, Z]), '(' + J + ')*' + re(P, '"ไม่เคย"'), []));
  blockTitle_(sh6, 64, 'รายชื่อผู้โดยสารตามสาย'); headerRow_(sh6, 65, WHO.concat(['สาย', 'ช่วงเวลา', 'เบอร์โทร']));
  sh6.getRange(66, 1).setFormula(detailFormula_(who.concat([W, when, Z]), hasLine, [W]));
  finishSheet_(sh6, 7);

  // 0 ภาพรวม
  const sh0 = newSummarySheet_(ss, 'สรุป 0 ภาพรวม', 'สรุปผลแบบสำรวจ Company Trip 2026');
  const cnt = (c, crit) => '=COUNTIFS(' + ec_(c) + ',' + crit + ',' + K + ',"เข้าร่วมกิจกรรม")';
  const blocks = [
    ['ภาพรวมการตอบ', [
      ['พนักงานทั้งหมดในรายชื่อ', '=COUNTA(' + ec_('B') + ')'],
      ['แจ้งเข้าร่วม (คอลัมน์ Check)', '=COUNTIF(' + ec_('I') + ',"เข้าร่วมกิจกรรม")'],
      ['ตอบฟอร์มว่าเข้าร่วม (ฐานของทุกชีตสรุป)', '=COUNTIF(' + K + ',"เข้าร่วมกิจกรรม")'],
      ['Check ระบุไม่เข้าร่วม แต่ตอบฟอร์มว่าเข้าร่วม', '=COUNTIFS(' + ec_('I') + ',"ไม่เข้าร่วม*",' + K + ',"เข้าร่วมกิจกรรม")'],
      ['แจ้งเข้าร่วมแต่ยังไม่ตอบฟอร์ม', '=COUNTIF(' + ec_('R') + ',"❌*")']]],
    ['ไซซ์เสื้อ → ชีต "สรุป 1 ไซซ์เสื้อ"', SIZES.map((x) => [x, cnt('L', lit(x))])],
    ['อาหารเช้า → ชีต "สรุป 2 อาหารเช้า"', FOODS.map((x) => [x, cnt('M', lit(x))])],
    ['แพ้อาหาร → ชีต "สรุป 3 แพ้อาหาร"', [['ระบุอาหารที่แพ้/ทานไม่ได้', '=SUMPRODUCT((' + J + ')*' + re(N, ALLERGY_PAT) + ')']]],
    ['กิจกรรมเสริม → ชีต "สรุป 4 กิจกรรมเสริม"', [['ล่องแก่งเรือยาง (คน)', cnt('O', '"*ล่องแก่งเรือยาง*"')], ['ล่องเรือชมเขื่อน (คน)', cnt('O', '"*ล่องเรือชมสันเขื่อน*"')],
      ['ยอดเงินรวม (บาท)', '=(COUNTIFS(' + O + ',"*ล่องแก่งเรือยาง*",' + K + ',"เข้าร่วมกิจกรรม")+COUNTIFS(' + O + ',"*ล่องเรือชมสันเขื่อน*",' + K + ',"เข้าร่วมกิจกรรม"))*' + ACT_PRICE]]],
    ['การเดินทาง → ชีต "สรุป 5 การเดินทาง" / "สรุป 6 รถตู้"', [['เดินทางมาเอง', cnt('P', '"*ด้วยตนเอง*"')], ['รถตู้สายประจำ', cnt('P', '"*ขึ้นอยู่ประจำ*"')], ['ขอรถตู้ (ไม่เคยนั่งประจำ)', cnt('P', '"*ไม่เคย*"')]]]
  ];
  let r = 4;
  blocks.forEach((b) => {
    blockTitle_(sh0, r, b[0]); r++;
    headerRow_(sh0, r, ['รายการ', 'จำนวน']); r++;
    b[1].forEach((x) => { sh0.getRange(r, 1).setValue(x[0]); sh0.getRange(r, 2).setFormula(x[1]); r++; });
    r += 1;
  });
  finishSheet_(sh0, 2);
  try { ss.setActiveSheet(sh0); ss.moveActiveSheet(ss.getNumSheets() - 6); } catch (err) { /* ลำดับชีตไม่สำคัญ */ }
}
