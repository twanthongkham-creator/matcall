-- อัปเดตชื่อ Supplier ในตาราง master_supplier, calloff_plan และ po_data ให้เป็นมาตรฐานเดียวกับ SAP
-- 1. เปลี่ยนจาก 'บจก.เจ้าคุณเกษตรพืชผล' หรือชื่อเพี้ยนของเจ้าคุณ เป็น 'เจ้าคุณเกษตรพืชผล'
-- 2. เปลี่ยนจาก 'WGC' หรือชื่อเพี้ยนของ WGC เป็น 'ดับเบิ้ลยูจีซี'

-- ตาราง master_supplier
update master_supplier
set supplier_name = 'เจ้าคุณเกษตรพืชผล'
where supplier_name = 'บจก.เจ้าคุณเกษตรพืชผล';

update master_supplier
set supplier_name = 'ดับเบิ้ลยูจีซี'
where supplier_name = 'WGC';

-- ตาราง calloff_plan
update calloff_plan
set supplier_name = 'เจ้าคุณเกษตรพืชผล'
where supplier_name = 'บจก.เจ้าคุณเกษตรพืชผล';

update calloff_plan
set supplier_name = 'ดับเบิ้ลยูจีซี'
where supplier_name = 'WGC';

-- ตาราง po_data (อัปเดตชื่อที่เพี้ยนจากภาษา/การเข้ารหัสระบบ SAP เดิม)
update po_data
set supplier_name = 'เจ้าคุณเกษตรพืชผล'
where supplier_name = 'บจก.เจ้าคุณเกษตรพืชผล' or supplier_name like '%Ҥس%';

update po_data
set supplier_name = 'ดับเบิ้ลยูจีซี'
where supplier_name = 'WGC' or supplier_name like '%Ѻ٨%';
