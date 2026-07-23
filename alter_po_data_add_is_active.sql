-- เพิ่มคอลัมน์ is_active ลงในตาราง po_data สำหรับระบุว่ารายการนี้ถูกปิดการใช้งานหรือไม่
-- (ค่าเริ่มต้นเป็น true = เปิดใช้งาน)
alter table po_data add column if not exists is_active boolean default true;
