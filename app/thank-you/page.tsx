"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Sparkles, UserCheck, ArrowRight, ShieldCheck, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StudentSession } from "@/lib/scoring/engine";
import { cn } from "@/lib/utils";

export default function ThankYouPage() {
  const router = useRouter();
  const [session, setSession] = React.useState<StudentSession | null>(null);
  const [showLoader, setShowLoader] = React.useState(true);

  React.useEffect(() => {
    // Read session from local storage to show confirmation summary
    const savedSessionStr = localStorage.getItem("cnm_kiosk_audit_session");
    if (!savedSessionStr) {
      router.replace("/");
      return;
    }

    try {
      const parsed: StudentSession = JSON.parse(savedSessionStr);
      setSession(parsed);

      if (typeof window !== "undefined") {
        try {
          (window as any).dataLayer = (window as any).dataLayer || [];
          (window as any).dataLayer.push({
            event: "thank_you_page_view",
            student_class: parsed.student.class,
            exam_focus: parsed.student.exam
          });
        } catch (e) {
          console.error("Analytics failure", e);
        }
      }
    } catch {
      router.replace("/");
    }
  }, [router]);

  React.useEffect(() => {
    // 2-3 seconds fullscreen loader duration
    const loaderTimer = setTimeout(() => {
      setShowLoader(false);
    }, 2500);

    return () => clearTimeout(loaderTimer);
  }, []);

  const handleDone = () => {
    // Clear the active audit session from storage to prepare terminal for the next run
    localStorage.removeItem("cnm_kiosk_audit_session");
    router.replace("/");
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  if (showLoader) {
    return (
      <div className="fixed inset-0 bg-[#0B0B0B] z-50 flex flex-col justify-center items-center gap-6 animate-fade-in">
        <div className="relative flex items-center justify-center">
          <div className="h-16 w-16 rounded-full border-4 border-gold/10 border-t-gold animate-spin" />
          <div className="absolute h-10 w-10 rounded-full bg-gold/5 animate-pulse" />
        </div>
        <p className="text-zinc-300 text-lg font-mono font-medium tracking-wide animate-pulse">
          Generating Your Session Confirmation...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl py-12 flex flex-col items-center justify-center min-h-[80vh] space-y-8 animate-fade-in text-center">
      
      {/* Visual Success Accent Card */}
      <Card variant="glass" className="relative p-8 w-full overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent animate-pulse" />
        
        <CardContent className="space-y-8 pt-4">
          
          {/* Main Success Icon */}
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 relative">
              <CheckCircle2 className="h-9 w-9" />
              <div className="absolute inset-[-4px] rounded-full border border-dashed border-emerald-500/10 animate-spin" style={{ animationDuration: '12s' }} />
            </div>
          </div>

          {/* Heading Section */}
          <div className="space-y-3">
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight font-sans">
              Thank You For Scheduling Your Session
            </h1>
            <div className="space-y-2 text-zinc-400 text-sm font-light leading-relaxed max-w-md mx-auto">
              <p>
                A senior CNM mentor will be available for your demo at the scheduled time.
              </p>
              <p>
                Please join the session on time and keep your audit report ready for discussion.
              </p>
            </div>
          </div>

          {/* Large Lead summary display */}
          <div className="bg-zinc-950/60 p-6 rounded-2xl border border-border/80 text-left space-y-4">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block border-b border-border/40 pb-2">
              Registration Summary
            </span>
            <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-xs">
              <div>
                <span className="text-zinc-500 block">Student:</span>
                <span className="text-white font-bold">{session.student.name}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Phone:</span>
                <span className="text-white font-mono">{session.student.phone}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Target Exam:</span>
                <span className="text-white font-bold">{session.student.class} • {session.student.exam}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Score:</span>
                <span className="text-gold font-bold font-mono">{session.overallScore}% ({session.archetype})</span>
              </div>
            </div>
          </div>

          {/* CTA done button to clean session */}
          <div className="pt-4 border-t border-border/40">
            <Button
              onClick={handleDone}
              variant="primary"
              size="lg"
              className="w-full py-4 uppercase font-bold text-sm tracking-wider min-h-[56px] rounded-xl flex items-center justify-center gap-2 group"
            >
              Done
              <Sparkles className="h-4 w-4 text-gold group-hover:scale-125 transition-transform" />
            </Button>
          </div>

        </CardContent>
      </Card>
      
    </div>
  );
}
