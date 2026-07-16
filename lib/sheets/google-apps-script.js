/* eslint-disable */
/**
 * CNM Audit Webhook & API Controller (Google Apps Script)
 * 
 * Instructions:
 * 1. Open Google Sheet.
 * 2. Click Extensions -> Apps Script.
 * 3. Replace any placeholder code with this complete script.
 * 4. Configure SPREADSHEET_ID below if running standalone (outside bound context).
 * 5. Click Deploy -> New Deployment.
 * 6. Set Select type to "Web app".
 * 7. Set Description to "CNM Audit webhook Web App".
 * 8. Set Execute as to "Me".
 * 9. Set Who has access to to "Anyone" (crucial for webhook integrations).
 * 10. Click Deploy, authorize permissions, and copy the Web App URL.
 * 11. Save this URL in your environment configurations as `SHEET_WEBHOOK_URL`.
 */

// Paste your spreadsheet ID here if running standalone. Leave empty if container-bound.
var SPREADSHEET_ID = ""; 

function getSpreadsheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== "") {
    return SpreadsheetApp.openById(SPREADSHEET_ID.trim());
  }
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) {
    throw new Error("No active spreadsheet found. Standalone scripts require configuring SPREADSHEET_ID.");
  }
  return active;
}

/**
 * Automatically checks and fixes headers in the specified sheet.
 * If A1 is not "Timestamp", inserts a new row at the top, inserts headers, and freezes Row 1.
 */
function getAndEnsureSheet(spreadsheet, name) {
  var sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
  }
  
  var lastRow = sheet.getLastRow();
  var needsHeaders = false;
  
  if (lastRow === 0) {
    needsHeaders = true;
  } else {
    var valA1 = sheet.getRange(1, 1).getValue();
    var expectedA1 = (name === "CNM Audit Leads") ? "Queue Number" : "Booking ID";
    if (valA1 !== expectedA1) {
      needsHeaders = true;
      sheet.insertRowBefore(1);
    }
  }
  
  if (needsHeaders) {
    var headers = [];
    var bg = "#D4AF37"; // Gold for Leads
    var fg = "#000000";
    
    if (name === "CNM Audit Leads") {
      headers = [
        "Queue Number",
        "Name",
        "Phone",
        "Class",
        "Exam",
        "Score",
        "Student Type",
        "Main Challenge",
        "Status",
        "Created Date",
        "Created Time",
        "Submission ID",
        "Study Consistency",
        "Understanding Speed",
        "Revision Habit",
        "Procrastination",
        "Revision Frequency",
        "Syllabus Coverage",
        "Chapter Completion",
        "Notes Making",
        "Problem Solving Approach",
        "Concept Revision",
        "Confidence Level",
        "Questions Solved",
        "Mock Test Frequency",
        "Test Analysis Habit",
        "Backlog Size",
        "Doubt Solving Habit",
        "Focus Level",
        "Pending Syllabus",
        "Improvement Mindset",
        "Exam Confidence"
      ];
      bg = "#D4AF37";
      fg = "#000000";
    } else if (name === "CNM Session Bookings") {
      headers = [
        "Booking ID",
        "Queue Number",
        "Name",
        "Phone",
        "Class",
        "Exam",
        "Score",
        "Student Type",
        "Main Challenge",
        "WhatsApp Status",
        "Booking Status",
        "Created Date",
        "Created Time"
      ];
      bg = "#3B82F6"; // Blue for Bookings
      fg = "#FFFFFF";
    }
    
    // Set headers at Row 1
    var range = sheet.getRange(1, 1, 1, headers.length);
    range.setValues([headers]);
    range.setFontWeight("bold").setBackground(bg).setFontColor(fg);
    
    // Freeze Row 1
    sheet.setFrozenRows(1);
  }
  
  return sheet;
}

