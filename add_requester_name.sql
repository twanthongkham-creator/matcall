-- 1. เพิ่มคอลัมน์ requester_name ลงในตาราง calloff_plan
alter table calloff_plan add column if not exists requester_name text;

-- (ทางเลือก) อัปเดตข้อมูลเก่าที่ไม่มีชื่อผู้ร้องขอให้เป็น '-' 
-- update calloff_plan set requester_name = '-' where requester_name is null;
