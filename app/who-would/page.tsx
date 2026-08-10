"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";

export default function WhoWouldPage() {
  const router = useRouter();
  const { language, t } =
    useLanguage();

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-7 p-6">
      <button
        type="button"
        onClick={() =>
          router.push("/")
        }
        className="text-white/40 text-sm self-start"
      >
        ← {t("back")}
      </button>

      <div className="text-center pt-4">
        <div className="text-6xl">
          😂
        </div>

        <h1 className="mt-3 text-4xl font-black">
          WHO WOULD?
        </h1>

        <p className="mt-2 text-white/45">
          {language === "hr"
            ? "Glasaj koji prijatelj najbolje odgovara pitanju."
            : "Vote for the friend who best fits the question."}
        </p>
      </div>

      <section className="rounded-3xl border border-accent/25 bg-accent/10 p-5">
        <p className="text-sm leading-relaxed text-white/65">
          {language === "hr"
            ? "Svaku rundu dobivate pitanje. Svi glasaju za jednog igrača, a onda se otkrivaju rezultati."
            : "Each round gives you a question. Everyone votes for one player, then the results are revealed."}
        </p>
      </section>

      <div className="flex flex-col gap-3">
        <Link href="/who-would/create">
          <div className="rounded-2xl bg-accent px-6 py-4 text-center font-black text-white shadow-lg shadow-accent/25">
            🎮{" "}
            {language === "hr"
              ? "KREIRAJ IGRU"
              : "CREATE GAME"}
          </div>
        </Link>

        <Link href="/who-would/join">
          <div className="rounded-2xl border border-white/10 bg-panel2 px-6 py-4 text-center font-black text-white">
            🚪{" "}
            {language === "hr"
              ? "PRIDRUŽI SE"
              : "JOIN GAME"}
          </div>
        </Link>
      </div>

      <p className="mt-auto text-center text-xs text-white/25">
        3–12 PLAYERS
      </p>
    </main>
  );
}