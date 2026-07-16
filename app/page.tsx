import Link from "next/link";
import { ClipboardCheck, ArrowRight, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="w-full max-w-2xl py-16 flex flex-col justify-center items-center gap-12 text-center animate-fade-in">
      {/* Hero Section */}
      <div className="space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gold/20 bg-gold/5 text-gold text-xs font-mono tracking-wide uppercase">
          <Activity className="h-3.5 w-3.5" />
          Kiosk Terminal v1.0.0
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white font-sans">
          Student Performance <br />
          <span className="bg-gradient-to-r from-gold via-[#FFE885] to-gold bg-clip-text text-transparent">
            Audit Engine
          </span>
        </h1>
        <p className="text-zinc-400 text-lg md:text-xl max-w-xl mx-auto font-sans font-light leading-relaxed">
          Run the diagnostics wizard to evaluate your student focus, revision frequency, exam practice, test performance, and target mindset.
        </p>
      </div>

      {/* Centered Single CTA Button */}
      <div className="w-full max-w-sm">
        <Link href="/audit" className="block w-full">
          <Button
            variant="primary"
            size="lg"
            className="w-full flex items-center justify-center gap-3 text-base uppercase tracking-wider py-7 rounded-2xl group shadow-2xl shadow-gold/25"
          >
            <ClipboardCheck className="h-5 w-5" />
            START FREE AUDIT
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
          </Button>
        </Link>
      </div>

      {/* Kiosk Mode Notice */}
      <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest mt-8">
        Authorized Personnel Only • Local Kiosk Session
      </div>
    </div>
  );
}
