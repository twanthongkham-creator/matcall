-- Create supplier_quota table
create table if not exists supplier_quota (
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

-- Enable Row Level Security
alter table supplier_quota enable row level security;

-- Add RLS policy matching existing tables
drop policy if exists "allow_all" on supplier_quota;
create policy "allow_all" on supplier_quota for all using (true) with check (true);

-- Migrate existing contract details from master_supplier to supplier_quota
insert into supplier_quota (supplier_id, contract_start, contract_end, quota_percent, total_quota, remaining_quota)
select 
  id as supplier_id,
  contract_start,
  contract_end,
  coalesce(quota_percent, 0) as quota_percent,
  total_quota,
  remaining_quota
from master_supplier
where contract_start is not null or contract_end is not null or quota_percent is not null or total_quota is not null;
