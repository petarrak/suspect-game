"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useLanguage } from "@/components/LanguageProvider";

const games = [
  {
    name: "SUSPECT",
    emoji: "🕵️",
    hr: "Svatko ima tajnu. Otkrij sumnjivca.",
    en: "Everyone has a secret. Find the suspect.",
    href: "/suspect",
    ready: true,
  },
  {
    name: "LIAR",
    emoji: "🤥",
    hr: "Jedan igrač ne zna tajnu riječ.",
    en: "One player doesn't know the secret word.",
    href: "/liar",
    ready: true,
  },
  {
    name: "MAFIA",
    emoji: "🎭",
    hr: "Pronađi mafiju prije nego bude prekasno.",
    en: "Find the Mafia before it's too late.",
    href: "/mafia",
    ready: true,
  },
  {
    name: "WHO WOULD?",
    emoji: "😂",
    hr: "Glasaj koji prijatelj najbolje odgovara pitanju.",
    en: "Vote for the friend who best fits the question.",
    href: "/who-would",
    ready: false,
  },
] as const;

export default function PartyGamesHomePage() {
  const { language } = useLanguage();

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-6 p-6">
      <motion.header
        className="text-center pt-8 pb-2"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-5xl">🎉</div>

        <p className="mt-3 text-xs font-black uppercase tracking-[0.35em] text-accent">
          PARTY GAMES
        </p>

        <h1 className="mt-3 text-5xl font-black">
          {language === "hr" ? "Odaberi igru" : "Choose a game"}
        </h1>

        <p className="mt-3 text-white/45">
          {language === "hr"
            ? "Sve tvoje party igre na jednom mjestu."
            : "All your party games in one place."}
        </p>
      </motion.header>

      <section className="flex flex-col gap-4">
        {games.map((game, index) => {
          const card = (
            <motion.div
              key={game.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              whileTap={game.ready ? { scale: 0.98 } : {}}
              className={`rounded-3xl border p-5 transition ${
                game.ready
                  ? "border-accent/40 bg-accent/10 shadow-xl shadow-accent/10 hover:border-accent"
                  : "border-white/10 bg-panel2/80 opacity-80"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-4xl">
                  {game.emoji}
                </div>

                <div className="flex-1">
                  <h2 className="text-2xl font-black">
                    {game.name}
                  </h2>

                  <p className="mt-1 text-sm text-white/50">
                    {language === "hr" ? game.hr : game.en}
                  </p>
                </div>

                <div
                  className={`text-xs font-black uppercase ${
                    game.ready
                      ? "text-accent"
                      : "text-white/35"
                  }`}
                >
                  {game.ready
                    ? language === "hr"
                      ? "IGRAJ"
                      : "PLAY"
                    : language === "hr"
                    ? "USKORO"
                    : "SOON"}
                </div>
              </div>
            </motion.div>
          );

          return game.ready ? (
            <Link key={game.name} href={game.href}>
              {card}
            </Link>
          ) : (
            <div key={game.name}>{card}</div>
          );
        })}
      </section>

      <p className="mt-auto text-center text-xs text-white/25">
        {language === "hr"
          ? "Suspect, Liar i Mafia su dostupni."
          : "Suspect, Liar and Mafia are available."}
      </p>
    </main>
  );
}