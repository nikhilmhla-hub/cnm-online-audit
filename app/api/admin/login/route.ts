import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

    if (password === adminPassword) {
      // Return a base64 encoded token matching the server-side password configuration
      const token = `CNM-AUTH-${Buffer.from(adminPassword).toString("base64")}`;
      return NextResponse.json({
        status: "success",
        token
      });
    }

    return NextResponse.json(
      { status: "error", message: "Invalid credentials" },
      { status: 401 }
    );
  } catch (error) {
    console.error("[Admin Login Error]:", error);
    return NextResponse.json(
      { status: "error", message: "Internal server error" },
      { status: 500 }
    );
  }
}
