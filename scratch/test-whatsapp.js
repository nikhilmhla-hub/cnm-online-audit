const fs = require('fs');
const path = require('path');

// Load env
const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const env = {};
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

const interaktApiKey = env.INTERAKT_API_KEY;
const whatsappApiToken = env.WHATSAPP_API_TOKEN;
const whatsappPhoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID;

console.log("==================================================");
console.log("WHATSAPP DIAGNOSTIC TEST RUNNER");
console.log("==================================================");
console.log("Environment Configurations:");
console.log("INTERAKT_API_KEY:          ", interaktApiKey ? `Configured (length: ${interaktApiKey.length})` : "EMPTY");
console.log("WHATSAPP_API_TOKEN:        ", whatsappApiToken ? `Configured (length: ${whatsappApiToken.length})` : "EMPTY");
console.log("WHATSAPP_PHONE_NUMBER_ID:  ", whatsappPhoneNumberId ? `Configured (${whatsappPhoneNumberId})` : "EMPTY");
console.log("==================================================\n");

const dummyData = {
  bookingId: "BK-TEST-WHATSAPP",
  name: "Test Student",
  phone: "9876543210",
  class: "11",
  exam: "JEE",
  overallScore: 62,
  archetype: "Rank Builder",
  primaryBottleneck: "Focus",
  potentialGain: 10,
  queueNumber: "CNM999"
};

const messageText = `🚨 NEW KIOSK SESSION BOOKING

Student: ${dummyData.name}
Phone: ${dummyData.phone}

Class: ${dummyData.class}
Exam: ${dummyData.exam}

Overall Score: ${dummyData.overallScore}%

Archetype: ${dummyData.archetype}

Primary Bottleneck:
${dummyData.primaryBottleneck || "None"}

Potential Improvement:
+${dummyData.potentialGain} Marks

Queue Number:
${dummyData.queueNumber}

Student is waiting upstairs at CNM System Labs.`;

async function runDiagnostics() {
  let attempted = false;

  // 1. Check Interakt Delivery Path
  if (interaktApiKey && interaktApiKey.trim() !== "") {
    attempted = true;
    console.log("[Diagnostic]: Attempting Interakt Delivery Pathway (Priority 1)...");
    let authHeader = "";
    if (interaktApiKey.trim().startsWith("Basic ")) {
      authHeader = interaktApiKey.trim();
    } else {
      let isBase64 = false;
      try {
        const decoded = Buffer.from(interaktApiKey.trim(), "base64").toString("utf8");
        isBase64 = /^[\x20-\x7E]*$/.test(decoded) && decoded.includes(":");
      } catch {}

      if (isBase64) {
        authHeader = `Basic ${interaktApiKey.trim()}`;
      } else {
        authHeader = `Basic ${Buffer.from(interaktApiKey.trim() + ":").toString("base64")}`;
      }
    }
    const url = "https://api.interakt.ai/v1/public/message/";
    
    const payload = {
      countryCode: "+91",
      phoneNumber: "8949454771",
      callbackData: `kiosk_booking_${dummyData.bookingId}`,
      type: "Template",
      template: {
        name: "cnm_new_booking_alert",
        languageCode: "en",
        bodyValues: [
          dummyData.name,
          dummyData.phone,
          dummyData.class,
          dummyData.exam,
          `${dummyData.overallScore}%`,
          (function(arch) {
            if (arch === "Knowledge Hoarder") return "Revision Weak";
            if (arch === "Distracted Learner") return "Focus Weak";
            if (arch === "Confidence Crisis") return "Confidence Weak";
            if (arch === "Rank Builder") return "Improving Student";
            if (arch === "Exam Warrior") return "Top Performer";
            return arch;
          })(dummyData.archetype),
          (function(bn) {
            if (bn === "Focus") return "Focus Weak";
            if (bn === "Revision") return "Revision Weak";
            if (bn === "Confidence") return "Confidence Weak";
            if (bn === "None") return "No Major Issue";
            return bn;
          })(dummyData.primaryBottleneck),
          dummyData.queueNumber
        ]
      }
    };

    console.log("-> URL:      ", url);
    console.log("-> Headers:  ", {
      "Authorization": `Basic ${authHeader.substring(0, 15)}... (redacted)`,
      "Content-Type": "application/json"
    });
    console.log("-> Payload:  ", JSON.stringify(payload, null, 2));

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      console.log("\n-> HTTP Status: ", response.status);
      const body = await response.text();
      console.log("-> Response Body: ", body);

      if (!response.ok) {
        console.error("\n❌ [Interakt Error]: API returned HTTP Error status code", response.status);
      } else {
        const resJson = JSON.parse(body);
        if (resJson.result === false) {
          console.error("\n❌ [Interakt Business Logic Error]: Interakt rejected payload execution:", resJson.message);
        } else {
          console.log("\n✅ [Interakt Success]: Message successfully scheduled or delivered via Interakt API!");
        }
      }
    } catch (fetchErr) {
      console.error("\n❌ [Interakt Connection Error]: Network request failed:", fetchErr.message);
    }
  }

  // 2. Check Meta Cloud API Delivery Path
  if (whatsappApiToken && whatsappApiToken.trim() !== "" && whatsappPhoneNumberId && whatsappPhoneNumberId.trim() !== "") {
    attempted = true;
    console.log("\n[Diagnostic]: Attempting Meta Cloud API Delivery Pathway (Priority 2)...");
    const url = `https://graph.facebook.com/v19.0/${whatsappPhoneNumberId.trim()}/messages`;
    
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: "918949454771",
      type: "text",
      text: {
        body: messageText
      }
    };

    console.log("-> URL:      ", url);
    console.log("-> Headers:  ", {
      "Authorization": `Bearer ${whatsappApiToken.substring(0, 10)}... (redacted)`,
      "Content-Type": "application/json"
    });
    console.log("-> Payload:  ", JSON.stringify(payload, null, 2));

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${whatsappApiToken.trim()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      console.log("\n-> HTTP Status: ", response.status);
      const body = await response.text();
      console.log("-> Response Body: ", body);

      if (!response.ok) {
        console.error("\n❌ [Meta Cloud API Error]: Facebook API returned error status:", response.status);
      } else {
        console.log("\n✅ [Meta Cloud API Success]: Message successfully delivered via Meta Cloud API!");
      }
    } catch (fetchErr) {
      console.error("\n❌ [Meta Cloud API Connection Error]: Network request failed:", fetchErr.message);
    }
  }

  if (!attempted) {
    console.error("❌ DIAGNOSTIC RESULT: No delivery pathway was executed.");
    console.error("Reason: Both Interakt and Meta Cloud API credentials are empty in .env.local.");
    console.error("Please configure either of them to enable WhatsApp alert dispatch.");
  }
}

runDiagnostics();
