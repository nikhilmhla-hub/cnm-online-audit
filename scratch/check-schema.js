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
const TARGET_LEAD_ID = "03ffd4ea-a8c1-4a66-b141-e6f344c5264f";

async function testMinimalBooking() {
  console.log("Attempting to insert a minimal booking record without 'status'...");
  const tempBookingId = "BK-MIN-" + Date.now();
  
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      booking_id: tempBookingId,
      lead_id: TARGET_LEAD_ID,
      queue_number: "CNM999",
      whatsapp_status: "Failed"
    })
    .select();

  if (error) {
    console.error("Minimal insert failed:", error);
  } else {
    console.log("Minimal insert succeeded!", data);
    
    // Clean it up
    console.log("Cleaning up minimal insert...");
    await supabase.from('bookings').delete().eq('booking_id', tempBookingId);
  }
}

testMinimalBooking();
