# HSST Company Trip 2026

เว็บไซต์ประชาสัมพันธ์กิจกรรมท่องเที่ยวประจำปี 2026
20–21 พฤศจิกายน 2569 · ทูเกเตอร์ รีสอร์ท แก่งกระจาน จ.เพชรบุรี

เป็นเว็บแบบ static (HTML/CSS/JS) ไม่ต้อง build ใช้กับ GitHub Pages ได้ทันที

## โครงสร้าง
- `index.html` — เนื้อหาทั้งหมด (กำหนดการ, ที่พัก, กิจกรรม, อาหารเช้า, ปาร์ตี้, เสื้อ, แบบสำรวจ)
- `assets/style.css` — สไตล์ (รองรับมือถือ + dark mode)
- `assets/app.js` — countdown, แท็บวัน, lightbox, เมนูมือถือ
- `assets/img/` — รูปภาพ

## ใส่ลิงก์แบบสำรวจ
แก้ใน `index.html` ช่วงท้ายไฟล์:
```js
window.TRIP_CONFIG = {
  surveyUrl: "https://forms.gle/xxxxxxxx",
  ...
};
```

## ดูในเครื่อง
```bash
python3 -m http.server 8765
```
แล้วเปิด http://localhost:8765
