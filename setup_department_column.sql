-- ============================================================
-- MATCALL – Add department column to app_users
-- Run this once on your Supabase project
-- ============================================================

-- 1. Add department column (production | warehouse | admin)
alter table app_users
  add column if not exists department text not null default 'production';

-- 2. Set admin users to department = 'admin'
update app_users set department = 'admin'
  where role = 'Admin' and (plant_code is null or plant_code = '');

-- 3. Seed sample: plant-level Admins → production by default (update manually as needed)
-- Example: update a specific user to warehouse
-- update app_users set department = 'warehouse' where username = '550102';

-- 4. Verify
select id, username, name, plant_code, role, department from app_users order by plant_code, department;
