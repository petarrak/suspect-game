import type { Metadata } from "next";
import "./globals.css";

import { LanguageProvider } from "@/components/LanguageProvider";
import PageTransition from "@/components/PageTransition";
import GameSessionControls from "@/components/GameSessionControls";
import ReconnectGuard from "@/components/ReconnectGuard";

export const metadata: Metadata = {
  title: "Party Games",
  description:
    "Multiplayer party games for friends.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hr">
      <body className="text-white">
        <LanguageProvider>
          <ReconnectGuard />

          <GameSessionControls />

          <PageTransition>
            {children}
          </PageTransition>
        </LanguageProvider>
      </body>
    </html>
  );
}