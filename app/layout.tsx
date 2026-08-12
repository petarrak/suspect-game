import type { Metadata, Viewport } from "next";

import "./globals.css";

import { LanguageProvider } from "@/components/LanguageProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import PageTransition from "@/components/PageTransition";
import GameSessionControls from "@/components/GameSessionControls";
import ReconnectGuard from "@/components/ReconnectGuard";

export const metadata: Metadata = {
  title: {
    default: "Party Games",
    template: "%s | Party Games",
  },
  description: "Multiplayer party games for friends.",
  applicationName: "Party Games",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Party Games",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      {
        url: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0b0b0f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-background" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-white antialiased">
        <LanguageProvider>
          <ThemeProvider>
            <ReconnectGuard />
            <GameSessionControls />
            <PageTransition>{children}</PageTransition>
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}