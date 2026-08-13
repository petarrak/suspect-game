"use client";

import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";

const email = "partygames.support@gmail.com";

export default function SupportPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const hr = language === "hr";

  return (
    <main className="min-h-screen max-w-2xl mx-auto p-6 pb-16">
      <button type="button" onClick={() => router.back()} className="text-sm text-white/50">
        ← {hr ? "Natrag" : "Back"}
      </button>

      <p className="mt-8 text-xs font-black uppercase tracking-[0.25em] text-accent">🎉 PARTY GAMES</p>
      <h1 className="mt-2 text-4xl font-black">{hr ? "Podrška" : "Support"}</h1>
      <p className="mt-3 text-white/55">{hr ? "Trebaš pomoć, pronašao si grešku ili želiš izbrisati svoje podatke?" : "Need help, found a bug, or want your data deleted?"}</p>

      <section className="mt-8 rounded-3xl border border-white/10 bg-panel2 p-6">
        <div className="text-5xl">✉️</div>
        <h2 className="mt-4 text-2xl font-black">{hr ? "Kontaktiraj nas" : "Contact us"}</h2>
        <p className="mt-2 text-sm leading-6 text-white/55">{hr ? "Opiši problem i napiši koju si igru igrao, kod sobe i uređaj koji koristiš. Nemoj slati lozinke ili podatke platne kartice." : "Describe the issue and include the game, room code, and device you used. Never send passwords or payment-card information."}</p>
        <a href={`mailto:${email}?subject=Party%20Games%20Support`} className="mt-5 block rounded-2xl bg-accent px-5 py-4 text-center font-black text-white">
          {email}
        </a>
      </section>

      <section className="mt-5 rounded-3xl border border-white/10 bg-panel2 p-6">
        <div className="text-5xl">🗑️</div>
        <h2 className="mt-4 text-2xl font-black">{hr ? "Brisanje podataka" : "Data deletion"}</h2>
        <p className="mt-2 text-sm leading-6 text-white/55">
          {hr
            ? "Za brisanje anonimnog računa i povezanih podataka pošalji zahtjev s nadimkom, kodom posljednje sobe i približnim datumom igranja. Odgovorit ćemo nakon što pronađemo i obradimo podatke koje možemo povezati sa zahtjevom."
            : "To delete an anonymous account and related data, send a request with your nickname, latest room code, and approximate play date. We will respond after locating and processing data that can be linked to the request."}
        </p>
        <a href={`mailto:${email}?subject=Party%20Games%20-%20Data%20Deletion%20Request`} className="mt-5 block rounded-2xl border border-red-400/30 bg-red-400/10 px-5 py-4 text-center font-black text-red-300">
          {hr ? "ZATRAŽI BRISANJE PODATAKA" : "REQUEST DATA DELETION"}
        </a>
      </section>

      <section className="mt-5 rounded-3xl border border-white/10 bg-panel2 p-6">
        <h2 className="text-xl font-black">{hr ? "Brza pomoć" : "Quick help"}</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-white/55">
          <li>{hr ? "Provjeri internetsku vezu i ponovno otvori aplikaciju." : "Check your internet connection and reopen the app."}</li>
          <li>{hr ? "Za povratak u sobu koristi isti preglednik i uređaj." : "Use the same browser and device when reconnecting to a room."}</li>
          <li>{hr ? "Ako kod sobe ne radi, provjeri svih šest znakova." : "If a room code fails, verify all six characters."}</li>
          <li>{hr ? "Za povrat kupnje koristi Google Play ili Appleovu podršku za kupnje." : "For purchase refunds, use Google Play or Apple purchase support."}</li>
        </ul>
      </section>

      <div className="mt-8 flex justify-center gap-5 text-xs text-white/40">
        <button type="button" onClick={() => router.push("/privacy")} className="underline">{hr ? "Privatnost" : "Privacy"}</button>
        <button type="button" onClick={() => router.push("/terms")} className="underline">{hr ? "Uvjeti" : "Terms"}</button>
      </div>
    </main>
  );
}
