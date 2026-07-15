# MATCALL – Requirement Document

**ระบบ:** MATCALL – Intelligent Material Call-Off System  
**บริษัท:** Sermsuk Public Company Limited  
**เวอร์ชัน:** 2.0 (Web App)  
**วันที่:** 2026-06-11  

---

## 1. ภาพรวม (Overview)

ระบบ MATCALL เดิมทำงานบน Microsoft PowerApps + SharePoint Online  
เวอร์ชัน 2.0 นี้ย้ายมาเป็น Static Web App บน GitHub Pages โดยใช้ **Supabase** แทน SharePoint

### Stack
| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, Bootstrap 5, Vanilla JS |
| Font | Prompt (Google Fonts) |
| Backend/DB | Supabase (PostgreSQL) |
| Charts | Chart.js v4 |
| Icons | Bootstrap Icons |
| Hosting | GitHub Pages / XAMPP (local) |

---

## 2. เมนูและหน้า (Screens)

| หน้า | ไฟล์ | กลุ่มผู้ใช้ที่มีสิทธิ์ |
|------|------|---------------------|
| หน้าหลัก | index.html | ทุกคน |
| เรียกเข้าวัตถุดิบ (แผนกผลิต) | request.html | ฝ่ายผลิต (Full), คลังวัตถุดิบ (View Only), Admin (Full) |
| ข้อมูล PO | po.html | Admin เท่านั้น |
| ประวัติและสถานะ (แผนกคลัง) | history.html | ทุกคน |
| รับวัตถุดิบ | receive.html | คลังวัตถุดิบ (Full), ฝ่ายผลิต (View Only), Admin (Full) |
| Dashboard | dashboard.html | ทุกคน |
| จัดการข้อมูล & สิทธิ์ | settings.html | Admin เท่านั้น |
| Preview Email Supplier | email-preview-supplier.html | คลังวัตถุดิบ, Admin |
| Preview Email PAN | email-preview-pan.html | คลังวัตถุดิบ, Admin |

---

## 2.1 สิทธิ์และการควบคุมเข้าถึงตามแผนก (Department-Based RBAC)

ระบบกำหนดให้สิทธิ์การใช้งานแยกตาม **แผนก (Department)** และ **บทบาท (Role)** ดังนี้:

- 🏭 **แผนกผลิต (Production)**
  - จัดการข้อมูลและวางแผนเรียกเข้าวัตถุดิบใน `request.html`
  - ดูข้อมูลประวัติสถานะใน `history.html`
  - ดูข้อมูลการรับวัตถุดิบใน `receive.html` ได้เท่านั้น (View Only - ซ่อนปุ่มแก้ไข/ส่งอีเมล)
  - ไม่สามารถเปิดหน้าตั้งค่า (`settings.html`) และไม่เห็นเมนู "ข้อมูล PO" (`po.html`)
- 📦 **แผนกคลังวัตถุดิบ (Warehouse)**
  - ดูข้อมูลแผนเรียกเข้าใน `request.html` ได้เท่านั้น (View Only - ซ่อนปุ่มบันทึก/ลบ/ใส่ตะกร้า)
  - บันทึกการรับวัตถุดิบจริงและส่งอีเมล PAN สรุปใน `receive.html`
  - ดูข้อมูลประวัติสถานะใน `history.html`
  - ไม่สามารถเปิดหน้าตั้งค่า (`settings.html`) และไม่เห็นเมนู "ข้อมูล PO" (`po.html`)
- 🛡️ **Admin**
  - มีสิทธิ์ดำเนินการทุกอย่างในระบบ รวมถึงการแก้ไขข้อมูลพนักงาน (สามารถแก้ไขรหัสพนักงาน/Username ได้)
  - นำเข้าข้อมูล PO (Import XLSX หรือดึงผ่าน SAP API) ในหน้า `po.html`
  - จัดการสิทธิ์การใช้งานผ่าน `settings.html`

> [!NOTE]
> ใน Sidebar เมนูหลักจะทำการคัดกรองและซ่อนปุ่มนำทางตามสิทธิ์แผนกที่กำหนดไว้ และมี Badge แสดงแผนกของผู้ใช้อยู่ใต้รูปโปรไฟล์บริเวณมุมล่างซ้าย

---

## 3. ฟีเจอร์รายหน้า

### 3.1 หน้าหลัก (index.html)
- แสดง Branding "MATCALL"
- 4 Menu Card นำทางไปแต่ละโมดูล
- Sidebar แสดง Navigation ทั้งหมด
- Responsive: mobile / tablet / desktop

### 3.2 เรียกเข้าวัตถุดิบ (request.html)
**สร้าง / แก้ไข / ลบ แผนเรียกเข้า**
- Filter: โรงงาน, สถานะ, วันส่งมอบ, ค้นหา
- ฟอร์ม: Plant → Supplier (cascade) → Material (cascade) → วันส่ง, Qty, Unit, Tank ID, Target Week, Remark
- บันทึกลง `calloff_plan` (status = Active, mail_status = Pending)

