"use client";

import {
  useRouter,
} from "next/navigation";

import {
  useLanguage,
} from "@/components/LanguageProvider";

import {
  playSound,
} from "@/lib/sounds";

export default function HowToPlayPage() {
  const router = useRouter();

  const {
    language,
    t,
  } = useLanguage();

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-6 p-6 pb-12">

      <button
        type="button"
        onClick={() => {
          playSound("click");
          router.push("/");
        }}
        className="text-white/40 text-sm self-start mt-2"
      >
        ← {t("back")}
      </button>

      <div className="text-center pt-2">

        <div className="text-5xl mb-4">
          🕵️
        </div>

        <h1 className="text-4xl font-black">
          {t("rulesTitle")}
        </h1>

        <p className="text-white/40 mt-2">
          {t("rulesSubtitle")}
        </p>

      </div>

      {/* GOAL */}

      <section className="card p-6">

        <div className="text-3xl mb-3">
          🎯
        </div>

        <h2 className="text-xl font-black mb-3 text-accent">
          {t("rulesGoalTitle")}
        </h2>

        <p className="text-white/70 leading-relaxed">
          {t("rulesGoalText")}
        </p>

      </section>

      {/* ROUND */}

      <section className="flex flex-col gap-4">

        <h2 className="text-xl font-black">
          🎮 {t("rulesRoundTitle")}
        </h2>

        <div className="card p-5 flex gap-4">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent font-black">
            1
          </div>

          <div>
            <h3 className="font-black mb-1">
              📱 {t("rulesStep1Title")}
            </h3>

            <p className="text-white/50 text-sm leading-relaxed">
              {t("rulesStep1Text")}
            </p>
          </div>

        </div>

        <div className="card p-5 flex gap-4">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent font-black">
            2
          </div>

          <div>
            <h3 className="font-black mb-1">
              🗣️ {t("rulesStep2Title")}
            </h3>

            <p className="text-white/50 text-sm leading-relaxed">
              {t("rulesStep2Text")}
            </p>
          </div>

        </div>

        <div className="card p-5 flex gap-4">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent font-black">
            3
          </div>

          <div>
            <h3 className="font-black mb-1">
              🗳️ {t("rulesStep3Title")}
            </h3>

            <p className="text-white/50 text-sm leading-relaxed">
              {t("rulesStep3Text")}
            </p>
          </div>

        </div>

        <div className="card p-5 flex gap-4">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent font-black">
            4
          </div>

          <div>
            <h3 className="font-black mb-1">
              🕵️ {t("rulesStep4Title")}
            </h3>

            <p className="text-white/50 text-sm leading-relaxed">
              {t("rulesStep4Text")}
            </p>
          </div>

        </div>

      </section>

      {/* SCORING */}

      <section className="card p-6">

        <h2 className="text-xl font-black mb-4">
          🏆 {t("rulesScoringTitle")}
        </h2>

        <div className="flex flex-col gap-4">

          <div className="rounded-2xl bg-green-500/10 border border-green-500/20 p-4">
            <p className="text-green-300 leading-relaxed">
              ✅ {t("rulesScoringGroup")}
            </p>
          </div>

          <div className="rounded-2xl bg-accent/10 border border-accent/20 p-4">
            <p className="text-white/70 leading-relaxed">
              😈 {t("rulesScoringSuspect")}
            </p>
          </div>

        </div>

      </section>

      {/* TIPS */}

      <section className="card p-6">

        <h2 className="text-xl font-black mb-4">
          💡 {t("rulesTipsTitle")}
        </h2>

        <div className="flex flex-col gap-3 text-white/60">

          <p>
            ✔️ {t("rulesTip1")}
          </p>

          <p>
            ✔️ {t("rulesTip2")}
          </p>

          <p>
            👂 {t("rulesTip3")}
          </p>

          <p>
            😎 {t("rulesTip4")}
          </p>

        </div>

      </section>

      {/* BEST WITH */}

      <section className="card p-6">

        <h2 className="text-xl font-black mb-4">
          🎉 {t("rulesBestWithTitle")}
        </h2>

        <div className="grid grid-cols-1 gap-3">

          <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 flex items-center gap-3">

            <span className="text-2xl">
              👥
            </span>

            <span className="font-semibold">
              {t("rulesPlayers")}
            </span>

          </div>

          <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 flex items-center gap-3">

            <span className="text-2xl">
              📱
            </span>

            <span className="font-semibold">
              {t("rulesPhones")}
            </span>

          </div>

          <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 flex items-center gap-3">

            <span className="text-2xl">
              🎊
            </span>

            <span className="font-semibold">
              {t("rulesPerfectFor")}
            </span>

          </div>

        </div>

      </section>

      {/* IMPORTANT */}

      <section className="rounded-3xl border border-yellow-400/30 bg-yellow-400/10 p-6 text-center">

        <div className="text-4xl mb-3">
          ⚠️
        </div>

        <h2 className="text-xl font-black text-yellow-300 mb-2">
          {t("rulesImportantTitle")}
        </h2>

        <p className="text-white/60 leading-relaxed">
          {t("rulesImportantText")}
        </p>

      </section>

      <button
        type="button"
        onClick={() => {
          playSound("click");
          router.push("/");
        }}
        className="btn-primary w-full"
      >
        {language === "hr"
          ? "RAZUMIJEM 👍"
          : "GOT IT 👍"}
      </button>

    </main>
  );
}