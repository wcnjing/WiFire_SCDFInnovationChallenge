import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", weight: ["400","500","600","700"] });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", weight: ["400","500"] });

export const metadata: Metadata = {
  title: "RZTB Mapper — Coverage Intelligence Platform",
  description: "Emergency response coverage analysis and operational intelligence for SCDF.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased bg-surface-50 text-slate-800">{children}</body>
    </html>
  );
}
