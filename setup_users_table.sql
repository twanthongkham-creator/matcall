-- Create app_users table
create table if not exists app_users (
  id          bigserial primary key,
  username    text not null unique,
  name        text not null,
  plant_code  text, -- plant code assignment (null for super admins)
  role        text not null default 'User', -- 'Admin' or 'User'
  department  text not null default 'production', -- 'production' | 'warehouse' | 'admin'
  password    text not null default '5678', -- default password
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Enable RLS
alter table app_users enable row level security;

-- Create policy
drop policy if exists "allow_all" on app_users;
create policy "allow_all" on app_users for all using (true) with check (true);

-- Insert demo users
-- แผนกผลิต (production) = สร้างแผนเรียกเข้าวัตถุดิบ
-- แผนกคลัง (warehouse)  = รับวัตถุดิบจริง + ส่ง Email
insert into app_users (username, name, plant_code, role, department, password) values
  ('admin', 'Super Admin', null, 'Admin', 'admin', '1234'),

  -- PT ปทุมธานี
  ('550101', 'วัชระ รุ่งเรือง',       'PT', 'User',  'production', '550101'),
  ('550102', 'อนันต์ ศรีสุข',         'PT', 'Admin', 'production', '550102'),
  ('550103', 'สุภาพร มั่นคง',         'PT', 'User',  'warehouse',  '550103'),

  -- KR นครราชสีมา
  ('550201', 'เกียรติศักดิ์ พูนผล',  'KR', 'User',  'production', '550201'),
  ('550202', 'ณรงค์ศักดิ์ สุขใจ',    'KR', 'Admin', 'production', '550202'),
  ('550203', 'ปริญญา สมบูรณ์',       'KR', 'User',  'warehouse',  '550203'),

  -- NS นครสวรรค์
  ('550301', 'ประวิทย์ ขยันยิ่ง',     'NS', 'User',  'production', '550301'),
  ('550302', 'สุรเดช สว่างเนตร',      'NS', 'Admin', 'production', '550302'),
  ('550303', 'วารี ใจงาม',           'NS', 'User',  'warehouse',  '550303'),

  -- SR สุราษฎร์ธานี
  ('550401', 'สมศักดิ์ รักชาติ',      'SR', 'User',  'production', '550401'),
  ('550402', 'ธีรยุทธ วันทองคำ',      'SR', 'Admin', 'production', '550402'),
  ('550403', 'สมหมาย ดีเลิศ',        'SR', 'User',  'warehouse',  '550403'),

  -- CH ชลบุรี
  ('550501', 'ไพโรจน์ รอดภัย',       'CH', 'User',  'production', '550501'),
  ('550502', 'วิชัย ดีประเสริฐ',      'CH', 'Admin', 'production', '550502'),
  ('550503', 'มณี สุขสบาย',          'CH', 'User',  'warehouse',  '550503'),

  -- NP นครปฐม
  ('550601', 'มานพ แก้วคง',          'NP', 'User',  'production', '550601'),
  ('550602', 'ธนากร ใจเย็น',         'NP', 'Admin', 'production', '550602'),
  ('550603', 'กนกวรรณ ศรีทอง',       'NP', 'User',  'warehouse',  '550603')

on conflict (username) do update
set name = excluded.name, plant_code = excluded.plant_code,
    role = excluded.role, department = excluded.department, password = excluded.password;

