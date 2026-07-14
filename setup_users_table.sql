-- Create app_users table
create table if not exists app_users (
  id          bigserial primary key,
  username    text not null unique,
  name        text not null,
  plant_code  text, -- plant code assignment (null for super admins)
  role        text not null default 'User', -- 'Admin' or 'User'
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
insert into app_users (username, name, plant_code, role, password) values
  ('admin', 'Super Admin', null, 'Admin', '1234'),
  
  ('550101', 'วัชระ รุ่งเรือง', 'PT', 'User', '550101'),
  ('550102', 'อนันต์ ศรีสุข', 'PT', 'Admin', '550102'),
  
  ('550201', 'เกียรติศักดิ์ พูนผล', 'KR', 'User', '550201'),
  ('550202', 'ณรงค์ศักดิ์ สุขใจ', 'KR', 'Admin', '550202'),
  
  ('550301', 'ประวิทย์ ขยันยิ่ง', 'NS', 'User', '550301'),
  ('550302', 'สุรเดช สว่างเนตร', 'NS', 'Admin', '550302'),
  
  ('550401', 'สมศักดิ์ รักชาติ', 'SR', 'User', '550401'),
  ('550402', 'ธีรยุทธ วันทองคำ', 'SR', 'Admin', '550402'),
  
  ('550501', 'ไพโรจน์ รอดภัย', 'CH', 'User', '550501'),
  ('550502', 'วิชัย ดีประเสริฐ', 'CH', 'Admin', '550502'),
  
  ('550601', 'มานพ แก้วคง', 'NP', 'User', '550601'),
  ('550602', 'ธนากร ใจเย็น', 'NP', 'Admin', '550602')
on conflict (username) do update 
set name = excluded.name, plant_code = excluded.plant_code, role = excluded.role, password = excluded.password;
