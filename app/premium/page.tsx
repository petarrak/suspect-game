"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";

import { useLanguage } from "@/components/LanguageProvider";
import {
  purchasePremium,
  restorePremiumPurchases,
  type PremiumPlan,
  usePremiumStatus,
} from "@/lib/premium";
import { playSound } from "@/lib/sounds";

const PLANS: Array<{
  id: PremiumPlan;
  hr: string;
  en: string;
  price: string;
  detailHr: string;
  detailEn: string;
  recommended?: boolean;
}> = [
  {
    id: "monthly",
    hr: "Mjesečno",
    en: "Monthly",
    price: "2,99 €",
    detailHr: "2,99 € / mjesečno",
    detailEn: "€2.99 / month",
  },
  {
    id: "yearly",
    hr: "Godišnje",
    en: "Yearly",
    price: "19,99 €",
    detailHr: "1,67 € / mjesečno",
    detailEn: "€1.67 / month",
    recommended: true,
  },
  {
    id: "lifetime",
    hr: "Doživotno",
    en: "Lifetime",
    price: "29,99 €",
    detailHr: "Jednokratna kupnja",
    detailEn: "One-time purchase",
  },
];

const PREMIUM_FEATURES = [
  {
    emoji: "🃏",
    titleHr: "Chaos Cards igra",
    titleEn: "Chaos Cards game",
    textHr:
      "Cijela ekskluzivna Premium igra s Party, Funny, Drinking, Hot i Brutal načinima.",
    textEn:
      "A complete exclusive Premium game with Party, Funny, Drinking, Hot and Brutal modes.",
  },
  {
    emoji: "😇/😈",
    titleHr: "Truth or Dare paketi",
    titleEn: "Truth or Dare packs",
    textHr:
      "After Dark, Brutal, Hot, Drinking, Secrets i Red Flags pitanja i izazovi.",
    textEn:
      "After Dark, Brutal, Hot, Drinking, Secrets and Red Flags questions and dares.",
  },
  {
    emoji: "🕵️",
    titleHr: "Suspect Premium paketi",
    titleEn: "Suspect Premium packs",
    textHr:
      "Couples, 18+, Drinking i Savage paketi s posebnim pitanjima.",
    textEn:
      "Couples, 18+, Drinking and Savage packs with special questions.",
  },
  {
    emoji: "👑",
    titleHr: "20 posebnih avatara",
    titleEn: "20 special avatars",
    textHr:
      "Ekskluzivni Premium avatari dostupni u svim igrama.",
    textEn:
      "Exclusive Premium avatars available across all games.",
  },
  {
    emoji: "🎨",
    titleHr: "3 vizualne teme",
    titleEn: "3 visual themes",
    textHr:
      "Neon, Midnight Gold i Candy Party izgled cijele aplikacije.",
    textEn:
      "Neon, Midnight Gold and Candy Party styles for the whole app.",
  },
  {
    emoji: "🚫",
    titleHr: "Bez oglasa",
    titleEn: "Ad-free",
    textHr:
      "Premium ostaje bez oglasa kada oglasi budu dodani u besplatnu verziju.",
    textEn:
      "Premium stays ad-free when ads are added to the free version.",
  },
];

function isPurchaseCancelled(error: unknown) {
  const value =
    error &&
    typeof error === "object" &&
    "message" in error
      ? String(error.message).toLowerCase()
      : String(error ?? "").toLowerCase();

  return (
    value.includes("cancel") ||
    value.includes("otkaz") ||
    value.includes("user cancelled")
  );
}

