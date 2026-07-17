-- Create app_users table
create table if not exists app_users (
  id          bigserial primary key,
  username    text not null unique,
  name        text not null,
  plant_code  text, -- plant code assignment (null for super admins)
  role        text not null default 'User', -- 'Admin' or 'User'
  department  text not null default 'production', -- 'production' | 'warehouse' | 'admin'
  password    text not null default '5678', -- default password
  email       text, -- email address used as sender when sending supplier call-off emails
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Add email column if upgrading from older version
alter table app_users add column if not exists email text;

-- Enable RLS
alter table app_users enable row level security;

-- Create policy
drop policy if exists "allow_all" on app_users;
create policy "allow_all" on app_users for all using (true) with check (true);

-- Insert demo users
-- แผนกผลิต (production) = สร้างแผนเรียกเข้าวัตถุดิบ
-- แผนกคลัง (warehouse)  = รับวัตถุดิบจริง + ส่ง Email
insert into app_users (username, name, plant_code, role, department, password, email) values
  ('admin', 'Super Admin', null, 'Admin', 'admin', '1234', 'admin@sermsukplc.com'),

  -- PT ปทุมธานี
  ('550101', 'วัชระ รุ่งเรือง',       'PT', 'User',  'production', '550101', 'watchara.r@sermsukplc.com'),
  ('550102', 'อนันต์ ศรีสุข',         'PT', 'Admin', 'production', '550102', 'anant.s@sermsukplc.com'),
  ('550103', 'สุภาพร มั่นคง',         'PT', 'User',  'warehouse',  '550103', 'supaporn.m@sermsukplc.com'),

  -- KR นครราชสีมา
  ('550201', 'เกียรติศักดิ์ พูนผล',  'KR', 'User',  'production', '550201', 'kiattisak.p@sermsukplc.com'),
  ('550202', 'ณรงค์ศักดิ์ สุขใจ',    'KR', 'Admin', 'production', '550202', 'narongsak.s@sermsukplc.com'),
  ('550203', 'ปริญญา สมบูรณ์',       'KR', 'User',  'warehouse',  '550203', 'parinya.s@sermsukplc.com'),

  -- NS นครสวรรค์
  ('550301', 'ประวิทย์ ขยันยิ่ง',     'NS', 'User',  'production', '550301', 'prawit.k@sermsukplc.com'),
  ('550302', 'สุรเดช สว่างเนตร',      'NS', 'Admin', 'production', '550302', 'suradet.s@sermsukplc.com'),
  ('550303', 'วารี ใจงาม',           'NS', 'User',  'warehouse',  '550303', 'waree.j@sermsukplc.com'),

  -- SR สุราษฎร์ธานี
  ('550401', 'สมศักดิ์ รักชาติ',      'SR', 'User',  'production', '550401', 'somsak.r@sermsukplc.com'),
  ('550402', 'ธีรยุทธ วันทองคำ',      'SR', 'Admin', 'production', '550402', 'teerayut.w@sermsukplc.com'),
  ('550403', 'สมหมาย ดีเลิศ',        'SR', 'User',  'warehouse',  '550403', 'sommai.d@sermsukplc.com'),

  -- CH ชลบุรี
  ('550501', 'ไพโรจน์ รอดภัย',       'CH', 'User',  'production', '550501', 'pairoj.r@sermsukplc.com'),
  ('550502', 'วิชัย ดีประเสริฐ',      'CH', 'Admin', 'production', '550502', 'wichai.d@sermsukplc.com'),
  ('550503', 'มณี สุขสบาย',          'CH', 'User',  'warehouse',  '550503', 'manee.s@sermsukplc.com'),

  -- NP นครปฐม
  ('550601', 'มานพ แก้วคง',          'NP', 'User',  'production', '550601', 'manop.k@sermsukplc.com'),
  ('550602', 'ธนากร ใจเย็น',         'NP', 'Admin', 'production', '550602', 'thanakorn.j@sermsukplc.com'),
  ('550603', 'กนกวรรณ ศรีทอง',       'NP', 'User',  'warehouse',  '550603', 'kanokwan.s@sermsukplc.com')

on conflict (username) do update
set name = excluded.name, plant_code = excluded.plant_code,
    role = excluded.role, department = excluded.department,
    password = excluded.password, email = excluded.email;


