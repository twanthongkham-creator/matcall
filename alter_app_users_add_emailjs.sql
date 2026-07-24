-- อัปเดตตาราง app_users เพื่อเพิ่มคอลัมน์เก็บข้อมูลตั้งค่า EmailJS แยกตามคน
-- รันสคริปต์นี้ใน Supabase SQL Editor

alter table app_users add column if not exists emailjs_service_id text;
alter table app_users add column if not exists emailjs_template_id text;
alter table app_users add column if not exists emailjs_public_key text;
