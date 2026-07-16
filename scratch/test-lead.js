const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Helper to load .env.local manually
function loadEnv() {
  const envPath = path.join(__dirname, '../.env.local');

  if (!fs.existsSync(envPath)) {
    console.warn("Could not find .env.local at " + envPath);
    return;
  }

  console.log(`Loading environment from: ${envPath}`);
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)$/);
    if (match) {
      const key = match[1].trim();
      let val = match[2].trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1);
      } else if (val.startsWith("'") && val.endsWith("'")) {
        val = val.substring(1, val.length - 1);
      }
      process.env[key] = val;
    }
  });
}

loadEnv();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const webhookUrl = process.env.SHEET_WEBHOOK_URL;

console.log("----------------------------------------");
console.log("SUPABASE_URL:", supabaseUrl ? "Configured" : "MISSING");
console.log("SUPABASE_ANON_KEY:", supabaseAnonKey ? "Configured" : "MISSING");
console.log("SHEET_WEBHOOK_URL:", webhookUrl ? "Configured" : "MISSING");
console.log("----------------------------------------");

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("ERROR: Supabase URL or Anon Key is missing in .env.local.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runTestForPhone(phoneNum, isNew) {
  console.log(`\n========================================`);
  console.log(`RUNNING TEST FOR: ${isNew ? 'NEW PHONE' : 'EXISTING PHONE'} (${phoneNum})`);
  console.log(`========================================`);

  const payload = {
    name: "Test Student " + (isNew ? "New" : "Existing"),
    phone: phoneNum,
    class: "11",
    exam: "JEE",
    overallScore: 62,
    archetype: "Rank Builder",
    primaryBottleneck: "Focus",
    status: "Audit Completed"
  };

  try {
    const name = payload.name;
    const phone = payload.phone;

    const cleanedPhone = phone.trim().replace(/[\s()-]/g, "");
    let parsedPhone = cleanedPhone;
    if (parsedPhone.startsWith("+91") && parsedPhone.length === 13) {
      parsedPhone = parsedPhone.slice(3);
    } else if (parsedPhone.startsWith("91") && parsedPhone.length === 12 && /^[6-9]/.test(parsedPhone.slice(2))) {
      parsedPhone = parsedPhone.slice(2);
    } else if (parsedPhone.startsWith("0") && parsedPhone.length === 11) {
      parsedPhone = parsedPhone.slice(1);
    }

    console.log(`[Step 1] Checking if phone ${parsedPhone} exists in Supabase leads table...`);
    const { data: existingLeads, error: checkError } = await supabase
      .from("leads")
      .select("id, queue_number")
      .eq("phone", parsedPhone);

    if (checkError) {
      throw new Error(`Database check error: ${checkError.message}`);
    }

    const hasExisting = existingLeads && existingLeads.length > 0;
    let queueNumber;
    let leadId;

    if (hasExisting) {
      const existingLead = existingLeads[0];
      queueNumber = existingLead.queue_number;
      leadId = existingLead.id;
      console.log(`-> Lead already exists. ID: ${leadId}, Queue Number: ${queueNumber}`);
      console.log("Updating existing record...");

      const { error: updateError } = await supabase
        .from("leads")
        .update({
          name: name.trim(),
          class: payload.class,
          exam: payload.exam,
          overall_score: payload.overallScore,
          archetype: payload.archetype,
          bottleneck: payload.primaryBottleneck,
          status: payload.status
        })
        .eq("id", leadId);

      if (updateError) {
        throw new Error(`Database update error: ${updateError.message}`);
      }
      console.log("-> Update completed successfully.");
    } else {
      console.log("-> Lead does not exist. Querying last queue number...");
      const { data: lastLeads, error: lastLeadsError } = await supabase
        .from("leads")
        .select("queue_number")
        .not("queue_number", "is", null)
        .order("created_at", { ascending: false })
        .limit(1);

      if (lastLeadsError) {
        throw new Error(`Database queue query error: ${lastLeadsError.message}`);
      }

      let nextNum = 1;
      if (lastLeads && lastLeads.length > 0 && lastLeads[0].queue_number) {
        const lastQueue = lastLeads[0].queue_number;
        const match = lastQueue.match(/CNM(\d+)/i);
        if (match) {
          nextNum = parseInt(match[1], 10) + 1;
        }
      }
      queueNumber = `CNM${String(nextNum).padStart(3, "0")}`;
      console.log(`-> Generated new Queue Number: ${queueNumber}`);

      console.log("Inserting new record in Supabase...");
      const { data: insertedLeads, error: insertError } = await supabase
        .from("leads")
        .insert({
          name: name.trim(),
          phone: parsedPhone,
          class: payload.class,
          exam: payload.exam,
          overall_score: payload.overallScore,
          archetype: payload.archetype,
          bottleneck: payload.primaryBottleneck,
          queue_number: queueNumber,
          status: payload.status
        })
        .select();

      if (insertError) {
        throw new Error(`Database insert error: ${insertError.message}`);
      }
      if (!insertedLeads || insertedLeads.length === 0) {
        throw new Error("No data returned from insert");
      }

      leadId = insertedLeads[0].id;
      console.log(`-> Insert completed successfully. ID: ${leadId}`);
    }

    console.log("\n[Step 2] Attempting Google Sheets backup...");
    if (webhookUrl && webhookUrl.trim() !== "" && !webhookUrl.includes("MOCK_WEB_APP_ID")) {
      const backupPayload = {
        ...payload,
        phone: parsedPhone,
        queueNumber,
        submissionId: "MOCK-SUB-" + Date.now()
      };
      
      const sheetResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backupPayload),
      });

      if (!sheetResponse.ok) {
        console.warn(`-> Google Sheets backup returned HTTP status ${sheetResponse.status}`);
      } else {
        const text = await sheetResponse.text();
        console.log(`-> Google Sheets backup response: ${text}`);
      }
    } else {
      console.warn("-> Google Sheets webhook not configured or invalid. Skipping backup.");
    }

    console.log("\nRESULT: SUCCESS");
    console.log("Queue Number: ", queueNumber);
    console.log("Lead ID:      ", leadId);
    
    // Clean up if it was a new record
    if (isNew) {
      console.log("\nCleaning up generated test record...");
      await supabase.from('leads').delete().eq('id', leadId);
      console.log("Cleanup complete.");
    }

  } catch (err) {
    console.error("\nTEST FAILED!");
    console.error(err.message || err);
  }
}

async function runRunner() {
  // Test 1: Existing Phone (should update and reuse CNM001)
  await runTestForPhone("9876543210", false);

  // Test 2: New Phone (should generate a new number and insert)
  const newRandomPhone = "99" + String(Math.floor(10000000 + Math.random() * 90000000)).slice(0, 8);
  await runTestForPhone(newRandomPhone, true);
}

runRunner();
