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

const key = env.INTERAKT_API_KEY || '';

console.log("Analyzing INTERAKT_API_KEY...");
console.log("Key length:", key.length);

try {
  // Check if it is a valid base64 string
  const decoded = Buffer.from(key, 'base64').toString('utf8');
  // Check if it contains ASCII characters
  const isAscii = /^[\x20-\x7E]*$/.test(decoded);
  if (isAscii && decoded.length > 5) {
    console.log("-> SUCCESS: The key IS a valid base64 encoded string.");
    console.log("-> Decoded length:", decoded.length);
    console.log("-> Does decoded content contain a colon? ", decoded.includes(':'));
    console.log("-> Decoded preview (first 10 chars):", decoded.substring(0, 10) + "...");
  } else {
    console.log("-> The key is NOT a base64 encoded string (contains non-ascii or too short).");
  }
} catch (err) {
  console.log("-> The key is NOT base64 encoded. Error:", err.message);
}
