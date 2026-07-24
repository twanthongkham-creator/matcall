-- Add email_pan to master_supplier table
alter table master_supplier add column if not exists email_pan text;

-- Remove email_pan from master_plant table (We can keep the column or remove it, let's keep it in DB but stop using it, or we can drop it. To be safe, we just leave it or drop it. Let's drop it to avoid confusion)
alter table master_plant drop column if exists email_pan;
