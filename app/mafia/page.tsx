"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";

export default function MafiaPage() {
  const router = useRouter();
  const { language, t } = useLanguage();

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-7 p-6">
      <button
        type="button"
        onClick={() => router.push("/")}
        className="text-white/40 text-sm self-start"
      >
        ← {t("back")}
      </button>

      <div className="text-center pt-4">
        <div className="text-6xl">🎭</div>

        <h1 className="mt-3 text-4xl font-black">
          MAFIA
        </h1>

        <p className="mt-2 text-white/45">
          {language === "hr"
            ? "Pronađi mafiju prije nego bude prekasno."
            : "Find the Mafia before it's too late."}
        </p>
      </div>

      <section className="rounded-3xl border border-accent/25 bg-accent/10 p-5">
        <p className="text-sm leading-relaxed text-white/65">
          {language === "hr"
            ? "Noću Mafija napada. Doktor spašava. Detektiv istražuje. Danju svi raspravljaju i glasaju."
            : "At night the Mafia attacks. The Doctor saves. The Detective investigates. During the day everyone discusses and votes."}
        </p>
      </section>

      <div className="flex flex-col gap-3">
        <Link href="/mafia/create">
          <div className="rounded-2xl bg-accent px-6 py-4 text-center font-black text-white shadow-lg shadow-accent/25">
            🎮 {language === "hr" ? "KREIRAJ IGRU" : "CREATE GAME"}
          </div>
        </Link>

        <Link href="/mafia/join">
          <div className="rounded-2xl border border-white/10 bg-panel2 px-6 py-4 text-center font-black text-white">
            🚪 {language === "hr" ? "PRIDRUŽI SE" : "JOIN GAME"}
          </div>
        </Link>
      </div>

      <p className="mt-auto text-center text-xs text-white/25">
        4–12 PLAYERS
      </p>
    </main>
  );
}