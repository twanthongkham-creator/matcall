-- SQL script to fill missing requester_name in calloff_plan table
-- This updates old records where requester_name is null/empty to 'ธีรยุทธ แหวนทองคำ' (or a default name) as they were created before the column was added.

update calloff_plan 
set requester_name = 'ธีรยุทธ แหวนทองคำ' 
where requester_name is null or requester_name = '' or requester_name = '-';
