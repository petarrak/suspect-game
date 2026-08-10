"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { playSound } from "@/lib/sounds";

export default function SuspectHomePage() {
  const router = useRouter();
  const { language, t } = useLanguage();

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-7 p-6">
      <button
        type="button"
        onClick={() => {
          playSound("click");
          router.push("/");
        }}
        className="text-white/40 text-sm self-start"
      >
        ← {t("back")}
      </button>

      <motion.div
        className="text-center pt-4"
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-6xl">🕵️</div>
        <h1 className="mt-3 text-4xl font-black">SUSPECT</h1>
        <p className="mt-2 text-white/45">
          {language === "hr" ? "Svatko ima tajnu." : "Everyone has a secret."}
        </p>
      </motion.div>

      <section className="rounded-3xl border border-accent/25 bg-accent/10 p-5">
        <p className="text-sm leading-relaxed text-white/65">
          {language === "hr"
            ? "Jedan igrač dobiva drugačije pitanje. Pričajte, slušajte odgovore i otkrijte tko je sumnjivac."
            : "One player gets a different question. Talk, listen to the answers, and figure out who the suspect is."}
        </p>
      </section>

      <div className="flex flex-col gap-3">
        <Link href="/create">
          <div className="rounded-2xl bg-accent px-6 py-4 text-center font-black text-white shadow-lg shadow-accent/25">
            🎮 {language === "hr" ? "KREIRAJ IGRU" : "CREATE GAME"}
          </div>
        </Link>

        <Link href="/join">
          <div className="rounded-2xl border border-white/10 bg-panel2 px-6 py-4 text-center font-black text-white">
            🚪 {language === "hr" ? "PRIDRUŽI SE" : "JOIN GAME"}
          </div>
        </Link>

        <Link href="/how-to-play">
          <div className="rounded-2xl border border-white/10 bg-black/20 px-6 py-4 text-center font-bold text-white/60">
            ❓ {language === "hr" ? "KAKO IGRATI" : "HOW TO PLAY"}
          </div>
        </Link>
      </div>

      <p className="mt-auto pb-3 text-center text-xs text-white/25">
        PARTY GAMES • SUSPECT
      </p>
    </main>
  );
}