function doGet(e) {
  try {
    var action = e && e.parameter ? e.parameter.action : null;
    
    // 1. Health Check Endpoint (Default fallback when no fetch action specified)
    if (action !== "fetch") {
      return ContentService.createTextOutput(JSON.stringify({
        status: "ready",
        service: "CNM Audit API"
      }))
      .setMimeType(ContentService.MimeType.JSON);
    }
    
    var spreadsheet = getSpreadsheet();
    
    // 2. Retrieve all Leads from Sheet #1
    var leadSheet = getAndEnsureSheet(spreadsheet, "CNM Audit Leads");
    var leads = [];
    var data = leadSheet.getDataRange().getValues();
    if (data.length > 1) {
      var headers = data[0];
      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        var lead = {};
        for (var j = 0; j < headers.length; j++) {
          lead[headers[j]] = row[j];
        }
        leads.push(lead);
      }
    }
    
    // 3. Retrieve all Bookings from Sheet #2
    var bookingSheet = getAndEnsureSheet(spreadsheet, "CNM Session Bookings");
    var bookings = [];
    var dataBookings = bookingSheet.getDataRange().getValues();
    if (dataBookings.length > 1) {
      var headersBookings = dataBookings[0];
      for (var i = 1; i < dataBookings.length; i++) {
        var row = dataBookings[i];
        var booking = {};
        for (var j = 0; j < headersBookings.length; j++) {
          booking[headersBookings[j]] = row[j];
        }
        bookings.push(booking);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      leads: leads,
      bookings: bookings
    }))
    .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Empty request payload"
      }))
      .setMimeType(ContentService.MimeType.JSON);
    }

    var json = JSON.parse(e.postData.contents);
    var action = json.action || "lead"; // Routing parameter

    // Archetype (Student Type) translation
    function mapArchetype(arch) {
      if (!arch) return "";
      var val = String(arch).trim();
      if (val === "Knowledge Hoarder") return "Revision Weak";
      if (val === "Distracted Learner") return "Focus Weak";
      if (val === "Confidence Crisis") return "Confidence Weak";
      if (val === "Rank Builder") return "Improving Student";
      if (val === "Exam Warrior") return "Top Performer";
      return val;
    }

    // Bottleneck (Main Issue) translation
    function mapBottleneck(bn) {
      if (!bn) return "No Major Issue";
      var val = String(bn).trim();
      if (val === "Focus") return "Focus Weak";
      if (val === "Revision") return "Revision Weak";
      if (val === "Confidence") return "Confidence Weak";
      if (val === "None") return "No Major Issue";
      return val;
    }

    var spreadsheet = getSpreadsheet();

    // Action 1: Append or Update Audit Lead Row
    if (action === "lead") {
      if (!json.phone || !json.name) {
        return ContentService.createTextOutput(JSON.stringify({
          status: "error",
          message: "Missing mandatory fields for lead action (phone and name are required)"
        }))
        .setMimeType(ContentService.MimeType.JSON);
      }

      var sheet = getAndEnsureSheet(spreadsheet, "CNM Audit Leads");
      var dataRange = sheet.getDataRange();
      var values = dataRange.getValues();
      var headers = values[0];
      
      var subIdCol = headers.indexOf("Submission ID");
      var rowIdx = -1;
      
      // Strict duplicate protection matching ONLY on Submission ID
      if (subIdCol !== -1 && json.submissionId) {
        for (var i = 1; i < values.length; i++) {
          if (values[i][subIdCol] === json.submissionId) {
            rowIdx = i + 1;
            break;
          }
        }
      }

      // Timestamp splitting (safely handles ISO formats)
      var dateObj = new Date();
      var tsStr = json.createdAt || json.timestamp;
      if (tsStr) {
        try {
          dateObj = new Date(tsStr);
        } catch (err) {}
      }
      
      var year = dateObj.getFullYear();
      var month = ("0" + (dateObj.getMonth() + 1)).slice(-2);
      var day = ("0" + dateObj.getDate()).slice(-2);
      var createdDate = year + "-" + month + "-" + day;

      var hours = ("0" + dateObj.getHours()).slice(-2);
      var minutes = ("0" + dateObj.getMinutes()).slice(-2);
      var seconds = ("0" + dateObj.getSeconds()).slice(-2);
      var createdTime = hours + ":" + minutes + ":" + seconds;

      // Extract quiz answers
      var answers = {};
      var answersStr = json.answersJson || json.answers_json;
      if (answersStr) {
        try {
          answers = JSON.parse(answersStr);
        } catch(err) {}
      } else if (json.answers) {
        answers = json.answers;
      }

      var rowValues = [
        json.queueNumber || "",
        json.name,
        "'" + json.phone, // Force text encoding to preserve leading zeros
        json.class || "",
        json.exam || "",
        json.overallScore !== undefined ? json.overallScore : (json.score !== undefined ? json.score : ""),
        mapArchetype(json.archetype),
        mapBottleneck(json.bottleneck || json.primaryBottleneck),
        json.status || json.leadStatus || "New",
        createdDate,
        createdTime,
        json.submissionId || ""
      ];

      for (var q = 1; q <= 20; q++) {
        var keyQ = "q" + q;
        var keyNum = String(q);
        var valQ = answers[keyQ] !== undefined ? answers[keyQ] : (answers[keyNum] !== undefined ? answers[keyNum] : "");
        rowValues.push(valQ);
      }

      if (rowIdx !== -1) {
        // Update existing row in-place (double-click protection)
        var range = sheet.getRange(rowIdx, 1, 1, rowValues.length);
        range.setValues([rowValues]);
      } else {
        // Append new row (preserves audit history for different submission IDs)
        sheet.appendRow(rowValues);
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Lead recorded successfully",
        queueNumber: json.queueNumber
      }))
      .setMimeType(ContentService.MimeType.JSON);
    }

    // Action 2: Append or Update Session Booking Row
    if (action === "booking") {
      if (!json.bookingId || !json.phone || !json.name) {
        return ContentService.createTextOutput(JSON.stringify({
          status: "error",
          message: "Missing mandatory fields for booking action (bookingId, phone, and name are required)"
        }))
        .setMimeType(ContentService.MimeType.JSON);
      }

      var sheet = getAndEnsureSheet(spreadsheet, "CNM Session Bookings");
      var dataRange = sheet.getDataRange();
      var values = dataRange.getValues();
      var headers = values[0];
      
      var bookingIdCol = headers.indexOf("Booking ID");
      var rowIdx = -1;
      
      // Booking duplicate protection matching strictly on Booking ID
      if (bookingIdCol !== -1 && json.bookingId) {
        for (var i = 1; i < values.length; i++) {
          if (values[i][bookingIdCol] === json.bookingId) {
            rowIdx = i + 1;
            break;
          }
        }
      }

      // Timestamp splitting (safely handles ISO formats)
      var dateObj = new Date();
      var tsStr = json.createdAt || json.timestamp;
      if (tsStr) {
        try {
          dateObj = new Date(tsStr);
        } catch (err) {}
      }
      
      var year = dateObj.getFullYear();
      var month = ("0" + (dateObj.getMonth() + 1)).slice(-2);
      var day = ("0" + dateObj.getDate()).slice(-2);
      var createdDate = year + "-" + month + "-" + day;

      var hours = ("0" + dateObj.getHours()).slice(-2);
      var minutes = ("0" + dateObj.getMinutes()).slice(-2);
      var seconds = ("0" + dateObj.getSeconds()).slice(-2);
      var createdTime = hours + ":" + minutes + ":" + seconds;

      var rowValues = [
        json.bookingId,
        json.queueNumber || "#000",
        json.name,
        "'" + json.phone,
        json.class || "",
        json.exam || "",
        json.overallScore !== undefined ? json.overallScore : (json.score !== undefined ? json.score : ""),
        mapArchetype(json.archetype),
        mapBottleneck(json.bottleneck || json.primaryBottleneck),
        json.whatsappStatus || "Pending",
        json.bookingStatus || json.status || "Waiting",
        createdDate,
        createdTime
      ];

      if (rowIdx !== -1) {
        // Update existing booking row in-place (double-click protection)
        var range = sheet.getRange(rowIdx, 1, 1, rowValues.length);
        range.setValues([rowValues]);
      } else {
        // Append new booking row
        sheet.appendRow(rowValues);
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Booking recorded successfully",
        bookingId: json.bookingId
      }))
      .setMimeType(ContentService.MimeType.JSON);
    }

    // Action 3: Update Lead Status Row (Dynamic Header Lookup)
    if (action === "update_lead") {
      var sheet = getAndEnsureSheet(spreadsheet, "CNM Audit Leads");
      var dataRange = sheet.getDataRange();
      var values = dataRange.getValues();
      var headers = values[0];
      
      var phoneCol = headers.indexOf("Phone");
      var queueCol = headers.indexOf("Queue Number");
      var statusCol = headers.indexOf("Status");
      
      if ((phoneCol === -1 && queueCol === -1) || statusCol === -1) {
        return ContentService.createTextOutput(JSON.stringify({ 
          status: "error", 
          message: "Required headers ('Phone' or 'Queue Number', and 'Status') not found in Leads sheet" 
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      var rowIdx = -1;
      for (var i = 1; i < values.length; i++) {
        var matchQueue = (json.queueNumber && values[i][queueCol] === json.queueNumber) || 
                           (json.submissionId && values[i][queueCol] === json.submissionId);
        var matchPhone = json.phone && String(values[i][phoneCol]).replace(/['\s()-]/g, "") === String(json.phone).replace(/['\s()-]/g, "");
        
        if (matchQueue || matchPhone) {
          rowIdx = i + 1;
          break;
        }
      }
      
      if (rowIdx === -1) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Lead row not found in sheet" })).setMimeType(ContentService.MimeType.JSON);
      }
      
      sheet.getRange(rowIdx, statusCol + 1).setValue(json.leadStatus || json.status || "New");
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Lead status updated" })).setMimeType(ContentService.MimeType.JSON);
    }

    // Action 4: Update Booking Status Row (Dynamic Header Lookup)
    if (action === "update_booking") {
      var sheet = getAndEnsureSheet(spreadsheet, "CNM Session Bookings");
      var dataRange = sheet.getDataRange();
      var values = dataRange.getValues();
      var headers = values[0];
      
      var bookingIdCol = headers.indexOf("Booking ID");
      var whatsappStatusCol = headers.indexOf("WhatsApp Status");
      
      if (bookingIdCol === -1 || whatsappStatusCol === -1) {
        return ContentService.createTextOutput(JSON.stringify({ 
          status: "success", 
          message: "Booking status update bypassed (no matching columns)" 
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      var rowIdx = -1;
      for (var i = 1; i < values.length; i++) {
        if (values[i][bookingIdCol] === json.bookingId) {
          rowIdx = i + 1;
          break;
        }
      }
      
      if (rowIdx === -1) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Booking row not found" })).setMimeType(ContentService.MimeType.JSON);
      }
      
      if (json.whatsappStatus) {
        sheet.getRange(rowIdx, whatsappStatusCol + 1).setValue(json.whatsappStatus);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Booking status updated" })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Unsupported action routing parameter: " + action
    }))
    .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
  }
}
