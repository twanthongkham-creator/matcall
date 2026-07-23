const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://veasbnqtfeaaxdpvqhcz.supabase.co";
const SUPABASE_KEY = "sb_publishable_lNHI_haN0Key4pflGRc9rw_lvMiML3Q";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  const { data, error } = await supabase.from('calloff_plan').select('*').limit(1);
  if (error) console.error(error);
  else console.log("Columns:", data.length > 0 ? Object.keys(data[0]) : "No data");
}
check();
