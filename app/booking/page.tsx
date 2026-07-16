"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { Calendar, Award, Sparkles, Clock, ArrowLeft, ShieldCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StudentSession } from "@/lib/scoring/engine";
import { cn } from "@/lib/utils";

export default function BookingPage() {
  const router = useRouter();
  const [session, setSession] = React.useState<StudentSession | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [calendlyReady, setCalendlyReady] = React.useState(false);

  React.useEffect(() => {
    // Read session from local storage
    const savedSessionStr = localStorage.getItem("cnm_kiosk_audit_session");
    if (!savedSessionStr) {
      router.replace("/");
      return;
    }

    try {
      const parsed: StudentSession = JSON.parse(savedSessionStr);
      setSession(parsed);
    } catch {
      router.replace("/");
    }
  }, [router]);

  // Setup Calendly event listener
  React.useEffect(() => {
    const handleCalendlyMessage = async (e: MessageEvent) => {
      // Official Calendly scheduling event listener
      if (e.data.event && e.data.event === "calendly.event_scheduled") {
        console.log("[Calendly Event]: Booking scheduled successfully!");
        if (!session) return;

        setIsSubmitting(true);
        try {
          const bookingId = `BK-${Date.now()}-${session.student.phone.trim()}`;
          const payload = {
            bookingId,
            submissionId: session.submissionId,
            queueNumber: session.queueNumber || "#000",
            name: session.student.name,
            phone: session.student.phone,
            class: session.student.class,
            exam: session.student.exam,
            overallScore: session.overallScore,
            archetype: session.archetype,
            primaryBottleneck: session.primaryBottleneck ? session.primaryBottleneck.category : "None",
            potentialGain: session.potentialImprovement.gain,
            bookingStatus: "Waiting",
            source: "Social Media"
          };

          const response = await fetch("/api/bookings", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            const result = await response.json();
            if (result.status === "success") {
              const updatedSession: StudentSession = {
                ...session,
                sessionStatus: "Booked",
                bookingId: bookingId
              };
              localStorage.setItem("cnm_kiosk_audit_session", JSON.stringify(updatedSession));
            }
          }
        } catch (error) {
          console.error("[Booking Registration Failure]:", error);
        } finally {
          setIsSubmitting(false);
          router.push("/thank-you");
        }
      }
    };

    window.addEventListener("message", handleCalendlyMessage);
    return () => {
      window.removeEventListener("message", handleCalendlyMessage);
    };
  }, [session, router]);

  const handleOpenCalendly = () => {
    if (!session) return;

    const baseCalendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL || "https://calendly.com/nikhilmhla/topper-blueprint-session?month=2026-07";
    // Append prefill information via URL query parameters
    const separator = baseCalendlyUrl.includes("?") ? "&" : "?";
    const prefillUrl = `${baseCalendlyUrl}${separator}name=${encodeURIComponent(session.student.name)}&phone=${encodeURIComponent(session.student.phone)}`;

    if (typeof window !== "undefined" && (window as any).Calendly) {
      (window as any).Calendly.initPopupWidget({
        url: prefillUrl,
        prefill: {
          name: session.student.name,
          phone: session.student.phone
        }
      });
    } else {
      // Fallback: Open in new tab if script not fully loaded
      window.open(prefillUrl, "_blank");
    }
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl py-8 space-y-8 animate-fade-in">
      {/* Calendly assets */}
      <link href="https://assets.calendly.com/assets/external/widget.css" rel="stylesheet" />
      <Script 
        src="https://assets.calendly.com/assets/external/widget.js" 
        strategy="afterInteractive" 
        onLoad={() => setCalendlyReady(true)}
      />

      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/report")}
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors py-2 px-4 rounded-lg bg-card/60 border border-border/40 hover:border-border cursor-pointer font-sans"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Report
        </button>
        <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest bg-zinc-900 px-3 py-1.5 rounded-full border border-border/30">
          Final Step
        </span>
      </div>

      <Card variant="glass" className="relative p-8 overflow-hidden shadow-2xl space-y-8">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-gold to-transparent" />

        <CardHeader className="text-center space-y-3 pb-2">
          <div className="mx-auto h-14 w-14 rounded-full bg-gold/10 border border-gold/25 flex items-center justify-center text-gold relative">
            <Calendar className="h-7 w-7" />
            <div className="absolute inset-[-4px] rounded-full border border-dashed border-gold/20 animate-spin" style={{ animationDuration: '20s' }} />
          </div>
          <div>
            <CardTitle className="text-3xl md:text-4xl font-extrabold font-sans text-white tracking-tight">
              Schedule Your Strategy Session
            </CardTitle>
            <CardDescription className="mt-2 text-zinc-400 font-light max-w-lg mx-auto">
              Meet with a CNM Mentor and discover exactly what is holding back your performance.
            </CardDescription>
          </div>
        </CardHeader>

        {/* User diagnostic card summary */}
        <CardContent className="bg-zinc-950/40 border border-border/80 rounded-2xl p-8 space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-border/40">
            <div>
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Student Name</span>
              <span className="text-white font-extrabold text-lg">{session.student.name}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Diagnostic Score</span>
              <span className="text-gold font-mono font-black text-xl">{session.overallScore}%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-card border border-border/40 rounded-xl">
              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">Student Type</span>
              <span className="text-white font-bold text-xs truncate block mt-0.5">{session.archetype}</span>
            </div>
            <div className="p-3 bg-card border border-border/40 rounded-xl">
              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">Main Challenge</span>
              <span className={cn(
                "font-bold text-xs block mt-0.5",
                session.primaryBottleneck && session.primaryBottleneck.category !== "None" ? "text-red-400" : "text-emerald-400"
              )}>
                {session.primaryBottleneck ? session.primaryBottleneck.category : "None"}
              </span>
            </div>
          </div>

          {session.potentialImprovement.gain > 0 && (
            <div className="flex items-center gap-3 p-4 bg-emerald-500/[0.03] border border-emerald-500/20 rounded-xl">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-wider block">Potential Score Gain</span>
                <span className="text-white font-extrabold text-sm">+{session.potentialImprovement.gain} Marks Improvement Potential</span>
              </div>
            </div>
          )}

          {/* Premium Copy Details */}
          <div className="pt-6 border-t border-border/40 space-y-4 text-left">
            <p className="text-zinc-200 text-sm font-semibold tracking-wide">
              In this personalized strategy session, you will receive clarity on:
            </p>
            <ul className="space-y-3 text-zinc-400 text-xs font-light">
              <li className="flex items-start gap-2.5">
                <span className="text-gold font-bold font-mono">✓</span>
                <span>Your biggest score bottleneck</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-gold font-bold font-mono">✓</span>
                <span>The mistakes slowing down your improvement</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-gold font-bold font-mono">✓</span>
                <span>Which subjects deserve the most attention right now</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-gold font-bold font-mono">✓</span>
                <span>A personalized roadmap to improve your marks</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-gold font-bold font-mono">✓</span>
                <span>The fastest path to better consistency and confidence</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-gold font-bold font-mono">✓</span>
                <span>What top-performing students do differently</span>
              </li>
            </ul>
          </div>

          {/* Session Information Grid */}
          <div className="pt-6 border-t border-border/40 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-zinc-900/50 border border-border/40 rounded-xl">
              <span className="text-[14px] block mb-0.5">🎯</span>
              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">Availability</span>
              <span className="text-white font-bold text-xs">Limited Slots</span>
            </div>
            <div className="p-3 bg-zinc-900/50 border border-border/40 rounded-xl">
              <span className="text-[14px] block mb-0.5">⏱</span>
              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">Duration</span>
              <span className="text-white font-bold text-xs">20 Minutes</span>
            </div>
            <div className="p-3 bg-zinc-900/50 border border-border/40 rounded-xl">
              <span className="text-[14px] block mb-0.5">💻</span>
              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">Mode</span>
              <span className="text-white font-bold text-xs">Online</span>
            </div>
            <div className="p-3 bg-zinc-900/50 border border-border/40 rounded-xl">
              <span className="text-[14px] block mb-0.5">💰</span>
              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">Cost</span>
              <span className="text-gold font-bold text-xs">Free</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-2 flex flex-col gap-4">
          <Button
            onClick={handleOpenCalendly}
            disabled={isSubmitting}
            variant="primary"
            size="lg"
            className="w-full flex items-center justify-center gap-3 text-base font-bold uppercase tracking-wider py-7 rounded-2xl group shadow-2xl shadow-gold/25"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-black border-t-transparent" />
                Recording booking...
              </>
            ) : (
              <>
                <Clock className="h-5 w-5 text-black" />
                Get My Roadmap
              </>
            )}
          </Button>

          <div className="flex items-center justify-center gap-1.5 text-[10px] text-zinc-500 font-mono tracking-wide uppercase">
            <ShieldCheck className="h-4 w-4 text-zinc-600" />
            Official Calendly Scheduler • Secure Connection
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
