"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, RefreshCw, Target, BookOpen, Clock, Activity, MessageSquare, ShieldAlert, Award, TrendingUp, AlertTriangle } from "lucide-react";
import { ScoreBadge, getGradeDetails } from "@/components/ui/score-badge";
import { cn } from "@/lib/utils";
import { StudentSession } from "@/lib/scoring/engine";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loadJsPDF = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Window is not defined"));
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).jspdf) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resolve((window as any).jspdf);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    script.onload = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resolve((window as any).jspdf);
    };
    script.onerror = () => {
      reject(new Error("Failed to load PDF generation library from CDN"));
    };
    document.body.appendChild(script);
  });
};

export default function ReportPage() {
  const router = useRouter();

  const [session, setSession] = React.useState<StudentSession | null>(null);
  const [conductedDate, setConductedDate] = React.useState("");
  const [isBooking, setIsBooking] = React.useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = React.useState(false);

  const submitLeadToSheet = async (sessionData: StudentSession, submittedIds: string[]) => {
    try {
      const { grade } = getGradeDetails(sessionData.overallScore);
      const payload = {
        submissionId: sessionData.submissionId,
        source: "Gopalpura Kiosk",
        name: sessionData.student.name,
        phone: sessionData.student.phone,
        class: sessionData.student.class,
        exam: sessionData.student.exam,
        overallScore: sessionData.overallScore,
        tier: grade,
        archetype: sessionData.archetype,
        primaryBottleneck: sessionData.primaryBottleneck ? sessionData.primaryBottleneck.category : "None",
        potentialScore: sessionData.potentialImprovement.potentialScore,
        potentialGain: sessionData.potentialImprovement.gain,
        focus: sessionData.metrics["Focus"] ?? 0,
        revision: sessionData.metrics["Revision"] ?? 0,
        accuracy: sessionData.metrics["Accuracy"] ?? 0,
        timeManagement: sessionData.metrics["Time Management"] ?? 0,
        confidence: sessionData.metrics["Confidence"] ?? 0,
        status: "Audit Completed",
        leadSaved: "Yes",
        answersJson: JSON.stringify(sessionData.answers)
      };

      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMsg = `Server responded with status ${response.status}`;
        try {
          const errData = await response.json();
          if (errData && errData.message) {
            errorMsg = errData.message;
          }
        } catch {
          // Ignore parse errors
        }
        throw new Error(errorMsg);
      }

      const result = await response.json();
      if (result.status === "success" && result.queueNumber) {
        submittedIds.push(sessionData.submissionId);
        localStorage.setItem("cnm_kiosk_submitted_ids", JSON.stringify(submittedIds));
        
        const updatedSession = {
          ...sessionData,
          queueNumber: result.queueNumber
        };
        setSession(updatedSession);
        localStorage.setItem("cnm_kiosk_audit_session", JSON.stringify(updatedSession));
        
        console.log("[Sheets Storage Success]: Lead registered. Queue number saved:", result.queueNumber);
      } else {
        console.warn("[Sheets Storage Warning]: Proxy succeeded, but Sheets/Database reported status:", result);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("[Sheets Storage Failure]: Failed to register lead to Google Sheets:", errorMsg);
    }
  };

  const handleBookSession = async () => {
    if (!session || isBooking || session.sessionStatus === "Booked") return;

    if (!session.queueNumber) {
      alert("Lead queue registration is still processing. Please wait 2 seconds and try again.");
      return;
    }

    setIsBooking(true);

    try {
      const bookingId = `BK-${Date.now()}-${session.student.phone.trim()}`;

      const payload = {
        bookingId,
        submissionId: session.submissionId,
        queueNumber: session.queueNumber,
        name: session.student.name,
        phone: session.student.phone,
        class: session.student.class,
        exam: session.student.exam,
        overallScore: session.overallScore,
        archetype: session.archetype,
        primaryBottleneck: session.primaryBottleneck ? session.primaryBottleneck.category : "None",
        potentialGain: session.potentialImprovement.gain,
        bookingStatus: "Waiting",
        source: "Gopalpura Kiosk"
      };

      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMsg = `Server responded with status ${response.status}`;
        try {
          const errData = await response.json();
          if (errData && errData.message) {
            errorMsg = errData.message;
          }
        } catch {
          // Ignore parse errors
        }
        throw new Error(errorMsg);
      }

      const result = await response.json();

      if (result.status === "success") {
        const updatedSession: StudentSession = {
          ...session,
          sessionStatus: "Booked",
          bookingId: bookingId
        };
        localStorage.setItem("cnm_kiosk_audit_session", JSON.stringify(updatedSession));
        setSession(updatedSession);
        router.push("/confirm");
      } else {
        throw new Error(result.message || "Failed to finalize session booking");
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("[Session Booking Failure]:", errorMsg);
      alert(`Booking Failed: ${errorMsg}`);
    } finally {
      setIsBooking(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!session || isGeneratingPDF) return;
    setIsGeneratingPDF(true);
    
    try {
      const jspdfModule = await loadJsPDF();
      const { jsPDF } = jspdfModule;
      
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });
      
      const margin = 15;
      const pageWidth = 210;
      
      // 1. Header Banner
      doc.setFillColor(18, 18, 18);
      doc.rect(0, 0, pageWidth, 45, "F");
      
      doc.setTextColor(212, 175, 55); // Gold
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("CNM SYSTEM LABS", margin, 18);
      
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("STUDENT DIAGNOSTIC PERFORMANCE REPORT", margin, 26);
      
      const genDate = new Date(session.completedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
      doc.setTextColor(140, 140, 140);
      doc.setFontSize(8.5);
      doc.text(`Generated On: ${genDate}  |  Kiosk Source: Gopalpura Kiosk`, margin, 34);
      
      // 2. Student Info Card
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.2);
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, 52, pageWidth - 2 * margin, 25, "F");
      doc.rect(margin, 52, pageWidth - 2 * margin, 25, "S");
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(60, 60, 60);
      doc.text("Student Name:", margin + 5, 59);
      doc.text("Academic Class:", margin + 5, 66);
      doc.text("Target Exam:", margin + 5, 73);
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(20, 20, 20);
      doc.text(session.student.name, margin + 45, 59);
      doc.text(session.student.class, margin + 45, 66);
      doc.text(session.student.exam, margin + 45, 73);
      
      // 3. Diagnostics Summary
      const { grade: overallGrade } = getGradeDetails(session.overallScore);
      doc.setDrawColor(212, 175, 55); // Gold
      doc.setFillColor(255, 253, 245);
      doc.rect(margin, 84, pageWidth - 2 * margin, 28, "F");
      doc.rect(margin, 84, pageWidth - 2 * margin, 28, "S");
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(18, 18, 18);
      doc.text("Academic Diagnostics Summary", margin + 5, 91);
      
      doc.setFontSize(9.5);
      doc.text(`Overall Score: ${session.overallScore}% (${overallGrade})`, margin + 5, 99);
      doc.text(`Student Type: ${session.archetype}`, margin + 5, 106);
      doc.text(`Main Problem: ${session.primaryBottleneck ? session.primaryBottleneck.category : "None"}`, margin + 95, 99);
      
      // 4. Performance Indexes Table
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, 119, pageWidth - 2 * margin, 8, "F");
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(65, 65, 65);
      doc.text("Diagnostic Index Category", margin + 5, 124.5);
      doc.text("Score (%)", margin + 95, 124.5);
      doc.text("Rating Status", margin + 135, 124.5);
      
      let yOffset = 134;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(40, 40, 40);
      
      Object.entries(session.metrics).forEach(([catName, catScore]) => {
        doc.text(catName, margin + 5, yOffset);
        doc.text(`${catScore}%`, margin + 95, yOffset);
        doc.text(getGradeDetails(catScore).grade, margin + 135, yOffset);
        
        doc.setDrawColor(240, 240, 240);
        doc.line(margin, yOffset + 3, pageWidth - margin, yOffset + 3);
        
        yOffset += 8.5;
      });
      
      // 5. Potential Improvement Box
      doc.setDrawColor(59, 130, 246); // Blue
      doc.setFillColor(245, 249, 255);
      doc.rect(margin, yOffset + 5, pageWidth - 2 * margin, 24, "F");
      doc.rect(margin, yOffset + 5, pageWidth - 2 * margin, 24, "S");
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(30, 64, 175);
      doc.text("Preparation Strategy Roadmap Outlook", margin + 5, yOffset + 11);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(30, 30, 30);
      const outputText = session.potentialImprovement.gain > 0 
        ? `Addressing main problems can raise overall metrics from ${session.potentialImprovement.currentScore} to ${session.potentialImprovement.potentialScore} (a gain of +${session.potentialImprovement.gain} Marks).`
        : `Performance benchmarks verified at ${session.potentialImprovement.currentScore}. Continue focus to secure high ranks.`;
      doc.text(outputText, margin + 5, yOffset + 18);
      
      // 6. Desk booking footer
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, 258, pageWidth - 2 * margin, 20, "F");
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 100, 100);
      doc.text("📍 SESSION LOCATION: CNM SYSTEM LABS, 2nd FLOOR DESK", margin + 5, 265);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`Present this report or Booking ID (${session.bookingId || "N/A"}) at desk. Queue Number: ${session.queueNumber || "N/A"}`, margin + 5, 272);
      
      doc.save(`CNM-Diagnostic-Report-${session.student.name.replace(/\s+/g, "_")}.pdf`);
      console.log("[PDF Download Success]: Branded PDF generated.");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("[PDF Download Error]: Failed to create PDF report:", errorMsg);
      alert("Failed to compile PDF report: CDN connection error.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  React.useEffect(() => {
    const savedSessionStr = localStorage.getItem("cnm_kiosk_audit_session");

    if (!savedSessionStr) {
      router.replace("/");
      return;
    }

    try {
      const parsedSession: StudentSession = JSON.parse(savedSessionStr);
      
      if (!parsedSession.student || parsedSession.overallScore === undefined) {
        router.replace("/");
        return;
      }

      setSession(parsedSession);

      const submittedIdsStr = localStorage.getItem("cnm_kiosk_submitted_ids") || "[]";
      let submittedIds: string[] = [];
      try {
        submittedIds = JSON.parse(submittedIdsStr);
      } catch {
        submittedIds = [];
      }

      if (!submittedIds.includes(parsedSession.submissionId)) {
        submitLeadToSheet(parsedSession, submittedIds);
      }

    } catch (e) {
      console.error("Failed to parse session info", e);
      router.replace("/");
      return;
    }

    const today = new Date();
    const formatted = today.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    setConductedDate(formatted);
  }, [router]);

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-zinc-500 font-mono text-sm animate-pulse">
          Loading report session...
        </div>
      </div>
    );
  }

  const { overallScore, student, metrics, primaryBottleneck, topBottlenecks, archetype, potentialImprovement, personalizedInsight } = session;
  const { grade } = getGradeDetails(overallScore);

  const getCategoryColorClass = (catScore: number) => {
    if (catScore >= 75) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (catScore >= 60) return "text-gold bg-gold/10 border-gold/20";
    if (catScore >= 40) return "text-amber-500 bg-amber-500/10 border-amber-500/20";
    return "text-red-400 bg-red-500/10 border-red-500/20";
  };

  const getCategoryGradeName = (catScore: number) => {
    return getGradeDetails(catScore).grade;
  };

  return (
    <div className="w-full max-w-4xl py-6 space-y-8 animate-fade-in font-sans">
      {/* Top Action Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors py-2 px-4 rounded-lg bg-card/60 border border-border/40 hover:border-border"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Terminal
        </Link>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            className="inline-flex items-center gap-2 text-sm text-gold hover:text-gold-hover transition-colors py-2 px-4 rounded-lg bg-gold/5 border border-gold/20 hover:border-gold/40 cursor-pointer min-h-[40px] disabled:opacity-50"
          >
            {isGeneratingPDF ? "Generating PDF..." : "Download Report PDF"}
          </button>
          
          <button className="inline-flex items-center gap-2 text-sm text-gold hover:text-gold-hover transition-colors py-2 px-4 rounded-lg bg-gold/5 border border-gold/20 hover:border-gold/40 cursor-pointer min-h-[40px]">
            <RefreshCw className="h-4 w-4" />
            Synchronize Data
          </button>
        </div>
      </div>

      {/* Main Scoring & Performance Card */}
      <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          {/* Overall Score Badge */}
          <div className="flex flex-col items-center justify-center space-y-4 py-6 border-b md:border-b-0 md:border-r border-border/60">
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
              Overall Audit Score
            </span>
            <ScoreBadge score={overallScore} size="lg" className="w-full max-w-[220px]" />
            <span className="text-xs text-zinc-400 font-mono bg-zinc-900 px-3 py-1 rounded-full border border-border/50">
              Current Level: <span className="font-bold text-white">{grade}</span>
            </span>
          </div>

          {/* Results Summary and Demographics */}
          <div className="md:col-span-2 space-y-6">
            <div className="space-y-1">
              <span className="text-xs font-mono text-gold uppercase tracking-wider">Audit Results Summary</span>
              <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                {overallScore >= 75 ? "Academic Benchmarks Stable" : overallScore >= 40 ? "Academic Action Advised" : "Academic Intervention Needed"}
              </h2>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed font-light">
              {overallScore >= 75 
                ? "Your exam preparation satisfies core target thresholds. Gaps are identified in syllabus revision pacing and error logging consistency, but conceptual practice and mindset parameters are verified solid."
                : overallScore >= 40
                ? "Your exam preparation shows moderate stability, but structural gaps in mock testing schedules and syllabus revisions require prompt adjustments to prevent further performance slippage."
                : "Your exam preparation metrics indicate a critical performance status. Immediate support and academic intervention are recommended to address large pending syllabus and test execution anxiety."
              }
            </p>

            {/* Demographics and Calculated Badges Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              <div className="bg-zinc-900/50 p-3 rounded-lg border border-border/40">
                <span className="block text-[9px] text-zinc-500 uppercase tracking-wider font-mono">Conducted On</span>
                <span className="text-xs font-semibold text-white font-mono">{conductedDate}</span>
              </div>
              <div className="bg-zinc-900/50 p-3 rounded-lg border border-border/40">
                <span className="block text-[9px] text-zinc-500 uppercase tracking-wider font-mono">Student</span>
                <span className="text-xs font-semibold text-white font-mono truncate block">
                  {student.name}
                </span>
              </div>
              <div className="bg-zinc-900/50 p-3 rounded-lg border border-border/40">
                <span className="block text-[9px] text-zinc-500 uppercase tracking-wider font-mono">Class & Focus</span>
                <span className="text-xs font-semibold text-white font-mono truncate block">
                  {student.class} • {student.exam}
                </span>
              </div>
              <div className="bg-zinc-900/50 p-3 rounded-lg border border-border/40">
                <span className="block text-[9px] text-zinc-500 uppercase tracking-wider font-mono">Student Type</span>
                <span className="text-xs font-bold text-gold font-mono truncate block">
                  {archetype}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Bottleneck and Dynamic Insight Box */}
      {primaryBottleneck ? (
        <div className="bg-[#141414] border border-border rounded-2xl p-6 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="absolute top-0 bottom-0 left-0 w-[4px] bg-red-500" />
          
          <div className="flex items-start gap-4 flex-1">
            <div className="h-12 w-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0 mt-1">
              <ShieldAlert className="h-6 w-6 animate-pulse" />
            </div>
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-red-400 uppercase tracking-wider">Main Problem Identified</span>
              <h3 className="text-white font-bold text-lg font-sans">
                {primaryBottleneck.category} <span className="text-zinc-500 font-normal">({primaryBottleneck.score}%)</span>
              </h3>
              <p className="text-zinc-300 text-sm font-light leading-relaxed">
                {personalizedInsight}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-3 bg-red-500/5 border border-red-500/20 rounded-xl py-3 px-5 text-center w-full md:w-auto justify-center">
            <div>
              <span className="text-[9px] text-zinc-500 uppercase font-mono block">Issue Impact</span>
              <span className="text-sm font-extrabold text-red-400 font-mono">Critical Low</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#141414] border border-border rounded-2xl p-6 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="absolute top-0 bottom-0 left-0 w-[4px] bg-emerald-500" />
          
          <div className="flex items-start gap-4 flex-1">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-1">
              <Award className="h-6 w-6 animate-pulse" />
            </div>
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">Performance Status</span>
              <h3 className="text-white font-bold text-lg font-sans">
                All core performance systems are strong.
              </h3>
              <p className="text-zinc-300 text-sm font-light leading-relaxed">
                {personalizedInsight}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl py-3 px-5 text-center w-full md:w-auto justify-center">
            <div>
              <span className="text-[9px] text-zinc-500 uppercase font-mono block">Audit Diagnostics</span>
              <span className="text-sm font-extrabold text-emerald-400 font-mono">Optimal</span>
            </div>
          </div>
        </div>
      )}

      {/* Potential Improvement Card */}
      <div className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 bottom-0 left-0 w-[4px] bg-emerald-500" />
        
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">Potential Improvement Profile</span>
            <h3 className="text-white font-bold text-lg font-sans">Unlock Performance Gains</h3>
            <p className="text-zinc-400 text-sm font-light leading-relaxed">
              {potentialImprovement.gain > 0 ? (
                <>
                  Addressing your top three problems can elevate your overall score from <span className="font-semibold text-white">{potentialImprovement.currentScore}</span> to <span className="font-semibold text-gold">{potentialImprovement.potentialScore}</span> (a realistic gain of <span className="font-semibold text-emerald-400">+{potentialImprovement.gain}</span> points).
                </>
              ) : (
                <>
                  Your performance benchmarks are already outstanding at <span className="font-semibold text-gold">{potentialImprovement.currentScore}</span>. Continue with your consistency to secure peak ranks.
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0 bg-zinc-900/60 p-3 rounded-xl border border-border/60 w-full md:w-auto justify-center">
          <div className="text-center px-3">
            <span className="block text-[8px] text-zinc-500 font-mono uppercase">Current</span>
            <span className="text-base font-extrabold text-white font-mono">{potentialImprovement.currentScore}</span>
          </div>
          <div className="text-zinc-600 font-mono text-sm">➔</div>
          <div className="text-center px-3">
            <span className="block text-[8px] text-emerald-400 font-mono uppercase">Potential</span>
            <span className="text-base font-extrabold text-emerald-400 font-mono">{potentialImprovement.potentialScore}</span>
          </div>
        </div>
      </div>

      {/* Top 3 Bottlenecks & Detailed Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Side: Top 3 Bottlenecks card (or Success card if none exist) */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4 md:col-span-1 flex flex-col justify-between">
          <div className="space-y-3">
            {topBottlenecks.length > 0 ? (
              <>
                <div className="flex items-center gap-2 text-red-400">
                  <AlertTriangle className="h-5 w-5" />
                  <h3 className="text-white font-bold text-lg">Top 3 Problems</h3>
                </div>
                <p className="text-zinc-400 text-xs font-light leading-relaxed">
                  These categories present the largest opportunities for score gains once resolved.
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-emerald-400">
                  <Award className="h-5 w-5" />
                  <h3 className="text-white font-bold text-lg">Diagnostics Clear</h3>
                </div>
                <p className="text-zinc-400 text-xs font-light leading-relaxed">
                  All systems verified stable. No active problems detected. Keep up the consistent work!
                </p>
              </>
            )}
          </div>

          {topBottlenecks.length > 0 ? (
            <div className="space-y-2.5 pt-2">
              {topBottlenecks.map((bottleneck, idx) => (
                <div key={bottleneck.category} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-border/80">
                  <div className="flex items-center gap-2.5 text-zinc-300 font-sans text-xs">
                    <span className="text-red-400 font-mono font-bold text-xs">{idx + 1}.</span>
                    <span className="truncate max-w-[130px] font-medium">{bottleneck.category}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-xs text-zinc-400">{bottleneck.score}%</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 font-bold uppercase scale-90">
                      Low
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-center text-xs text-emerald-400 font-mono font-bold uppercase tracking-wider">
              ✓ Stable Performance
            </div>
          )}
        </div>

        {/* Right Side: Detailed category scores */}
        <div className="md:col-span-2 space-y-3">
          <div className="bg-zinc-900/30 p-2 border border-border/20 rounded-xl">
            <span className="text-[10px] uppercase font-mono text-zinc-500 tracking-widest pl-2">Category Performance Index</span>
          </div>

          {Object.entries(metrics).map(([catName, catScore]) => {
            const isRevision = catName === "Revision";
            const isAccuracy = catName === "Accuracy";
            const isTime = catName === "Time Management";
            
            let CatIcon = Target;
            if (isRevision) CatIcon = BookOpen;
            if (isAccuracy) CatIcon = Activity;
            if (isTime) CatIcon = Clock;
            if (catName === "Confidence") CatIcon = MessageSquare;

            const isBottleneck = topBottlenecks.some(b => b.category === catName);
            const isPrimary = primaryBottleneck && primaryBottleneck.category === catName;

            return (
              <div key={catName} className={cn(
                "p-4 rounded-xl border flex items-center justify-between gap-4 transition-all duration-300",
                isPrimary 
                  ? "bg-red-500/[0.02] border-red-500/30 hover:border-red-500/50" 
                  : "bg-card border-border hover:border-gold/30"
              )}>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-9 w-9 rounded-lg flex items-center justify-center",
                    isPrimary 
                      ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                      : "bg-[#1E1E1E] text-zinc-400 border border-border"
                  )}>
                    <CatIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm flex items-center gap-2">
                      {catName}
                      {isPrimary && (
                        <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-red-500/25 border border-red-500/40 text-red-400 uppercase tracking-widest font-extrabold scale-90">
                          Main Problem
                        </span>
                      )}
                      {!isPrimary && isBottleneck && (
                        <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 uppercase tracking-widest font-bold scale-90">
                          Problem
                        </span>
                      )}
                    </h4>
                    <span className="text-zinc-500 text-[10px]">Rating: {getCategoryGradeName(catScore)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 font-mono">
                  <span className={cn("text-xs px-2 py-0.5 rounded border font-semibold", getCategoryColorClass(catScore))}>
                    {catScore}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Phase 2: Study Plan Section */}
      <div className="bg-card border border-border rounded-2xl p-8 relative overflow-hidden shadow-2xl space-y-6">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
        
        <div className="flex flex-col lg:flex-row items-center gap-8">
          {/* Offline Illustration Hero Image */}
          <div className="w-full lg:w-1/3 shrink-0 rounded-xl overflow-hidden border border-border bg-zinc-950/40 relative aspect-video lg:aspect-square">
            <Image 
              src="/offline-kiosk-session.png" 
              alt="Offline Mentor Session Illustration"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 33vw"
              priority
            />
          </div>
          
          {/* Strategy booking information */}
          <div className="flex-1 space-y-4 text-left">
            <div className="space-y-1">
              <span className="text-xs font-mono text-blue-400 uppercase tracking-wider">Step 2: Strategy Roadmap</span>
              <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Unlock Your Custom Study Path</h2>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed font-light">
              Receive a detailed, topic-wise diagnostic study plan tailored specifically to address your main problems. Book your free 1-on-1 counseling session with our senior mentors at CNM System Labs to finalize your preparation roadmap.
            </p>
            
            <div className="pt-2">
              <button
                onClick={handleBookSession}
                disabled={isBooking || session.sessionStatus === "Booked"}
                className={cn(
                  "w-full sm:w-auto px-10 py-4 font-bold text-sm rounded-xl tracking-wide uppercase transition-all duration-300 min-h-[56px] flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_20px_rgba(59,130,246,0.15)]",
                  session.sessionStatus === "Booked"
                    ? "bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white border border-blue-500 hover:border-blue-600 hover:shadow-[0_4px_25px_rgba(59,130,246,0.25)]"
                )}
              >
                {isBooking ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Reserving Strategy Session...
                  </>
                ) : session.sessionStatus === "Booked" ? (
                  <>Session Reserved ✓</>
                ) : (
                  <>Get My Study Plan</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Report Footer / Version Info */}
      <div className="flex justify-between items-center text-[10px] text-zinc-600 font-mono pt-4 border-t border-border/40">
        <span>Operational Audit Engine: v1.0.0</span>
        <span>Diagnostic Session Schema: {session.reportVersion || "legacy"}</span>
      </div>
    </div>
  );
}
