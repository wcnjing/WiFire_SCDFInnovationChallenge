import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "mapbox-gl/dist/mapbox-gl.css";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", weight: ["400", "500", "600", "700"] });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "RZTB Mapper - Coverage Intelligence Platform",
  description: "Emergency response coverage analysis and operational intelligence for SCDF.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-surface-50 font-sans antialiased text-slate-800">{children}</body>
    </html>
  );
}
