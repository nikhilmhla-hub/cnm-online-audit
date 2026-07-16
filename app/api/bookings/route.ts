import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";


interface BookingPayload {
  bookingId: string;
  submissionId: string;
  queueNumber: string;
  name: string;
  phone: string;
  class: string;
  exam: string;
  overallScore: number;
  archetype: string;
  primaryBottleneck: string;
  potentialGain: number;
  bookingStatus?: string;
}

async function sendWhatsAppAlert(data: BookingPayload): Promise<{ status: "Sent" | "Failed"; sentTime: string; responseData: any }> {
  const interaktApiKey = process.env.INTERAKT_API_KEY;

  if (!interaktApiKey || interaktApiKey.trim() === "") {
    console.warn("[WhatsApp Dispatch Warning]: INTERAKT_API_KEY is not configured.");
    return { status: "Failed", sentTime: "", responseData: { error: "INTERAKT_API_KEY is not configured in .env.local" } };
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
  const recipient = "918949454771";

  // Clean student phone number
  const cleanedPhone = data.phone ? data.phone.trim().replace(/[\s()-]/g, "") : "";
  let parsedPhone = cleanedPhone;
  if (parsedPhone.startsWith("+91") && parsedPhone.length === 13) {
    parsedPhone = parsedPhone.slice(3);
  } else if (parsedPhone.startsWith("91") && parsedPhone.length === 12 && /^[6-9]/.test(parsedPhone.slice(2))) {
    parsedPhone = parsedPhone.slice(2);
  } else if (parsedPhone.startsWith("0") && parsedPhone.length === 11) {
    parsedPhone = parsedPhone.slice(1);
  }

  // 1. Create or update contact in Interakt
  const trackUrl = "https://api.interakt.ai/v1/public/track/users/";
  const trackPayload = {
    countryCode: "+91",
    phoneNumber: parsedPhone,
    traits: {
      name: data.name,
      class: data.class,
      exam: data.exam,
      overallScore: data.overallScore !== undefined ? `${data.overallScore}%` : "",
      archetype: data.archetype,
      bottleneck: data.primaryBottleneck || "None",
      potentialGain: data.potentialGain !== undefined ? `+${data.potentialGain} Marks` : "",
      queueNumber: data.queueNumber
    }
  };

  console.log("[WhatsApp Dispatch]: Interakt Track Contact Request URL:", trackUrl);
  console.log("[WhatsApp Dispatch]: Interakt Track Contact Request Payload:", JSON.stringify(trackPayload, null, 2));

  try {
    const trackResponse = await fetch(trackUrl, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(trackPayload)
    });
    const trackStatus = trackResponse.status;
    const trackBody = await trackResponse.text();
    console.log(`[WhatsApp Dispatch]: Interakt Track Contact Response Status: ${trackStatus}`);
    console.log(`[WhatsApp Dispatch]: Interakt Track Contact Response Body: ${trackBody}`);
  } catch (trackErr) {
    console.error("[WhatsApp Dispatch Exception]: Interakt Track Contact failed:", trackErr);
  }

  // 2. Send WhatsApp notification template to Counselor
  const messageUrl = "https://api.interakt.ai/v1/public/message/";
  const messagePayload = {
    countryCode: "+91",
    phoneNumber: "8949454771", // alert recipient
    callbackData: `kiosk_booking_${data.bookingId}`,
    type: "Template",
    template: {
      name: "cnm_new_booking_alert",
      languageCode: "en",
      bodyValues: [
        data.name || "",
        parsedPhone || "",
        data.class || "",
        data.exam || "",
        data.overallScore !== undefined ? `${data.overallScore}%` : "",
        (function(arch) {
          if (!arch) return "";
          var val = arch.trim();
          if (val === "Knowledge Hoarder") return "Revision Weak";
          if (val === "Distracted Learner") return "Focus Weak";
          if (val === "Confidence Crisis") return "Confidence Weak";
          if (val === "Rank Builder") return "Improving Student";
          if (val === "Exam Warrior") return "Top Performer";
          return val;
        })(data.archetype),
        (function(bn) {
          if (!bn) return "No Major Issue";
          var val = bn.trim();
          if (val === "Focus") return "Focus Weak";
          if (val === "Revision") return "Revision Weak";
          if (val === "Confidence") return "Confidence Weak";
          if (val === "None") return "No Major Issue";
          return val;
        })(data.primaryBottleneck),
        data.queueNumber || "",
        new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " (IST)"
      ]
    }
  };

  console.log("[WhatsApp Dispatch]: Interakt Message Dispatch Request URL:", messageUrl);
  console.log("[WhatsApp Dispatch]: Interakt Message Dispatch Request Payload:", JSON.stringify(messagePayload, null, 2));

  let responseData: any = null;
  let status: "Sent" | "Failed" = "Failed";

  try {
    const messageResponse = await fetch(messageUrl, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(messagePayload)
    });
    const messageStatus = messageResponse.status;
    const messageBody = await messageResponse.text();
    console.log(`[WhatsApp Dispatch]: Interakt Message Response Status: ${messageStatus}`);
    console.log(`[WhatsApp Dispatch]: Interakt Message Response Body: ${messageBody}`);

    try {
      responseData = JSON.parse(messageBody);
    } catch {
      responseData = { rawResponse: messageBody };
    }

    if (messageResponse.ok && responseData.result !== false) {
      status = "Sent";
      console.log("[WhatsApp Dispatch]: Interakt delivery succeeded.");
    } else {
      console.error("[WhatsApp Dispatch]: Interakt delivery failed.");
    }
  } catch (msgErr) {
    console.error("[WhatsApp Dispatch Exception]: Interakt message sending failed:", msgErr);
    responseData = { error: msgErr instanceof Error ? msgErr.message : String(msgErr) };
  }

  return { status, sentTime: new Date().toISOString(), responseData };
}

