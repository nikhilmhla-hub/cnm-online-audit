import { NextResponse } from "next/server";

export async function GET(request: Request) {
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
      console.error("[Admin Data Fetch Error]:", configError);
      return NextResponse.json(
        { status: "error", message: configError },
        { status: 500 }
      );
    }

    // Perform GET request to Google Apps Script Web App with action=fetch
    const separator = webhookUrl.includes("?") ? "&" : "?";
    const response = await fetch(`${webhookUrl}${separator}action=fetch`, {
      method: "GET",
      // Disable default caching to ensure fresh bookings queue loading
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Google Sheets responded with status code ${response.status}`);
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Failed to retrieve logs from Google Sheets";
    console.error("[Admin Data Proxy Exception]:", error);
    return NextResponse.json(
      { status: "error", message: errorMsg },
      { status: 500 }
    );
  }
}
