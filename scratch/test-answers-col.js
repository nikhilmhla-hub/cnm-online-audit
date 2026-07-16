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

async function testColumn() {
  console.log("Testing insert with 'answers_json' column...");
  const tempPhone = "9999999999";
  const { data, error } = await supabase.from('leads').insert({
    phone: tempPhone,
    name: "Schema Test Student",
    answers_json: JSON.stringify({ q1: "Almost Never" })
  }).select();

  if (error) {
    console.log("❌ Insert failed:", error.message);
    console.log("Error details:", error);
  } else {
    console.log("✅ SUCCESS! Column 'answers_json' exists and insert succeeded:", data);
    
    // Clean up
    console.log("Cleaning up schema test insert...");
    await supabase.from('leads').delete().eq('phone', tempPhone);
  }
}

testColumn();
