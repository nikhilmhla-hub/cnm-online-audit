import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CNM Kiosk Audit",
  description: "Touch-friendly iPad kiosk auditing tool with scoring metrics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-screen bg-background text-foreground flex flex-col selection:bg-gold selection:text-black">
        {/* Minimal Header */}
        <header className="border-b border-border bg-[#0B0B0B]/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              {/* Brand Logo / Mark */}
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-gold to-[#B38F1E] flex items-center justify-center font-bold text-black text-lg shadow-lg shadow-gold/10 group-hover:scale-105 transition-transform duration-300">
                C
              </div>
              <div className="flex flex-col">
                <span className="font-bold tracking-wider text-white text-lg font-sans">
                  CNM <span className="text-gold">KIOSK</span> AUDIT
                </span>
                <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">
                  Operational Excellence
                </span>
              </div>
            </Link>

            {/* Quick Status / Environment Indicator for Kiosk */}
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
                Kiosk Mode Active
              </span>
            </div>
          </div>
        </header>

        {/* Centered Main Content Area */}
        <main className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 w-full max-w-6xl mx-auto">
          {children}
        </main>

        {/* Minimal Footer */}
        <footer className="border-t border-border/40 py-6 text-center text-xs text-zinc-600 font-mono">
          CNM Student OS © {new Date().getFullYear()} • Kiosk System Foundation
        </footer>
      </body>
    </html>
  );
}