export async function POST(request: Request) {
  try {
    const data: BookingPayload = await request.json();
    const phone = data.phone;

    // Clean phone number: remove whitespaces, dashes, parentheses
    const cleanedPhone = phone ? phone.trim().replace(/[\s()-]/g, "") : "";
    let parsedPhone = cleanedPhone;
    if (parsedPhone.startsWith("+91") && parsedPhone.length === 13) {
      parsedPhone = parsedPhone.slice(3);
    } else if (parsedPhone.startsWith("91") && parsedPhone.length === 12 && /^[6-9]/.test(parsedPhone.slice(2))) {
      parsedPhone = parsedPhone.slice(2);
    } else if (parsedPhone.startsWith("0") && parsedPhone.length === 11) {
      parsedPhone = parsedPhone.slice(1);
    }

    const booking_id = data.bookingId || null;
    const submission_id = data.submissionId || null;
    let queue_number = data.queueNumber || null;
    const name = data.name || null;
    const studentClass = data.class || null;
    const exam = data.exam || null;
    const overall_score = data.overallScore !== undefined ? data.overallScore : null;
    const archetype = data.archetype || null;
    const bottleneck = data.primaryBottleneck || "None";
    const potential_gain = data.potentialGain !== undefined ? data.potentialGain : null;
    const status = data.bookingStatus || "Waiting";

    // 1. Resolve lead_id linkage and queue_number from Supabase (Source of Truth)
    let leadId = (data as any).leadId || (data as any).lead_id || null;

    if (parsedPhone) {
      console.log(`[Bookings API]: Resolving lead details from phone: ${parsedPhone}`);
      const { data: leadData, error: leadError } = await supabase
        .from("leads")
        .select("id, queue_number")
        .eq("phone", parsedPhone)
        .limit(1);

      if (leadError) {
        console.error("[Bookings API Exception]: Supabase lead look up failed:", leadError);
      } else if (leadData && leadData.length > 0) {
        leadId = leadData[0].id;
        if (leadData[0].queue_number) {
          queue_number = leadData[0].queue_number;
        }
        console.log(`[Bookings API]: Successfully resolved from Supabase: leadId = ${leadId}, queue = ${queue_number}`);
      } else {
        console.warn(`[Bookings API Warning]: No matching lead found for phone: ${parsedPhone}`);
      }
    }

    // Update payload queue number for WhatsApp notifications and backup
    data.queueNumber = queue_number || "";

    // 2. Continue existing WhatsApp notification logic (Guaranteed to be non-blocking)
    let whatsappStatus: "Sent" | "Failed" = "Failed";
    let whatsappSentTime = "";
    let interaktResponse: any = null;

    try {
      const waResult = await sendWhatsAppAlert(data);
      whatsappStatus = waResult.status;
      whatsappSentTime = waResult.sentTime;
      interaktResponse = waResult.responseData;
    } catch (waErr) {
      console.error("[Bookings API WhatsApp Dispatch Top-level Exception]:", waErr);
      interaktResponse = { error: waErr instanceof Error ? waErr.message : String(waErr) };
    }

    // 3. Prevent duplicate bookings by checking if a record already exists for this lead_id or booking_id
    let existingBookingRowId: string | null = null;
    if (leadId || booking_id) {
      const orQueryString = [];
      if (booking_id) orQueryString.push(`booking_id.eq.${booking_id}`);
      if (leadId) orQueryString.push(`lead_id.eq.${leadId}`);

      const { data: existingBookings, error: checkBookingError } = await supabase
        .from("bookings")
        .select("id, booking_id")
        .or(orQueryString.join(","))
        .limit(1);

      if (checkBookingError) {
        console.error("[Bookings API Exception]: Supabase booking check failed:", checkBookingError);
      } else if (existingBookings && existingBookings.length > 0) {
        existingBookingRowId = existingBookings[0].id;
        console.log(`[Bookings API]: Found existing booking (row ID: ${existingBookingRowId}). Reusing for update.`);
      }
    }

    let insertedBooking: any = null;
    let insertError: any = null;

    if (existingBookingRowId) {
      console.log(`[Bookings API]: Updating booking record row ID: ${existingBookingRowId} (leadId: ${leadId}, queue: ${queue_number})...`);
      const { data: updated, error: updateErr } = await supabase
        .from("bookings")
        .update({
          booking_id: booking_id,
          queue_number,
          whatsapp_status: whatsappStatus
        })
        .eq("id", existingBookingRowId)
        .select();
      insertedBooking = updated;
      insertError = updateErr;
    } else {
      console.log(`[Bookings API]: Inserting booking record into Supabase (leadId: ${leadId}, queue: ${queue_number})...`);
      const { data: inserted, error: insertErr } = await supabase
        .from("bookings")
        .insert({
          booking_id,
          lead_id: leadId,
          queue_number,
          whatsapp_status: whatsappStatus
        })
        .select();
      insertedBooking = inserted;
      insertError = insertErr;
    }

    if (insertError) {
      console.error("[Bookings API Exception]: Supabase booking operation failed:", insertError);
      return NextResponse.json(
        { status: "error", message: `Database insert error: ${insertError.message}` },
        { status: 500 }
      );
    }

    console.log("[Bookings API]: Booking database operation completed successfully.");

    // 4. Continue Google Sheets backup (Google Sheets failure must NOT fail the API request)
    const webhookUrl = process.env.SHEET_WEBHOOK_URL;
    if (webhookUrl && webhookUrl.trim() !== "" && !webhookUrl.includes("MOCK_WEB_APP_ID")) {
      try {
        console.log("[Bookings API]: Sending backup payload to Google Sheets webhook...");
        const sheetPayload = {
          ...data,
          phone: parsedPhone,
          whatsappStatus,
          whatsappSentTime,
          action: "booking"
        };
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(sheetPayload),
        });

        if (!response.ok) {
          console.warn(`[Bookings API Warning]: Google Sheets backup returned HTTP status ${response.status}`);
        } else {
          console.log("[Bookings API]: Google Sheets backup completed successfully.");
        }
      } catch (sheetError) {
        console.error("[Bookings API Exception]: Google Sheets backup failed (non-blocking):", sheetError);
      }
    } else {
      console.warn("[Bookings API Warning]: Google Sheets webhook not configured; skipping backup.");
    }

    // 5. Continue existing Telegram notification logic if bot tokens exist
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (botToken && botToken.trim() !== "" && chatId && chatId.trim() !== "") {
      const text = `🚨 *NEW KIOSK SESSION BOOKING*\n\n` +
        `*Student:* ${data.name}\n` +
        `*Phone:* ${data.phone}\n\n` +
        `*Class:* ${data.class}\n` +
        `*Exam:* ${data.exam}\n\n` +
        `*Overall Score:* ${data.overallScore}%\n` +
        `*Archetype:* ${data.archetype}\n\n` +
        `*Primary Bottleneck:*\n${data.primaryBottleneck || "None"}\n\n` +
        `*Potential Improvement:*\n+${data.potentialGain} Marks\n\n` +
        `*Queue Number:*\n${data.queueNumber || "#000"}\n\n` +
        `_WhatsApp Delivery Status: ${whatsappStatus}_\n\n` +
        `_Student is waiting upstairs._`;

      try {
        const tgResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: "Markdown"
          }),
        });

        if (!tgResponse.ok) {
          console.warn("[Telegram Alert Warning]: Telegram API returned status:", tgResponse.status);
        } else {
          console.log("[Telegram Alert Success]: Dispatched session booking notification.");
        }
      } catch (tgErr) {
        console.error("[Telegram Alert Exception]: Failed to send Telegram message:", tgErr);
      }
    }

    // 6. Return response matching the required shape
    return NextResponse.json({
      status: "success",
      bookingId: booking_id,
      queueNumber: queue_number,
      whatsappStatus,
      interaktResponse
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Failed to record booking";
    console.error("[Bookings API Critical Exception]:", error);
    return NextResponse.json(
      { status: "error", message: errorMsg },
      { status: 500 }
    );
  }
}
