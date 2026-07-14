# MATCALL – Developer Guide (skill.md)

## Quick Start

### รัน Local ด้วย XAMPP
1. วางโฟลเดอร์ `matcall/` ไว้ใน `C:\xampp\htdocs\`
2. เปิด XAMPP → Start Apache
3. เปิด Browser → `http://localhost/matcall/`

### Supabase Setup
1. สร้าง Project บน https://supabase.com
2. รัน SQL ใน `database.md` เพื่อสร้าง Tables
3. แก้ไข `js/supabase.js` ใส่ URL และ Key ของ Project ใหม่

```js
const SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
const SUPABASE_KEY = "your_publishable_key";
```

4. เปิด RLS Policy ตามที่ระบุใน `database.md`

---

## File Structure & Responsibilities

### CSS Files

| ไฟล์ | หน้าที่ |
|------|--------|
| `css/main.css` | CSS Variables, Layout shell, Sidebar, Topbar, Home Hero, Toast, Modal backdrop |
| `css/components.css` | Buttons, Forms, Tables, Tabs, Toggle, Email frame, Pagination |
| `css/responsive.css` | Breakpoints (992/768/480px), Print styles |

### JS Files

| ไฟล์ | หน้าที่ |
|------|--------|
| `js/supabase.js` | `_supabase` client, `DB` generic helpers, `API` typed helpers, `getCurrentFY()` |
| `js/app.js` | `Sidebar`, `Toast`, `Modal`, `Fmt` formatters, `populateSelect`, `debounce` |
| `js/request.js` | CRUD แผนเรียกเข้า |
| `js/history.js` | ดูประวัติ + เตรียม Email Supplier |
| `js/receive.js` | บันทึก GR + เตรียม Email PAN |
| `js/dashboard.js` | KPI Cards + Chart.js Bar + Pie |

---

## API Reference (js/supabase.js)

### `API.getPlants()`
คืน array ของโรงงาน (is_active = true)

### `API.getSuppliers(plantCode?)`
คืน Supplier ทั้งหมดหรือของ plant ที่ระบุ

### `API.getCalloffPlans(options)`
```js
await API.getCalloffPlans({
  plant, supplierName, materialName, status,
  mailStatus, receiveStatus,
  dateFrom, dateTo, fy
})
```

### `API.createCalloffPlan(payload)`
สร้างแผนใหม่ (status='Active', mail_status='Pending')

### `API.saveGoodsReceipt(id, receiptData)`
บันทึกข้อมูล GR (weight fields + receive_status)

### `API.bulkMarkMailSent(ids[])`
อัพเดต mail_status = 'Sent' สำหรับหลาย ID พร้อมกัน

---

## Formatter Reference (js/app.js)

```js
Fmt.date('2026-06-11')         // → "11/06/2026"
Fmt.dateWithDay('2026-06-11')  // → "พุธ 11/06/2026"
Fmt.num(1234567.89)            // → "1,234,568"
Fmt.num(1234567.89, 2)         // → "1,234,567.89"
Fmt.statusBadge('Active')      // → HTML badge string
Fmt.toInputDate('2026-06-11T00:00:00Z') // → "2026-06-11"
Fmt.weekNum('2026-06-11')      // → 24
```

---

## Email Flow

### Supplier Email (history → email-preview-supplier)
1. ผู้ใช้กรอก Supplier + เลือกโรงงาน
2. ติ๊ก checkbox รายการที่ต้องการ
3. กด "สร้างอีเมล" → ตรวจ validate
4. `sessionStorage.setItem('email_items', JSON.stringify(items))`
5. Navigate → `email-preview-supplier.html`
6. สร้าง HTML Email table พร้อม To/Cc/Subject
7. กด "ยืนยันส่งแล้ว" → `API.bulkMarkMailSent(ids)` → กลับ history

### PAN Monthly Email (receive → email-preview-pan)
1. เลือกโรงงาน + เดือน
2. กด "สรุปรายเดือน"
3. `sessionStorage.setItem(...)` → Navigate
4. สร้าง HTML Email summary table
5. คัดลอก / พิมพ์

---

## Adding a New Page

1. Copy `index.html` และแก้ `<title>` + `topbar-page-name`
2. เพิ่ม nav-item ใน Sidebar และ set `data-page` ให้ตรงกับ filename
3. สร้าง JS file ใหม่ใน `js/`
4. include `<script src="js/yourpage.js">` ก่อน `</body>`

---

## Browser Support
- Chrome 90+ ✅
- Edge 90+  ✅
- Firefox 88+ ✅
- Safari 14+  ✅
- Mobile Chrome/Safari ✅

---

## External CDN Dependencies

```html
<!-- Bootstrap 5.3.3 -->
https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css
https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js

<!-- Bootstrap Icons 1.11.3 -->
https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css

<!-- Supabase JS v2 -->
https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2

<!-- Chart.js v4 (dashboard only) -->
https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js

<!-- Google Fonts: Noto Sans Thai (in CSS @import) -->
https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700;800&display=swap
```
