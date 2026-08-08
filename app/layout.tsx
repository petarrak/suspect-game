import type {
  Metadata,
  Viewport,
} from "next";

import "./globals.css";

import {
  LanguageProvider,
} from "@/components/LanguageProvider";

export const metadata: Metadata = {
  title: "SUSPECT 🕵️",
  description: "Everyone has a secret.",
  applicationName: "SUSPECT",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SUSPECT",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0b0b12",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className="h-full"
    >
      <body className="h-full min-h-screen bg-bg text-white antialiased overflow-x-hidden">
        <LanguageProvider>
          <div className="app-shell mx-auto max-w-md min-h-[100dvh] relative">
            {children}
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}