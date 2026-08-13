"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";
import { motion } from "motion/react";

import { useLanguage } from "@/components/LanguageProvider";
import { playSound } from "@/lib/sounds";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;

  userChoice: Promise<{
    outcome:
      | "accepted"
      | "dismissed";
    platform: string;
  }>;
};

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
    ready: true,
  },

  {
    name: "TRUTH OR DARE",
    emoji: "😇/😈",
    hr: "Reci istinu ili prihvati izazov.",
    en: "Tell the truth or take the dare.",
    href: "/truth-or-dare",
    ready: true,
  },

  {
    name: "BOMB",
    emoji: "💣",
    hr: "Odgovori brzo i riješi se bombe prije eksplozije.",
    en: "Answer fast and pass the bomb before it explodes.",
    href: "/bomb",
    ready: true,
  },

  {
    name: "DRAW & GUESS",
    emoji: "🎨",
    hr: "Crtaj riječ dok prijatelji pokušavaju pogoditi.",
    en: "Draw the word while your friends try to guess it.",
    href: "/draw-guess",
    ready: true,
  },

  {
    name: "CHAOS CARDS",
    emoji: "🃏",
    hr: "Izvuci kartu. Slijedi pravilo. Preživi kaos.",
    en: "Draw a card. Follow the rule. Survive the chaos.",
    href: "/chaos-cards",
    ready: true,
  },
] as const;

