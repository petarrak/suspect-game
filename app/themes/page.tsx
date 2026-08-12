"use client";

import { useRouter } from "next/navigation";
import { motion } from "motion/react";

import { useLanguage } from "@/components/LanguageProvider";
import {
  type PartyTheme,
  usePartyTheme,
} from "@/components/ThemeProvider";
import { usePremiumStatus } from "@/lib/premium";
import { playSound } from "@/lib/sounds";

const THEMES: Array<{
  id: PartyTheme;
  emoji: string;
  hr: string;
  en: string;
  colors: string[];
  premium: boolean;
}> = [
  {
    id: "default",
    emoji: "🎉",
    hr: "Party Original",
    en: "Party Original",
    colors: ["#0b0b12", "#7c4dff", "#ff3d68"],
    premium: false,
  },
  {
    id: "neon",
    emoji: "⚡",
    hr: "Neon",
    en: "Neon",
    colors: ["#050712", "#00f5ff", "#b100ff"],
    premium: true,
  },
  {
    id: "midnight-gold",
    emoji: "👑",
    hr: "Ponoćno zlato",
    en: "Midnight Gold",
    colors: ["#080808", "#f5c451", "#5e4300"],
    premium: true,
  },
  {
    id: "candy-party",
    emoji: "🍭",
    hr: "Candy Party",
    en: "Candy Party",
    colors: ["#16081e", "#ff4fd8", "#63e8ff"],
    premium: true,
  },
];

export default function ThemesPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const premium = usePremiumStatus();
  const { theme, setTheme } = usePartyTheme();

  function chooseTheme(id: PartyTheme, requiresPremium: boolean) {
    playSound("click", 0.45);

    if (requiresPremium && !premium.is_premium) {
      router.push("/premium");
      return;
    }

    setTheme(id);
  }

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-6 p-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="self-start text-sm text-white/45"
      >
        ← {language === "hr" ? "Natrag" : "Back"}
      </button>

      <header className="text-center pt-3">
        <div className="text-6xl">🎨</div>
        <p className="mt-4 text-xs font-black uppercase tracking-[0.3em] text-accent">
          PARTY PREMIUM
        </p>
        <h1 className="mt-2 text-4xl font-black">
          {language === "hr" ? "Odaberi temu" : "Choose a theme"}
        </h1>
        <p className="mt-2 text-sm text-white/45">
          {language === "hr"
            ? "Promijeni izgled cijele aplikacije."
            : "Change the look of the entire app."}
        </p>
      </header>

      <section className="flex flex-col gap-4">
        {THEMES.map((item, index) => {
          const selected = theme === item.id;
          const locked =
            item.premium && !premium.loading && !premium.is_premium;

          return (
            <motion.button
              key={item.id}
              type="button"
              disabled={premium.loading}
              onClick={() => chooseTheme(item.id, item.premium)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
              className={`relative overflow-hidden rounded-3xl border p-5 text-left transition active:scale-[0.98] ${
                selected
                  ? "border-accent bg-accent/20 shadow-xl shadow-accent/15"
                  : locked
                  ? "border-yellow-300/30 bg-yellow-300/5"
                  : "border-white/10 bg-panel2"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="text-4xl">{item.emoji}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-xl font-black">
                    {language === "hr" ? item.hr : item.en}
                  </p>
                  <div className="mt-3 flex gap-2">
                    {item.colors.map((color) => (
                      <span
                        key={color}
                        className="h-5 w-12 rounded-full border border-white/15"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div className="text-xl">
                  {locked ? "🔒" : selected ? "✅" : "›"}
                </div>
              </div>
            </motion.button>
          );
        })}
      </section>

      <p className="pb-4 text-center text-xs text-white/30">
        {language === "hr"
          ? "Premium teme ostaju spremljene na ovom uređaju."
          : "Premium themes stay saved on this device."}
      </p>
    </main>
  );
}