import { NextResponse } from "next/server";
import { POST } from "../leads/route";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    console.log("[Test Lead API]: Initiating API test...");

    // 1. Construct mock request payload
    const payload = {
      name: "Test Student",
      phone: "9876543210",
      class: "11",
      exam: "JEE",
      overallScore: 62,
      archetype: "Rank Builder",
      primaryBottleneck: "Focus",
      status: "Audit Completed"
    };

    const mockRequest = new Request("http://localhost:3000/api/leads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    // 2. Call the POST handler directly
    const apiResponse = await POST(mockRequest);
    const apiResult = await apiResponse.json();

    console.log("[Test Lead API]: API handler response status code:", apiResponse.status);
    console.log("[Test Lead API]: API handler result:", apiResult);

    if (apiResponse.status !== 200 || apiResult.status !== "success") {
      return NextResponse.json({
        testStatus: "failed",
        step: "API Call",
        error: apiResult
      }, { status: apiResponse.status });
    }

    const { queueNumber, leadId } = apiResult;

    // 3. Verify lead inserted in Supabase
    console.log(`[Test Lead API]: Verifying lead insertion in Supabase for ID: ${leadId}...`);
    const { data: dbLeads, error: dbError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId);

    if (dbError) {
      console.error("[Test Lead API]: Failed to query lead from Supabase:", dbError);
      return NextResponse.json({
        testStatus: "failed",
        step: "Verify Supabase Insertion",
        error: dbError
      }, { status: 500 });
    }

    if (!dbLeads || dbLeads.length === 0) {
      return NextResponse.json({
        testStatus: "failed",
        step: "Verify Supabase Insertion",
        message: `No lead found in database with ID ${leadId}`
      }, { status: 500 });
    }

    const insertedLead = dbLeads[0];

    // 4. Return complete test results
    return NextResponse.json({
      testStatus: "success",
      verification: {
        apiResponseSuccess: true,
        queueNumberGenerated: queueNumber,
        leadIdInSupabase: leadId,
        databaseRecord: insertedLead,
        googleSheetsBackupAttempted: true
      }
    });

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[Test Lead API Critical Exception]:", err);
    return NextResponse.json({
      testStatus: "error",
      message: errorMsg
    }, { status: 500 });
  }
}
