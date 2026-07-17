-- SQL Setup for PO Data (Purchasing Orders)

-- Create po_data table
create table if not exists po_data (
  id               bigserial primary key,
  po_number        text not null,
  po_item          text not null,
  plant            text not null, -- PT, KR, NS, SR, CH
  material_code    text not null, -- 120001706, 120001687, 120001688
  material_name    text not null, -- CO2 Gas, น้ำตาลเหลว, High Fructose Syrup 42%
  supplier_name    text,          -- ลินเด้ (ประเทศไทย), ไทยรุ่งเรืองอุตสาหกรรม, etc.
  qty_pending      numeric(14,2) not null default 0,
  order_qty        numeric(14,2) not null default 0,
  is_completed     boolean not null default false,
  doc_date         date,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- Enable RLS
alter table po_data enable row level security;

-- Add RLS policy for anonymous/authenticated access matching other tables
drop policy if exists "allow_all" on po_data;
create policy "allow_all" on po_data for all using (true) with check (true);

-- Index for fast plant + material queries
create index if not exists idx_po_plant_mat on po_data(plant, material_name);
create index if not exists idx_po_number on po_data(po_number);

-- Alter calloff_plan table to store the selected PO number
alter table calloff_plan add column if not exists po_number text;

-- Add supplier_name column if table already exists
alter table po_data add column if not exists supplier_name text;

-- Add unit price / currency columns (from SAP XLSX 'Net Price' / 'Crcy' columns)
-- so history.html can show price alongside each selectable PO number.
alter table po_data add column if not exists net_price numeric(14,4);
alter table po_data add column if not exists currency text;