export default function PartyPremiumPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const premium = usePremiumStatus();

  const [selected, setSelected] =
    useState<PremiumPlan>("yearly");

  const [message, setMessage] =
    useState<string | null>(null);

  const [purchasing, setPurchasing] =
    useState(false);

  const [restoring, setRestoring] =
    useState(false);

  const busy =
    purchasing ||
    restoring ||
    premium.loading;

  async function handleSubscribe() {
    if (busy) return;

    try {
      setPurchasing(true);
      setMessage(null);

      playSound("click", 0.55);

      const result =
        await purchasePremium(selected);

      await premium.refresh();

      if (result.is_premium) {
        playSound("winner", 0.75);

        setMessage(
          language === "hr"
            ? "Premium je uspješno aktiviran!"
            : "Premium was activated successfully!"
        );
      } else {
        setMessage(
          language === "hr"
            ? "Kupnja je završena, ali Premium status još nije osvježen. Pritisni „Vrati kupnje”."
            : "The purchase finished, but Premium status has not refreshed yet. Press “Restore purchases”."
        );
      }
    } catch (error: unknown) {
      if (isPurchaseCancelled(error)) {
        setMessage(
          language === "hr"
            ? "Kupnja je otkazana."
            : "Purchase cancelled."
        );
      } else {
        const errorMessage =
          error &&
          typeof error === "object" &&
          "message" in error
            ? String(error.message)
            : null;

        setMessage(
          errorMessage ??
            (language === "hr"
              ? "Kupnja nije uspjela. Pokušaj ponovno."
              : "Purchase failed. Please try again.")
        );
      }
    } finally {
      setPurchasing(false);
    }
  }

  async function handleRestore() {
    if (busy) return;

    try {
      setRestoring(true);
      setMessage(null);

      playSound("click", 0.4);

      const restored =
        await restorePremiumPurchases();

      await premium.refresh();

      if (restored.is_premium) {
        playSound("winner", 0.7);

        setMessage(
          language === "hr"
            ? "Premium kupnja je uspješno vraćena!"
            : "Premium purchase restored successfully!"
        );
      } else {
        setMessage(
          language === "hr"
            ? "Na ovom Google Play računu nije pronađena Premium kupnja."
            : "No Premium purchase was found on this Google Play account."
        );
      }
    } catch (error: unknown) {
      const errorMessage =
        error &&
        typeof error === "object" &&
        "message" in error
          ? String(error.message)
          : null;

      setMessage(
        errorMessage ??
          (language === "hr"
            ? "Nije moguće vratiti kupnje."
            : "Could not restore purchases.")
      );
    } finally {
      setRestoring(false);
    }
  }

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col bg-gradient-to-b from-[#531052] via-[#24102f] to-[#0d0913] p-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="self-end text-3xl text-white/70"
        aria-label={
          language === "hr"
            ? "Zatvori"
            : "Close"
        }
      >
        ×
      </button>

      <motion.header
        className="pt-4 text-center"
        initial={{
          opacity: 0,
          y: -15,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
      >
        <motion.div
          className="text-7xl"
          animate={{
            rotate: [-5, 5, -5],
            y: [0, -5, 0],
          }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
          }}
        >
          👑
        </motion.div>

        <p className="mt-4 text-xs font-black uppercase tracking-[0.3em] text-pink-300">
          PARTY GAMES
        </p>

        <h1 className="mt-2 text-5xl font-black">
          Premium
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-white/55">
          {language === "hr"
            ? "Otključaj cijelu Premium igru, posebne pakete, avatare, teme i budući Premium sadržaj."
            : "Unlock a complete Premium game, special packs, avatars, themes and future Premium content."}
        </p>
      </motion.header>

      <section className="mt-7 rounded-3xl border border-yellow-300/25 bg-yellow-300/10 p-5 text-center">
        <div className="text-4xl">
          👑
        </div>

        <h2 className="mt-2 text-lg font-black text-yellow-200">
          {language === "hr"
            ? "PREMIUM TREBA SAMO HOST"
            : "ONLY THE HOST NEEDS PREMIUM"}
        </h2>

        <p className="mt-2 text-sm leading-relaxed text-white/60">
          {language === "hr"
            ? "Host napravi Premium sobu, a svi prijatelji mogu se pridružiti i igrati besplatno."
            : "The host creates a Premium room, and every friend can join and play for free."}
        </p>
      </section>

      <section className="mt-5 flex flex-col gap-3">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-pink-300">
          {language === "hr"
            ? "SVE ŠTO DOBIVAŠ"
            : "EVERYTHING YOU GET"}
        </p>

        {PREMIUM_FEATURES.map(
          (feature) => (
            <div
              key={feature.titleEn}
              className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-2xl">
                {feature.emoji}
              </div>

              <div>
                <h3 className="font-black text-white">
                  {language === "hr"
                    ? feature.titleHr
                    : feature.titleEn}
                </h3>

                <p className="mt-1 text-xs leading-relaxed text-white/50">
                  {language === "hr"
                    ? feature.textHr
                    : feature.textEn}
                </p>
              </div>
            </div>
          )
        )}
      </section>

      <button
        type="button"
        onClick={() => {
          playSound("click", 0.45);
          router.push("/themes");
        }}
        className="mt-4 rounded-2xl border border-fuchsia-300/30 bg-fuchsia-400/10 px-4 py-4 font-black text-fuchsia-200 transition active:scale-[0.98]"
      >
        🎨{" "}
        {language === "hr"
          ? "ODABERI PREMIUM TEMU"
          : "CHOOSE PREMIUM THEME"}
      </button>

      {premium.is_premium ? (
        <div className="mt-8 rounded-3xl border border-green-400/30 bg-green-400/10 p-6 text-center">
          <div className="text-5xl">
            ✅
          </div>

          <h2 className="mt-3 text-2xl font-black text-green-300">
            {language === "hr"
              ? "PREMIUM JE AKTIVAN"
              : "PREMIUM IS ACTIVE"}
          </h2>

          <p className="mt-2 text-white/45">
            {premium.plan?.toUpperCase()}
          </p>
        </div>
      ) : (
        <section className="mt-8 flex flex-col gap-3">
          {PLANS.map((plan) => (
            <button
              key={plan.id}
              type="button"
              disabled={busy}
              onClick={() =>
                setSelected(plan.id)
              }
              className={`relative rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                selected === plan.id
                  ? "border-fuchsia-400 bg-fuchsia-500/20 shadow-lg shadow-fuchsia-500/15"
                  : "border-white/20 bg-white/5"
              }`}
            >
              {plan.recommended && (
                <span className="absolute -top-2 right-3 rounded-full bg-fuchsia-500 px-3 py-1 text-[9px] font-black uppercase">
                  {language === "hr"
                    ? "NAJBOLJA CIJENA"
                    : "BEST VALUE"}
                </span>
              )}

              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-black">
                    {language === "hr"
                      ? plan.hr
                      : plan.en}
                  </p>

                  <p className="mt-1 text-xs text-white/45">
                    {language === "hr"
                      ? plan.detailHr
                      : plan.detailEn}
                  </p>
                </div>

                <p className="text-xl font-black text-fuchsia-300">
                  {plan.price}
                </p>
              </div>
            </button>
          ))}

          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void handleSubscribe()
            }
            className="mt-2 rounded-2xl bg-gradient-to-r from-pink-500 to-fuchsia-600 py-5 text-lg font-black shadow-xl shadow-fuchsia-500/25 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {purchasing ? (
              <>
                ⏳{" "}
                {language === "hr"
                  ? "OBRADA KUPNJE..."
                  : "PROCESSING..."}
              </>
            ) : (
              <>
                👑{" "}
                {language === "hr"
                  ? "OTKLJUČAJ PREMIUM"
                  : "UNLOCK PREMIUM"}
              </>
            )}
          </button>
        </section>
      )}

      {premium.error && (
        <p className="mt-4 text-center text-sm text-red-300">
          {premium.error}
        </p>
      )}

      {message && (
        <p className="mt-4 rounded-2xl border border-pink-300/20 bg-pink-300/10 p-3 text-center text-sm text-pink-100">
          {message}
        </p>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={() =>
          void handleRestore()
        }
        className="mt-5 pb-6 text-center text-xs font-bold text-white/50 underline disabled:cursor-not-allowed disabled:opacity-40"
      >
        {restoring
          ? language === "hr"
            ? "VRAĆANJE KUPNJI..."
            : "RESTORING..."
          : language === "hr"
          ? "Vrati kupnje"
          : "Restore purchases"}
      </button>
    </main>
  );
}