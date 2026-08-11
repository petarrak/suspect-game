"use client";

import Link from "next/link";
import { motion } from "motion/react";

import Button from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";

export default function BombHomePage() {
  const { language } =
    useLanguage();

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-6 p-6">
      <motion.div
        className="text-center pt-10"
        initial={{
          opacity: 0,
          y: -20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
      >
        <motion.div
          className="text-8xl"
          initial={{
            scale: 0,
            rotate: -15,
          }}
          animate={{
            scale: 1,
            rotate: 0,
          }}
          transition={{
            type: "spring",
            stiffness: 220,
            damping: 12,
          }}
        >
          💣
        </motion.div>

        <p className="mt-5 text-xs font-black uppercase tracking-[0.3em] text-accent">
          BOMB
        </p>

        <h1 className="mt-3 text-4xl font-black">
          {language === "hr"
            ? "DRŽI BOMBU"
            : "HOLD THE BOMB"}
        </h1>

        <p className="mt-4 leading-relaxed text-white/45">
          {language === "hr"
            ? "Upiši točan odgovor, predaj bombu i nadaj se da neće eksplodirati kod tebe."
            : "Type a valid answer, pass the bomb, and hope it doesn't explode on you."}
        </p>
      </motion.div>

      <motion.section
        className="card mt-4 p-5"
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 0.15,
        }}
      >
        <div className="flex flex-col gap-3 text-sm text-white/55">
          <p>
            ❤️{" "}
            {language === "hr"
              ? "Svaki igrač ima 2 života."
              : "Every player has 2 lives."}
          </p>

          <p>
            ⏱️{" "}
            {language === "hr"
              ? "Timer je skriven i nasumičan."
              : "The timer is hidden and random."}
          </p>

          <p>
            ✍️{" "}
            {language === "hr"
              ? "Odgovori se ne smiju ponavljati."
              : "Answers cannot be repeated."}
          </p>

          <p>
            💥{" "}
            {language === "hr"
              ? "Kad bomba eksplodira, gubiš život."
              : "When the bomb explodes, you lose a life."}
          </p>
        </div>
      </motion.section>

      <div className="mt-auto flex flex-col gap-3 pb-4">
        <Link href="/bomb/create">
          <Button>
            💣{" "}
            {language === "hr"
              ? "NAPRAVI SOBU"
              : "CREATE ROOM"}
          </Button>
        </Link>

        <Link href="/bomb/join">
          <Button variant="secondary">
            🚪{" "}
            {language === "hr"
              ? "PRIDRUŽI SE"
              : "JOIN ROOM"}
          </Button>
        </Link>

        <Link href="/">
          <Button variant="ghost">
            🏠 PARTY GAMES
          </Button>
        </Link>
      </div>
    </main>
  );
}