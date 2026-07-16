import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
    const expectedToken = `Bearer CNM-AUTH-${Buffer.from(adminPassword).toString("base64")}`;

    if (!authHeader || authHeader !== expectedToken) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized" },
        { status: 401 }
      );
    }

    const webhookUrl = process.env.SHEET_WEBHOOK_URL;
    if (!webhookUrl || webhookUrl.trim() === "" || webhookUrl.includes("MOCK_WEB_APP_ID")) {
      const configError = "Google Sheet webhook URL is missing or not configured";
      console.error("[Admin Update Fetch Error]:", configError);
      return NextResponse.json(
        { status: "error", message: configError },
        { status: 500 }
      );
    }

    const payload = await request.json();

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Google Sheets responded with status code ${response.status}`);
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Failed to record log updates to Google Sheets";
    console.error("[Admin Update Proxy Exception]:", error);
    return NextResponse.json(
      { status: "error", message: errorMsg },
      { status: 500 }
    );
  }
}
