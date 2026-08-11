"use client";

import Link from "next/link";
import { motion } from "motion/react";

import { useLanguage } from "@/components/LanguageProvider";

export default function DrawGuessLandingPage() {
  const { language } = useLanguage();

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-7 p-6">
      <Link
        href="/"
        className="text-sm text-white/45 transition hover:text-white"
      >
        ← {language === "hr" ? "Natrag" : "Back"}
      </Link>

      <motion.header
        className="mt-8 text-center"
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.div
          className="text-7xl"
          initial={{ scale: 0.75, rotate: -12 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 180 }}
        >
          🎨
        </motion.div>

        <h1 className="mt-4 text-4xl font-black">
          DRAW &amp; GUESS
        </h1>

        <p className="mt-3 text-white/45">
          {language === "hr"
            ? "Crtaj riječ dok je tvoji prijatelji pokušavaju pogoditi."
            : "Draw a word while your friends try to guess it."}
        </p>
      </motion.header>

      <motion.section
        className="rounded-3xl border border-accent/30 bg-accent/10 p-6 text-white/75"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
      >
        <p className="leading-7">
          {language === "hr"
            ? "Jedan igrač crta tajnu riječ, a ostali pogađaju. Što brže pogodiš, osvajaš više bodova!"
            : "One player draws a secret word while everyone else guesses. The faster you guess, the more points you earn!"}
        </p>
      </motion.section>

      <motion.div
        className="flex flex-col gap-3"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Link
          href="/draw-guess/create"
          className="rounded-2xl bg-accent px-6 py-5 text-center font-black shadow-lg shadow-accent/20 transition active:scale-[0.98]"
        >
          🎮 {language === "hr" ? "KREIRAJ IGRU" : "CREATE GAME"}
        </Link>

        <Link
          href="/draw-guess/join"
          className="rounded-2xl border border-white/10 bg-panel2 px-6 py-5 text-center font-black transition active:scale-[0.98]"
        >
          🚪 {language === "hr" ? "PRIDRUŽI SE" : "JOIN GAME"}
        </Link>
      </motion.div>
    </main>
  );
}