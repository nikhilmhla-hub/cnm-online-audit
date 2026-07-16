import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const name = data.name;
    const phone = data.phone;

    // 1. Validation: name required
    if (!name || typeof name !== "string" || name.trim() === "") {
      console.warn("[Leads API Warning]: Validation failed - Missing or invalid name.");
      return NextResponse.json(
        { status: "error", message: "Name is required." },
        { status: 400 }
      );
    }

    // 2. Validation: phone required
    if (!phone || typeof phone !== "string") {
      console.warn("[Leads API Warning]: Validation failed - Missing or invalid phone.");
      return NextResponse.json(
        { status: "error", message: "Phone is required." },
        { status: 400 }
      );
    }

    // Clean phone number: remove whitespaces, dashes, parentheses
    const cleanedPhone = phone.trim().replace(/[\s()-]/g, "");
    // Strip +91, 91, or 0 if it is followed by a 10-digit number
    let parsedPhone = cleanedPhone;
    if (parsedPhone.startsWith("+91") && parsedPhone.length === 13) {
      parsedPhone = parsedPhone.slice(3);
    } else if (parsedPhone.startsWith("91") && parsedPhone.length === 12 && /^[6-9]/.test(parsedPhone.slice(2))) {
      parsedPhone = parsedPhone.slice(2);
    } else if (parsedPhone.startsWith("0") && parsedPhone.length === 11) {
      parsedPhone = parsedPhone.slice(1);
    }

    // Validation: must be a valid 10-digit Indian mobile number
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(parsedPhone)) {
      console.warn(`[Leads API Warning]: Validation failed - Invalid Indian mobile number format: ${phone}`);
      return NextResponse.json(
        { status: "error", message: "Phone must be a valid 10-digit Indian mobile number." },
        { status: 400 }
      );
    }

    console.log(`[Leads API]: Processing lead for ${name} (${parsedPhone})`);

    // 3. Check if phone already exists in Supabase leads table
    const { data: existingLeads, error: checkError } = await supabase
      .from("leads")
      .select("id, queue_number")
      .eq("phone", parsedPhone);

    if (checkError) {
      console.error("[Leads API Exception]: Supabase select check failed:", checkError);
      return NextResponse.json(
        { status: "error", message: `Database error: ${checkError.message}` },
        { status: 500 }
      );
    }

    const hasExisting = existingLeads && existingLeads.length > 0;
    let queueNumber: string;
    let leadId: string | number;

    let submission_id = data.submissionId || data.submission_id || null;
    if (submission_id) {
      submission_id = String(submission_id).trim();
      if (submission_id === "" || submission_id.toLowerCase() === "null" || submission_id.toLowerCase() === "undefined") {
        submission_id = null;
      }
    }
    const studentClass = data.class || data.studentClass || null;
    const exam = data.exam || null;
    const overall_score = data.overallScore !== undefined ? data.overallScore : (data.overall_score !== undefined ? data.overall_score : null);
    const archetype = data.archetype || null;
    const bottleneck = data.primaryBottleneck || data.bottleneck || "None";
    const status = data.status || "Audit Completed";

    if (hasExisting) {
      // 4. If phone exists: Update the existing record, preserving existing queue_number
      const existingLead = existingLeads[0];
      queueNumber = existingLead.queue_number;
      leadId = existingLead.id;

      console.log(`[Leads API]: Phone exists (leadId: ${leadId}). Updating existing record with queue: ${queueNumber}`);

      let { error: updateError } = await supabase
        .from("leads")
        .update({
          submission_id,
          name: name.trim(),
          class: studentClass,
          exam,
          overall_score,
          archetype,
          bottleneck,
          status,
          source: "Social Media"
        })
        .eq("id", leadId);

      // Self-healing duplicate submission_id handler
      if (updateError && updateError.code === "23505" && updateError.message && updateError.message.includes("submission_id")) {
        console.warn(`[Leads API Warning]: Duplicate submission_id constraint hit during update. Retrying update with submission_id = null...`);
        const { error: retryError } = await supabase
          .from("leads")
          .update({
            submission_id: null,
            name: name.trim(),
            class: studentClass,
            exam,
            overall_score,
            archetype,
            bottleneck,
            status,
            source: "Social Media"
          })
          .eq("id", leadId);
        updateError = retryError;
      }

      if (updateError) {
        console.error("[Leads API Exception]: Supabase update failed:", updateError);
        return NextResponse.json(
          { status: "error", message: `Database update error: ${updateError.message}` },
          { status: 500 }
        );
      }
    } else {
      // 5. If phone does not exist: Generate queue number (CNM001, CNM002...) and Insert a new lead
      console.log("[Leads API]: Phone does not exist. Generating queue number...");
      
      const { data: lastLeads, error: lastLeadsError } = await supabase
        .from("leads")
        .select("queue_number")
        .not("queue_number", "is", null)
        .order("created_at", { ascending: false })
        .limit(1);

      if (lastLeadsError) {
        console.error("[Leads API Exception]: Supabase select last queue failed:", lastLeadsError);
        return NextResponse.json(
          { status: "error", message: `Database sequence fetch error: ${lastLeadsError.message}` },
          { status: 500 }
        );
      }

      let nextNum = 1;
      if (lastLeads && lastLeads.length > 0 && lastLeads[0].queue_number) {
        const lastQueue = lastLeads[0].queue_number;
        const match = lastQueue.match(/CNM(\d+)/i);
        if (match) {
          nextNum = parseInt(match[1], 10) + 1;
        }
      }
      queueNumber = `CNM${String(nextNum).padStart(3, "0")}`;
      console.log(`[Leads API]: Generated global queue number: ${queueNumber}`);

      let { data: insertedLeads, error: insertError } = await supabase
        .from("leads")
        .insert({
          submission_id,
          name: name.trim(),
          phone: parsedPhone,
          class: studentClass,
          exam,
          overall_score,
          archetype,
          bottleneck,
          queue_number: queueNumber,
          status,
          source: "Social Media"
        })
        .select();

      // Self-healing duplicate phone constraint handler
      if (insertError && insertError.code === "23505" && insertError.message && insertError.message.includes("phone")) {
        console.warn(`[Leads API Warning]: Phone duplicate constraint hit during insert. Resolving to update existing record...`);
        const { data: retryLeads } = await supabase
          .from("leads")
          .select("id, queue_number")
          .eq("phone", parsedPhone)
          .limit(1);

        if (retryLeads && retryLeads.length > 0) {
          queueNumber = retryLeads[0].queue_number;
          leadId = retryLeads[0].id;

          const { data: updatedData, error: retryError } = await supabase
            .from("leads")
            .update({
              submission_id,
              name: name.trim(),
              class: studentClass,
              exam,
              overall_score,
              archetype,
              bottleneck,
              status,
              source: "Social Media"
            })
            .eq("id", leadId)
            .select();

          insertedLeads = updatedData;
          insertError = retryError;
        }
      }

      // Self-healing duplicate submission_id handler on insert
      if (insertError && insertError.code === "23505" && insertError.message && insertError.message.includes("submission_id")) {
        console.warn(`[Leads API Warning]: Duplicate submission_id constraint hit during insert. Retrying insert with submission_id = null...`);
        const { data: retryData, error: retryError } = await supabase
          .from("leads")
          .insert({
            submission_id: null,
            name: name.trim(),
            phone: parsedPhone,
            class: studentClass,
            exam,
            overall_score,
            archetype,
            bottleneck,
            queue_number: queueNumber,
            status,
            source: "Social Media"
          })
          .select();
        insertedLeads = retryData;
        insertError = retryError;
      }

      if (insertError) {
        console.error("[Leads API Exception]: Supabase insert failed:", insertError);
        return NextResponse.json(
          { status: "error", message: `Database insert error: ${insertError.message}` },
          { status: 500 }
        );
      }

      if (!insertedLeads || insertedLeads.length === 0) {
        console.error("[Leads API Error]: Insert completed but no data returned.");
        return NextResponse.json(
          { status: "error", message: "Failed to retrieve inserted lead details." },
          { status: 500 }
        );
      }

      leadId = insertedLeads[0].id;
      console.log(`[Leads API]: Successfully resolved lead (id: ${leadId})`);
    }

    // 7 & 8. Continue sending data to the existing Google Apps Script webhook as a backup (Google Sheets failure must NOT fail the API request)
    const webhookUrl = process.env.SHEET_WEBHOOK_URL;
    if (webhookUrl && webhookUrl.trim() !== "" && !webhookUrl.includes("MOCK_WEB_APP_ID")) {
      try {
        console.log("[Leads API]: Sending backup payload to Google Sheets webhook...");
        const backupPayload = {
          ...data,
          phone: parsedPhone
        };
        const sheetResponse = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(backupPayload),
        });

        if (!sheetResponse.ok) {
          console.warn(`[Leads API Warning]: Google Sheets webhook returned HTTP status ${sheetResponse.status}`);
        } else {
          console.log("[Leads API]: Google Sheets backup completed successfully.");
        }
      } catch (sheetError) {
        console.error("[Leads API Exception]: Google Sheets backup failed (non-blocking):", sheetError);
      }
    } else {
      console.warn("[Leads API Warning]: Google Sheets webhook URL is not configured or invalid; skipping backup.");
    }

    // 9. Return success response
    return NextResponse.json({
      status: "success",
      queueNumber,
      leadId
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("[Leads API Critical Exception]:", error);
    return NextResponse.json(
      { status: "error", message: errorMsg },
      { status: 500 }
    );
  }
}

