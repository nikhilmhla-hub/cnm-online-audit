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
    env[key] = val;
  }
});

const interaktApiKey = env.INTERAKT_API_KEY || '';

async function testAuth() {
  console.log("Testing direct authorization header (no double base64-encoding)...");
  
  // Use the loaded key directly as the basic auth token
  const authHeader = `Basic ${interaktApiKey.trim()}`;
  
  const trackUrl = "https://api.interakt.ai/v1/public/track/users/";
  const payload = {
    countryCode: "+91",
    phoneNumber: "9876543210",
    traits: {
      name: "CNM Diagnostic Test direct auth",
      testTime: new Date().toISOString()
    }
  };

  try {
    const response = await fetch(trackUrl, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const status = response.status;
    const body = await response.text();
    console.log("Response status:", status);
    console.log("Response body:", body);

    if (response.ok) {
      console.log("🎉 SUCCESS! Using the key directly worked. The token in your .env.local was already base64 encoded.");
    } else {
      console.log("❌ FAILED: Direct auth also failed. Checking raw key decoding...");
    }
  } catch (err) {
    console.error("Network error:", err.message);
  }
}

testAuth();
