import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/shared/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Resonance | Premium Music Journaling",
  description:
    "Explore the deep meaning of music through AI-powered emotional analysis and personal journaling.",
  openGraph: {
    title: "Resonance | Premium Music Journaling",
    description:
      "Explore the deep meaning of music through AI-powered emotional analysis and personal journaling.",
    type: "website",
    locale: "en_US",
    url: "https://resonance.app",
    siteName: "Resonance",
  },
};

import { Toaster } from "@/components/ui/sonner";
import { GlobalPlayer } from "@/features/player/components/GlobalPlayer";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground font-sans selection:bg-primary/20 pb-24">
        <Providers>
          {children}
          <GlobalPlayer />
        </Providers>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
