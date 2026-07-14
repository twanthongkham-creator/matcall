# MATCALL – Database Schema (Supabase)

## Connection
```
URL : https://veasbnqtfeaaxdpvqhcz.supabase.co
Key : sb_publishable_lNHI_haN0Key4pflGRc9rw_lvMiML3Q
```

---

## Tables

### 1. `master_plant`
โรงงาน (Plant Master)

| Column | Type | Notes |
|--------|------|-------|
| id | int8 PK | Auto increment |
| plant_code | text | PlantCode เดิม = Title ใน SharePoint |
| plant_name | text | ชื่อโรงงาน |
| email_pan | text | อีเมลฝ่าย PAN |
| email_plan | text | อีเมลฝ่ายวางแผน |
| email_rw | text | อีเมลคลังวัตถุดิบ |
| email_pd | text | อีเมลฝ่ายผลิต |
| email_manager | text | อีเมลผู้จัดการ |
| is_active | bool | default true |
| created_at | timestamptz | auto |
| updated_at | timestamptz | auto |

```sql
create table master_plant (
  id            bigserial primary key,
  plant_code    text not null unique,
  plant_name    text not null,
  email_pan     text,
  email_plan    text,
  email_rw      text,
  email_pd      text,
  email_manager text,
  is_active     boolean default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
```

---

### 2. `master_supplier`
ข้อมูล Supplier – Material (ความสัมพันธ์ Plant × Material × Supplier)

| Column | Type | Notes |
|--------|------|-------|
| id | int8 PK | |
| material_name | text | ชื่อวัตถุดิบ (Title ใน SharePoint) |
| material_no | text | รหัสวัตถุดิบ |
| plant | text | FK → master_plant.plant_code |
| supplier_name | text | ชื่อ Supplier |
| supplier_email | text | อีเมล Supplier (คั่นด้วย , ได้) |
| created_at | timestamptz | |
| updated_at | timestamptz | |

```sql
create table master_supplier (
  id               bigserial primary key,
  material_name    text not null,
  material_no      text,
  plant            text references master_plant(plant_code),
  supplier_name    text not null,
  supplier_email   text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index on master_supplier(plant, material_name, supplier_name);
```

### 2.5 `supplier_quota`
ประวัติและโควต้าของวัตถุดิบแต่ละเจ้า (มีผลแยกรายช่วงเวลา / 3 เดือน)

| Column | Type | Notes |
|--------|------|-------|
| id | int8 PK | |
| supplier_id | int8 FK | FK → master_supplier.id (On Delete Cascade) |
| contract_start | date | วันเริ่มสัญญา |
| contract_end | date | วันหมดสัญญา |
| quota_percent | numeric(5,2) | เปอร์เซ็นต์ Quota |
| total_quota | numeric(14,2) | Quota รวม |
| remaining_quota | numeric(14,2) | Quota คงเหลือ |
| created_at | timestamptz | |
| updated_at | timestamptz | |

```sql
create table supplier_quota (
  id               bigserial primary key,
  supplier_id      bigint references master_supplier(id) on delete cascade,
  contract_start   date not null,
  contract_end     date not null,
  quota_percent    numeric(5,2) not null default 0,
  total_quota      numeric(14,2),
  remaining_quota  numeric(14,2),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
```

---

### 3. `calloff_plan`
ตารางหลัก – แผนและบันทึกการเรียกเข้าวัตถุดิบ

| Column | Type | Notes |
|--------|------|-------|
| id | int8 PK | |
| title | text | ชื่อเรื่อง (auto-gen) |
| plant | text | FK → master_plant.plant_code |
| material_name | text | ชื่อวัตถุดิบ |
| supplier_name | text | ชื่อ Supplier |
| delivery_date | date | วันส่งมอบ (แผน) |
| quantity | numeric(14,2) | จำนวนตามแผน |
| unit | text | kg / IBC / ถัง / ตัน / ลิตร |
| tank_id | text | หมายเลขถัง (สำหรับ CO2) |
| target_week | text | สัปดาห์เป้าหมาย เช่น WK24 |
| status | text | Active / Cancelled (default: Active) |
| remark | text | หมายเหตุ |
| mail_status | text | Pending / Sent (default: Pending) |
| do_number | text | เลขที่ใบส่งของ |
| supplier_weight | numeric(14,2) | น้ำหนักจากผู้ผลิต (kg) |
| factory_weight | numeric(14,2) | น้ำหนักหน้าโรงงาน (kg) |
| weight_diff | numeric(14,2) | ส่วนต่าง = factory - supplier |
| sap_receive_weight | numeric(14,2) | น้ำหนักรับ SAP (kg) |
| sap_doc_number | text | เลขที่เอกสาร SAP |
| actual_delivery_date | date | วันที่รับจริง |
| receive_status | text | Pending / Received / SAP Completed |
| created_at | timestamptz | auto |
| updated_at | timestamptz | auto |

```sql
create table calloff_plan (
  id                   bigserial primary key,
  title                text,
  plant                text references master_plant(plant_code),
  material_name        text,
  supplier_name        text,
  delivery_date        date,
  quantity             numeric(14,2),
  unit                 text default 'kg',
  tank_id              text,
  target_week          text,
  status               text default 'Active',
  remark               text,
  mail_status          text default 'Pending',
  do_number            text,
  supplier_weight      numeric(14,2),
  factory_weight       numeric(14,2),
  weight_diff          numeric(14,2),
  sap_receive_weight   numeric(14,2),
  sap_doc_number       text,
  actual_delivery_date date,
  receive_status       text default 'Pending',
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

create index on calloff_plan(plant, delivery_date);
create index on calloff_plan(mail_status);
create index on calloff_plan(receive_status);
create index on calloff_plan(supplier_name);
```

---

## Row Level Security (RLS)
เปิด RLS บน Supabase และตั้ง policy ให้เหมาะกับองค์กร  
ตัวอย่าง policy แบบ open (dev mode):

```sql
-- Allow all for anon/authenticated (ปรับตามจริง)
create policy "allow_all" on calloff_plan    for all using (true) with check (true);
create policy "allow_all" on master_plant    for all using (true) with check (true);
create policy "allow_all" on master_supplier for all using (true) with check (true);
```

---

## Status Values

| Field | Values |
|-------|--------|
| status | Active, Cancelled |
| mail_status | Pending, Sent |
| receive_status | Pending, Received, SAP Completed |

---

## Fiscal Year Logic
ปีงบประมาณไทย: **ตุลาคม (FY-1) → กันยายน (FY)**

```js
function getCurrentFY() {
  const m = new Date().getMonth() + 1;
  const y = new Date().getFullYear();
  return m >= 10 ? y + 1 : y;
}
// FY2026 = ต.ค. 2025 → ก.ย. 2026
// date range: 2025-10-01 → 2026-09-30
```
