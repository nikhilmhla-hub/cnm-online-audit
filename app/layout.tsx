import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const hindi = Noto_Sans_Devanagari({
  variable: "--font-noto-devanagari",
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700"],
});
export const metadata: Metadata = {
  title: "Performance Audit | CNM System Labs",
  description:
    "A free 20-question preparation self-review for JEE and NEET. Understand your answers, choose a practical next step and decide whether to contact CNM.",
  robots: { index: false, follow: true },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} ${hindi.variable} dark`}
    >
      <body>
        <a className="audit-skip" href="#main-content">
          Skip to content
        </a>
        <header className="audit-header">
          <a
            href="https://cnm-learning-website.vercel.app/"
            aria-label="CNM System Labs home"
          >
            <span className="audit-logo">CNM</span>
            <span>
              SYSTEM <b>LABS</b>
            </span>
          </a>
          <a href="https://cnm-learning-website.vercel.app/programmes">
            Programmes & fees →
          </a>
        </header>
        <main id="main-content" className="audit-main">
          {children}
        </main>
        <footer className="audit-footer">
          <span>CNM SYSTEM LABS · JEE & NEET</span>
          <nav aria-label="Audit footer">
            <a href="https://cnm-learning-website.vercel.app/contact">
              Contact CNM
            </a>
            <a href="https://cnm-learning-website.vercel.app/privacy-policy">
              Privacy policy
            </a>
            <a href="https://cnm-learning-website.vercel.app/parents">
              For parents
            </a>
          </nav>
        </footer>
      </body>
    </html>
  );
}
