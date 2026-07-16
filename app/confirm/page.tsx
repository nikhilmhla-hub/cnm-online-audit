"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, MapPin, Sparkles, UserCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StudentSession } from "@/lib/scoring/engine";

export default function ConfirmationPage() {
  const router = useRouter();
  const [queueNum, setQueueNum] = React.useState("#001");
  const [studentName, setStudentName] = React.useState("");

  React.useEffect(() => {
    // Read current session info to get queue number
    const savedSessionStr = localStorage.getItem("cnm_kiosk_audit_session");
    if (!savedSessionStr) {
      router.replace("/");
      return;
    }

    try {
      const parsed: StudentSession = JSON.parse(savedSessionStr);
      if (parsed.queueNumber) {
        setQueueNum(parsed.queueNumber);
      }
      if (parsed.student && parsed.student.name) {
        setStudentName(parsed.student.name);
      }
    } catch {
      router.replace("/");
    }
  }, [router]);

  const handleDone = () => {
    // Clear the active audit session from storage to prepare kiosk for next student
    localStorage.removeItem("cnm_kiosk_audit_session");
    router.replace("/");
  };

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
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight font-sans">
              🎉 Congratulations!
            </h1>
            <p className="text-zinc-400 text-sm font-light leading-relaxed">
              Your Free Study Strategy Session Has Been Reserved.
            </p>
          </div>

          {/* Large Queue Display */}
          <div className="bg-zinc-950/60 p-6 rounded-2xl border border-border/80 space-y-2">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">
              Your Queue Number
            </span>
            <div className="text-5xl md:text-6xl font-black text-gold tracking-wider font-mono animate-pulse">
              {queueNum}
            </div>
            {studentName && (
              <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400 font-mono pt-1">
                <UserCheck className="h-3.5 w-3.5 text-gold/60" />
                {studentName}
              </span>
            )}
          </div>

          {/* Venue & Coordinates */}
          <div className="bg-blue-600/[0.03] border border-blue-500/20 rounded-xl p-5 flex items-center justify-center gap-4 text-left">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <MapPin className="h-5.5 w-5.5" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] font-mono text-blue-400 uppercase tracking-wider block">Session Venue</span>
              <div className="text-white font-extrabold text-sm font-sans tracking-wide">
                📍 CNM SYSTEM LABS
              </div>
              <div className="text-zinc-400 text-xs font-light">
                2nd FLOOR • COUNSELING DESK
              </div>
            </div>
          </div>

          {/* Core instructions */}
          <p className="text-zinc-400 text-xs md:text-sm leading-relaxed font-light">
            A CNM mentor will meet you shortly and help create your personalized study roadmap. Please keep your queue number ready.
          </p>

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