export default function PartyGamesHomePage() {
  const { language } =
    useLanguage();

  const [
    installPrompt,
    setInstallPrompt,
  ] =
    useState<BeforeInstallPromptEvent | null>(
      null
    );

  const [
    isInstalled,
    setIsInstalled,
  ] = useState(false);

  const [
    installing,
    setInstalling,
  ] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia(
        "(display-mode: standalone)"
      ).matches;

    const navigatorStandalone =
      (
        window.navigator as Navigator & {
          standalone?: boolean;
        }
      ).standalone === true;

    if (
      standalone ||
      navigatorStandalone
    ) {
      setIsInstalled(true);
    }

    function handleBeforeInstallPrompt(
      event: Event
    ) {
      event.preventDefault();

      setInstallPrompt(
        event as BeforeInstallPromptEvent
      );
    }

    function handleAppInstalled() {
      setIsInstalled(true);
      setInstallPrompt(null);
      setInstalling(false);
    }

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt
    );

    window.addEventListener(
      "appinstalled",
      handleAppInstalled
    );

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );

      window.removeEventListener(
        "appinstalled",
        handleAppInstalled
      );
    };
  }, []);

  async function handleInstall() {
    if (
      !installPrompt ||
      installing
    ) {
      return;
    }

    setInstalling(true);

    playSound(
      "click",
      0.55
    );

    try {
      await installPrompt.prompt();

      const choice =
        await installPrompt.userChoice;

      if (
        choice.outcome ===
        "accepted"
      ) {
        setInstallPrompt(null);
      }
    } catch (error) {
      console.error(
        "PWA install failed:",
        error
      );
    } finally {
      setInstalling(false);
    }
  }

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-6 p-6">
      <motion.header
        className="pb-2 pt-8 text-center"
        initial={{
          opacity: 0,
          y: -16,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
      >
        <motion.div
          className="text-5xl"
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
            damping: 13,
          }}
        >
          🎉
        </motion.div>

        <p className="mt-3 text-xs font-black uppercase tracking-[0.35em] text-accent">
          PARTY GAMES
        </p>

        <h1 className="mt-3 text-5xl font-black">
          {language === "hr"
            ? "Odaberi igru"
            : "Choose a game"}
        </h1>

        <p className="mt-3 text-white/45">
          {language === "hr"
            ? "Sve tvoje party igre na jednom mjestu."
            : "All your party games in one place."}
        </p>
      </motion.header>

      {!isInstalled &&
        installPrompt && (
          <motion.button
            type="button"
            onClick={
              handleInstall
            }
            disabled={
              installing
            }
            className="relative overflow-hidden rounded-2xl border border-accent/40 bg-accent/15 px-5 py-4 text-left shadow-xl shadow-accent/10 disabled:opacity-60"
            initial={{
              opacity: 0,
              y: -10,
              scale: 0.97,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            whileHover={{
              scale: 1.015,
            }}
            whileTap={{
              scale: 0.98,
            }}
          >
            <div className="flex items-center gap-4">
              <motion.div
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/20 text-2xl"
                animate={{
                  y: [
                    0,
                    -3,
                    0,
                  ],
                }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                }}
              >
                📲
              </motion.div>

              <div className="min-w-0 flex-1">
                <p className="font-black text-white">
                  {installing
                    ? language === "hr"
                      ? "INSTALIRANJE..."
                      : "INSTALLING..."
                    : language === "hr"
                    ? "INSTALIRAJ PARTY GAMES"
                    : "INSTALL PARTY GAMES"}
                </p>

                <p className="mt-1 text-xs text-white/45">
                  {language === "hr"
                    ? "Dodaj aplikaciju na početni zaslon."
                    : "Add the app to your home screen."}
                </p>
              </div>

              <span className="text-accent">
                ↓
              </span>
            </div>
          </motion.button>
        )}

      <Link href="/premium">
        <motion.div
          className="relative overflow-hidden rounded-3xl border border-yellow-300/35 bg-gradient-to-r from-fuchsia-700/35 via-pink-600/25 to-yellow-500/15 p-5 shadow-xl shadow-fuchsia-500/15"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="absolute -right-4 -top-6 text-8xl opacity-10">👑</div>
          <div className="relative flex items-center gap-4">
            <motion.div
              className="text-5xl"
              animate={{ rotate: [-5, 5, -5], y: [0, -3, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              👑
            </motion.div>
            <div className="min-w-0 flex-1">
              <p className="text-xl font-black text-yellow-200">PARTY PREMIUM</p>
              <p className="mt-1 text-xs text-white/55">
                {language === "hr"
                  ? "Otključaj posebne pakete, teme i igru Chaos Cards."
                  : "Unlock special packs, themes and Chaos Cards."}
              </p>
            </div>
            <span className="font-black text-yellow-200">›</span>
          </div>
        </motion.div>
      </Link>

      <section className="flex flex-col gap-4">
        {games.map(
          (
            game,
            index
          ) => {
            const card = (
              <motion.div
                key={
                  game.name
                }
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  delay:
                    index *
                    0.08,
                }}
                whileHover={{
                  scale: 1.02,
                }}
                whileTap={{
                  scale: 0.98,
                }}
                className={`rounded-3xl border p-5 shadow-xl transition ${
                  game.name === "CHAOS CARDS"
                    ? "border-yellow-300/40 bg-yellow-300/10 shadow-yellow-400/10 hover:border-yellow-300"
                    : "border-accent/40 bg-accent/10 shadow-accent/10 hover:border-accent"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-16 w-16 shrink-0 items-center justify-center whitespace-nowrap rounded-2xl bg-white/5 ${
                      game.name === "TRUTH OR DARE"
                        ? "text-[23px]"
                        : "text-4xl"
                    }`}
                  >
                    {
                      game.emoji
                    }
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className={`text-2xl font-black ${game.name === "CHAOS CARDS" ? "text-yellow-200" : ""}`}>
                      {
                        game.name
                      }
                    </h2>

                    <p className="mt-1 text-sm text-white/50">
                      {language ===
                      "hr"
                        ? game.hr
                        : game.en}
                    </p>
                  </div>

                  <div className={`text-xs font-black uppercase ${game.name === "CHAOS CARDS" ? "text-yellow-300" : "text-accent"}`}>
                    {game.name === "CHAOS CARDS"
                      ? "👑 PREMIUM"
                      : language === "hr"
                      ? "IGRAJ"
                      : "PLAY"}
                  </div>
                </div>
              </motion.div>
            );

            return (
              <Link
                key={
                  game.name
                }
                href={
                  game.href
                }
              >
                {card}
              </Link>
            );
          }
        )}
      </section>

      <footer className="mt-auto pt-6">
        <p className="text-center text-xs text-white/25">
          {language === "hr"
            ? "Sve igre su spremne za igranje."
            : "All games are ready to play."}
        </p>

        <nav
          aria-label={
            language === "hr"
              ? "Pravne informacije i podrška"
              : "Legal information and support"
          }
          className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs text-white/45"
        >
          <Link
            href="/privacy"
            className="underline decoration-white/20 underline-offset-4 transition hover:text-white"
          >
            {language === "hr"
              ? "Privatnost"
              : "Privacy"}
          </Link>

          <span aria-hidden="true" className="text-white/20">
            •
          </span>

          <Link
            href="/terms"
            className="underline decoration-white/20 underline-offset-4 transition hover:text-white"
          >
            {language === "hr"
              ? "Uvjeti korištenja"
              : "Terms of Use"}
          </Link>

          <span aria-hidden="true" className="text-white/20">
            •
          </span>

          <Link
            href="/support"
            className="underline decoration-white/20 underline-offset-4 transition hover:text-white"
          >
            {language === "hr"
              ? "Podrška"
              : "Support"}
          </Link>
        </nav>

        <motion.div
          className="mt-5 flex items-center justify-center"
          initial={{
            opacity: 0,
            y: 8,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.45,
          }}
        >
          <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 shadow-lg shadow-black/20">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-white/[0.04]">
              <img
                src="/rak-logo.png"
                alt="RAK logo"
                className="h-full w-full object-contain"
              />
            </div>

            <div className="leading-none">
              <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/30">
                MADE BY
              </p>

              <p className="mt-1.5 text-xs font-black tracking-[0.18em] text-accent">
                RAK
              </p>
            </div>
          </div>
        </motion.div>
      </footer>
    </main>
  );
}