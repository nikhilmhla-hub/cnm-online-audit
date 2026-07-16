const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
const envPath = path.join(__dirname, '../.env.local');
const env = {};
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)$/);
    if (match) {
      const key = match[1].trim();
      let val = match[2].trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.substring(1, val.length - 1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.substring(1, val.length - 1);
      env[key] = val;
    }
  });
}

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

async function inspectConstraints() {
  console.log("==========================================");
  console.log("DATABASE UNIQUE CONSTRAINT TESTER");
  console.log("==========================================\n");

  // Step 1: Read a valid lead record to copy phone/submission_id
  const { data: leads } = await supabase.from('leads').select('*').limit(1);
  if (!leads || leads.length === 0) {
    console.log("No existing records in leads table to run check.");
    return;
  }

  const existingPhone = leads[0].phone;
  const existingSubId = leads[0].submission_id;

  console.log(`Existing lead in DB: Phone = "${existingPhone}", Submission ID = "${existingSubId}"\n`);

  // Test 1: Try inserting a new record with the SAME phone number
  console.log("[Constraint Test 1] Attempting to insert a duplicate PHONE number...");
  const tempPhone = "TEMP-" + Date.now();
  const { error: phoneErr } = await supabase
    .from('leads')
    .insert({
      phone: existingPhone, // Duplicate phone!
      name: "Duplicate Phone Test Student",
      submission_id: "TEST-SUB-PHONE-" + Date.now()
    });

  if (phoneErr) {
    console.log(`❌ Test 1 FAILED. Database rejected insert. Error Code: ${phoneErr.code}, Message: ${phoneErr.message}`);
  } else {
    console.log(`✅ Test 1 PASSED! Database allowed multiple rows with the same phone number.`);
    // Clean up
    await supabase.from('leads').delete().eq('name', "Duplicate Phone Test Student");
  }

  // Test 2: Try inserting a new record with the SAME submission_id
  console.log("\n[Constraint Test 2] Attempting to insert a duplicate SUBMISSION_ID...");
  if (!existingSubId) {
    console.log("-> Skipped (existing submission_id is null).");
  } else {
    const { error: subErr } = await supabase
      .from('leads')
      .insert({
        phone: "9988998899", // Unique phone
        name: "Duplicate SubID Test Student",
        submission_id: existingSubId // Duplicate submission_id!
      });

    if (subErr) {
      console.log(`❌ Test 2 FAILED. Database rejected insert. Error Code: ${subErr.code}, Message: ${subErr.message}`);
    } else {
      console.log(`✅ Test 2 PASSED! Database allowed duplicate submission_ids.`);
      // Clean up
      await supabase.from('leads').delete().eq('name', "Duplicate SubID Test Student");
    }
  }

  console.log("\n==========================================");
}

inspectConstraints();