### 3.3 ประวัติและสถานะ (history.html)
**ดูประวัติ + สร้างอีเมลแจ้ง Supplier**
- Filter: โรงงาน, Supplier (text), วัตถุดิบ (text), Mail Status, วันส่งมอบ
- Checkbox เลือกหลายรายการ
- ปุ่ม "สร้างอีเมล": ตรวจสอบว่าเลือกโรงงานและ Supplier แล้ว → ไป email-preview-supplier.html
- แสดง Mail Status และ Receive Status

### 3.4 รับวัตถุดิบ (receive.html)
**บันทึก Goods Receipt + สรุปรายเดือน**
- แสดงเฉพาะรายการที่ mail_status = Sent
- Filter: โรงงาน, เดือน, Receive Status
- Stats: รายการทั้งหมด / รับแล้ว / รอ / SAP Completed
- Modal บันทึก: DO Number, วันรับจริง, น้ำหนักผู้ผลิต, น้ำหนักโรงงาน (auto-calc ส่วนต่าง), น้ำหนัก SAP, เลข SAP Doc, Receive Status
- ปุ่ม "สรุปรายเดือน" → email-preview-pan.html

### 3.5 Dashboard (dashboard.html)
- KPI Cards: แผนรวม, รับจริง, Fulfillment Rate, รายการ, รับแล้ว, รอรับ
- Bar Chart: ยอดรายเดือน (ปีงบประมาณ Oct–Sep), แผน vs รับจริง
- Doughnut Chart: สัดส่วน Supplier, toggle แผน/รับจริง
- Filter: โรงงาน, Supplier, วัตถุดิบ

### 3.6 Email Preview – Supplier (email-preview-supplier.html)
- อ่านข้อมูลจาก sessionStorage
- สร้าง HTML Email ตาราง Day/Date/[TankID]/Quantity
- แสดง To (Supplier Email), Cc (Plant emails), Subject
- ปุ่ม "คัดลอก" – copy HTML ไว้วางใน Outlook
- ปุ่ม "ยืนยันส่งแล้ว" – update mail_status = Sent ใน Supabase

### 3.7 Email Preview – PAN (email-preview-pan.html)
- สรุปรายเดือน: ตาราง Plant/วันที่/วัตถุดิบ/Supplier/น้ำหนักต่างๆ/DO
- To = Email_PAN ของโรงงาน, Cc = Plan/RW/PD/Manager
- ปุ่ม คัดลอก / พิมพ์

---

## 4. โครงสร้างไฟล์

```
matcall/
├── index.html
├── request.html
├── history.html
├── receive.html
├── dashboard.html
├── email-preview-supplier.html
├── email-preview-pan.html
├── css/
│   ├── main.css         ← Layout, Sidebar, Brand variables
│   ├── components.css   ← Buttons, Forms, Tables, Modals
│   └── responsive.css   ← Breakpoints: 992/768/480px
├── js/
│   ├── supabase.js      ← Supabase client + API helpers
│   ├── app.js           ← Shared: Toast, Modal, Sidebar, Formatters
│   ├── request.js       ← เรียกเข้าวัตถุดิบ logic
│   ├── history.js       ← ประวัติ logic
│   ├── receive.js       ← รับของ logic
│   └── dashboard.js     ← Chart.js dashboard logic
├── requirement.md       ← ไฟล์นี้
├── database.md          ← SQL Schema + Supabase setup
└── skill.md             ← คู่มือนักพัฒนา
```

---

## 5. Design System

### สี Brand
| Variable | Value | ใช้สำหรับ |
|----------|-------|----------|
| --primary | #1d3a70 | Sidebar, Headers, Primary buttons |
| --teal | #0c8a7e | Active nav, Teal buttons, Charts |
| --bg-body | #f0f4f8 | Background |
| --bg-card | rgba(255,255,255,0.75) | Glass cards |

### Font
Noto Sans Thai – weights: 300, 400, 500, 600, 700, 800

### Responsive Breakpoints
- Desktop: > 992px → Sidebar แสดงถาวร
- Tablet: 768–992px → Sidebar แคบลง
- Mobile: < 768px → Sidebar ซ่อน (toggle button)

---

## 6. การ Migrate จาก SharePoint

| SharePoint List | Supabase Table |
|-----------------|----------------|
| CallOff_Plan | calloff_plan |
| Master_Supplier | master_supplier |
| Master_Plant | master_plant |

### Field Mapping ที่เปลี่ยนแปลง
| SharePoint | Supabase | หมายเหตุ |
|-----------|---------|---------|
| Title (ชื่อเรื่อง) | title | auto-gen |
| Plant.Value (Choice) | plant | text ตรง |
| MaterialName.Value (Lookup) | material_name | text ตรง |
| Status.Value | status | text |
| MailStatus.Value | mail_status | text |
| ReceiveStatus.Value | receive_status | text |

---

## 7. TODO / Next Steps

- [ ] เพิ่ม Supabase Auth (login ด้วย email หรือ SSO)
- [ ] Export Excel จากหน้า History / Receive
- [ ] Notification เมื่อแผนใกล้ถึง delivery_date
- [ ] Multi-language (EN/TH toggle)
- [ ] Deploy บน GitHub Pages
