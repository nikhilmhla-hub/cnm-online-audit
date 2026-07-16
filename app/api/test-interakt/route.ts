import { NextResponse } from "next/server";

export async function GET() {
  const interaktApiKey = process.env.INTERAKT_API_KEY;

  if (!interaktApiKey || interaktApiKey.trim() === "") {
    return NextResponse.json({
      connectivity: false,
      error: "INTERAKT_API_KEY is not configured in .env.local"
    }, { status: 400 });
  }

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
  const trackUrl = "https://api.interakt.ai/v1/public/track/users/";
  
  const payload = {
    countryCode: "+91",
    phoneNumber: "9876543210",
    traits: {
      name: "CNM Diagnostic Test Contact",
      testTime: new Date().toISOString()
    }
  };

  console.log("[Test Interakt API]: Verifying connectivity to Interakt Track API...");
  console.log("[Test Interakt API]: Payload:", JSON.stringify(payload, null, 2));

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
    const bodyText = await response.text();
    console.log(`[Test Interakt API]: Response status code: ${status}`);
    console.log(`[Test Interakt API]: Response body: ${bodyText}`);

    let data: any = null;
    try {
      data = JSON.parse(bodyText);
    } catch {
      data = { raw: bodyText };
    }

    if (response.ok && data.result !== false) {
      return NextResponse.json({
        connectivity: true,
        step: "Create Test Contact",
        status: "success",
        httpStatus: status,
        interaktResponse: data
      });
    } else {
      return NextResponse.json({
        connectivity: true,
        step: "Create Test Contact",
        status: "failed",
        httpStatus: status,
        interaktResponse: data
      }, { status: 500 });
    }

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[Test Interakt API Exception]:", err);
    return NextResponse.json({
      connectivity: false,
      step: "Network Call",
      error: errorMsg
    }, { status: 500 });
  }
}
