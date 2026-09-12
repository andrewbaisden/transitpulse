import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LiveStatusListener } from "@/components/network/live-status-listener";
import { SiteHeader } from "@/components/network/site-header";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TransitPulse — London Network",
  description:
    "Real-time transport intelligence for London: service status, arrivals, and reliability across the Underground, Elizabeth line, and more.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-muted/30">
        <Providers>
          <LiveStatusListener />
          <SiteHeader />
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
