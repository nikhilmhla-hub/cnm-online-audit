const fs = require('fs');
const path = require('path');

// Load environment configurations from .env.local
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

const interaktApiKey = process.env.INTERAKT_API_KEY;

console.log("==================================================");
console.log("INTERAKT EXCLUSIVE WHATSAPP TEST RUNNER");
console.log("==================================================");
const formattedKey = interaktApiKey && interaktApiKey.length > 20
  ? `${interaktApiKey.substring(0, 10)}...${interaktApiKey.substring(interaktApiKey.length - 10)}`
  : (interaktApiKey ? interaktApiKey : "MISSING");
console.log("INTERAKT_API_KEY: ", formattedKey);
console.log("==================================================\n");

if (!interaktApiKey || interaktApiKey.trim() === "") {
  console.error("ERROR: INTERAKT_API_KEY is not configured in .env.local.");
  process.exit(1);
}

let authHeader = "";
if (interaktApiKey.trim().startsWith("Basic ")) {
  authHeader = interaktApiKey.trim();
} else {
  let isBase64 = false;
  try {
    const decoded = Buffer.from(interaktApiKey.trim(), "base64").toString("utf8");
    isBase64 = /^[\x20-\x7E]*$/.test(decoded) && decoded.includes(":");
  } catch { }

  if (isBase64) {
    authHeader = `Basic ${interaktApiKey.trim()}`;
  } else {
    authHeader = `Basic ${Buffer.from(interaktApiKey.trim() + ":").toString("base64")}`;
  }
}

async function runInteraktTest() {
  // Test contact details
  const testContact = {
    name: "Test Interakt Node Student",
    phone: "9876543210",
    class: "12",
    exam: "NEET",
    overallScore: 75,
    archetype: "Rank Builder",
    primaryBottleneck: "Revision",
    potentialGain: 15,
    queueNumber: "CNM777"
  };

  try {
    // Step 1: Create or Update Contact in Interakt
    const trackUrl = "https://api.interakt.ai/v1/public/track/users/";
    const trackPayload = {
      countryCode: "+91",
      phoneNumber: testContact.phone,
      traits: {
        name: testContact.name,
        class: testContact.class,
        exam: testContact.exam,
        overallScore: `${testContact.overallScore}%`,
        archetype: testContact.archetype,
        bottleneck: testContact.primaryBottleneck,
        potentialGain: `+${testContact.potentialGain} Marks`,
        queueNumber: testContact.queueNumber
      }
    };

    console.log("[Step 1] Creating/Updating Contact in Interakt...");
    console.log("-> URL:      ", trackUrl);
    console.log("-> Payload:  ", JSON.stringify(trackPayload, null, 2));

    const trackResponse = await fetch(trackUrl, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(trackPayload)
    });

    const trackStatus = trackResponse.status;
    const trackBodyText = await trackResponse.text();
    console.log("-> HTTP Status:   ", trackStatus);
    console.log("-> Response Body: ", trackBodyText);

    if (!trackResponse.ok) {
      console.warn("⚠️ Warning: Contact track request failed on HTTP status " + trackStatus);
    } else {
      console.log("✅ Contact track completed successfully.");
    }

    // Step 2: Send WhatsApp alert template message
    const messageUrl = "https://api.interakt.ai/v1/public/message/";
    const messagePayload = {
      countryCode: "+91",
      phoneNumber: "8949454771", // alert recipient
      callbackData: `kiosk_booking_BK-TEST-INTERAKT`,
      type: "Template",
      template: {
        name: "cnm_new_booking_alert",
        languageCode: "en",
        bodyValues: [
          testContact.name,
          testContact.phone,
          testContact.class,
          testContact.exam,
          `${testContact.overallScore}%`,
          (function (arch) {
            if (arch === "Knowledge Hoarder") return "Revision Weak";
            if (arch === "Distracted Learner") return "Focus Weak";
            if (arch === "Confidence Crisis") return "Confidence Weak";
            if (arch === "Rank Builder") return "Improving Student";
            if (arch === "Exam Warrior") return "Top Performer";
            return arch;
          })(testContact.archetype),
          (function (bn) {
            if (bn === "Focus") return "Focus Weak";
            if (bn === "Revision") return "Revision Weak";
            if (bn === "Confidence") return "Confidence Weak";
            if (bn === "None") return "No Major Issue";
            return bn;
          })(testContact.primaryBottleneck),
          testContact.queueNumber,
          new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " (IST)"
        ]
      }
    };

    console.log("\n[Step 2] Sending Template Message Alert via Interakt...");
    console.log("-> URL:      ", messageUrl);
    console.log("-> Payload:  ", JSON.stringify(messagePayload, null, 2));

    const messageResponse = await fetch(messageUrl, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(messagePayload)
    });

    const messageStatus = messageResponse.status;
    const messageBodyText = await messageResponse.text();
    console.log("-> HTTP Status:   ", messageStatus);
    console.log("-> Response Body: ", messageBodyText);

    let messageData = {};
    try {
      messageData = JSON.parse(messageBodyText);
    } catch {
      messageData = { raw: messageBodyText };
    }

    if (messageResponse.ok && messageData.result !== false) {
      console.log("\n✅ Success! Template message successfully scheduled/delivered via Interakt.");
      console.log("Result Object:", messageData);
    } else {
      console.error("\n❌ Error: Interakt template sending failed.");
      console.error("Result Object:", messageData);
    }

  } catch (err) {
    console.error("\n❌ Fatal Test Error:", err);
  }
}

runInteraktTest();
