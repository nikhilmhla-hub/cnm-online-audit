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
  console.error("Please fill in SUPABASE_URL and SUPABASE_ANON_KEY first.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const TARGET_LEAD_ID = "03ffd4ea-a8c1-4a66-b141-e6f344c5264f";

async function runBookingTest() {
  try {
    console.log(`\n[Step 1] Checking if lead with ID ${TARGET_LEAD_ID} exists in Supabase leads table...`);
    const { data: leadRecord, error: leadCheckError } = await supabase
      .from("leads")
      .select("id, phone, queue_number")
      .eq("id", TARGET_LEAD_ID);

    if (leadCheckError) {
      console.warn("-> Warning/Error checking lead ID in Supabase:", leadCheckError.message);
      console.log("Attempting to insert a mock lead with this ID to make sure foreign key constraint passes...");
      
      const { data: insertedLead, error: leadInsertError } = await supabase
        .from("leads")
        .insert({
          id: TARGET_LEAD_ID,
          name: "Test Lead for Booking",
          phone: "9876543210",
          queue_number: "CNM999",
          status: "Audit Completed"
        })
        .select();

      if (leadInsertError) {
        throw new Error(`Failed to insert placeholder lead: ${leadInsertError.message}`);
      }
      console.log("-> Placeholder lead created successfully.");
    } else if (!leadRecord || leadRecord.length === 0) {
      console.log("-> Lead ID not found in leads table. Creating placeholder lead with ID...");
      const { data: insertedLead, error: leadInsertError } = await supabase
        .from("leads")
        .insert({
          id: TARGET_LEAD_ID,
          name: "Test Lead for Booking",
          phone: "9876543210",
          queue_number: "CNM999",
          status: "Audit Completed"
        })
        .select();

      if (leadInsertError) {
        throw new Error(`Failed to insert placeholder lead: ${leadInsertError.message}`);
      }
      console.log("-> Placeholder lead created successfully.");
    } else {
      console.log("-> Lead successfully verified in database:", leadRecord[0]);
    }

    // Define booking test payload
    const bookingPayload = {
      bookingId: `BK-TEST-${Date.now()}`,
      submissionId: `SUB-TEST-${Date.now()}`,
      queueNumber: "CNM999",
      name: "Test Student",
      phone: "9876543210",
      class: "11",
      exam: "JEE",
      overallScore: 62,
      archetype: "Rank Builder",
      primaryBottleneck: "Focus",
      potentialGain: 10,
      bookingStatus: "Waiting",
      leadId: TARGET_LEAD_ID
    };

     console.log("\n[Step 2] Inserting booking into Supabase bookings table...");
     const { data: insertedBooking, error: bookingInsertError } = await supabase
       .from("bookings")
       .insert({
         booking_id: bookingPayload.bookingId,
         lead_id: bookingPayload.leadId,
         queue_number: bookingPayload.queueNumber,
         whatsapp_status: "Failed" // mock status for test
       })
       .select();

    if (bookingInsertError) {
      throw new Error(`Booking insertion error: ${bookingInsertError.message}`);
    }

    if (!insertedBooking || insertedBooking.length === 0) {
      throw new Error("Booking insert returned no data.");
    }

    const booking = insertedBooking[0];
    console.log("-> Booking record successfully inserted in Supabase!");
    console.log("Inserted Record:", booking);

    console.log("\n[Step 3] Verifying data requirements...");
    console.log("  1. Verify lead_id linkage matches: ", booking.lead_id === TARGET_LEAD_ID ? "PASS" : "FAIL");
    console.log("  2. Verify queue_number is stored:   ", booking.queue_number === "CNM999" ? "PASS" : "FAIL");
    console.log("  3. Verify whatsapp_status is stored:", booking.whatsapp_status !== undefined ? "PASS" : "FAIL");

    if (booking.lead_id !== TARGET_LEAD_ID || booking.queue_number !== "CNM999") {
      throw new Error("Verification checks failed on returned row columns.");
    }

    console.log("\n[Step 4] Attempting Google Sheets backup...");
    if (webhookUrl && webhookUrl.trim() !== "" && !webhookUrl.includes("MOCK_WEB_APP_ID")) {
      const sheetPayload = {
        ...bookingPayload,
        whatsappStatus: "Failed",
        whatsappSentTime: "",
        action: "booking"
      };

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sheetPayload),
      });

      if (!response.ok) {
        console.warn(`-> Google Sheets backup returned HTTP status: ${response.status}`);
      } else {
        const text = await response.text();
        console.log(`-> Google Sheets backup completed. Response: ${text}`);
      }
    } else {
      console.warn("-> Google Sheets webhook not configured. Skipping backup test.");
    }

    console.log("\n----------------------------------------");
    console.log("TEST COMPLETED SUCCESSFULLY!");
    console.log("API Response payload match:");
    console.log(JSON.stringify({
      status: "success",
      bookingId: bookingPayload.bookingId,
      queueNumber: bookingPayload.queueNumber,
      whatsappStatus: "Failed"
    }, null, 2));
    console.log("----------------------------------------");

  } catch (err) {
    console.error("\nBOOKING TEST FAILED!");
    console.error(err);
  }
}

runBookingTest();
