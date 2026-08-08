"use client";

import Link from "next/link";
import {
  useLanguage,
} from "@/components/LanguageProvider";
import {
  playSound,
} from "@/lib/sounds";

export default function HomePage() {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-10 p-6">

      <div className="text-center">
        <h1 className="text-5xl font-black">
          SUSPECT 🕵️
        </h1>

        <p className="text-white/50 text-lg mt-3">
          {t("tagline")}
        </p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs">

        <Link
          href="/create"
          className="btn-primary block"
          onClick={() =>
            playSound("click")
          }
        >
          {t("createGame")}
        </Link>

        <Link
          href="/join"
          className="btn-secondary block"
          onClick={() =>
            playSound("click")
          }
        >
          {t("joinGame")}
        </Link>

        <Link
          href="/how-to-play"
          className="btn-ghost block border border-white/10 bg-white/[0.03]"
          onClick={() =>
            playSound("click")
          }
        >
          📖 {t("howToPlay")}
        </Link>

      </div>

      <p className="text-white/30 text-sm max-w-xs text-center">
        {t("homeFooter")}
      </p>

    </main>
  );
}