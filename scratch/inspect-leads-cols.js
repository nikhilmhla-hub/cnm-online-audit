const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load env
const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const env = {};
envContent.split(/\r?\n/).forEach(line => {
  const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)$/);
  if (match) {
    const key = match[1].trim();
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.substring(1, val.length - 1);
    env[key] = val;
  }
});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

async function inspectLeads() {
  const { data, error } = await supabase.from('leads').select('*').limit(1);
  if (error) {
    console.error("Error fetching leads:", error);
  } else if (data && data.length > 0) {
    console.log("Leads record columns:", Object.keys(data[0]));
    console.log("Full record data:", data[0]);
  } else {
    console.log("Leads table is empty, attempting to fetch table description or insert a dummy to inspect error...");
    const { error: dummyErr } = await supabase.from('leads').insert({ phone: '0000000000', name: 'Inspection Dummy' }).select();
    if (dummyErr) {
      console.log("Dummy insert error message (contains column hints):", dummyErr.message);
    }
  }
}

inspectLeads();
