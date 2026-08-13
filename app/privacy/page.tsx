"use client";

import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";

const updated = "13. kolovoza 2026.";

export default function PrivacyPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const hr = language === "hr";

  return (
    <main className="min-h-screen max-w-2xl mx-auto p-6 pb-16">
      <button type="button" onClick={() => router.back()} className="text-sm text-white/50">
        ← {hr ? "Natrag" : "Back"}
      </button>

      <p className="mt-8 text-xs font-black uppercase tracking-[0.25em] text-accent">🎉 PARTY GAMES</p>
      <h1 className="mt-2 text-4xl font-black">{hr ? "Pravila privatnosti" : "Privacy Policy"}</h1>
      <p className="mt-2 text-sm text-white/40">{hr ? `Ažurirano: ${updated}` : "Updated: August 13, 2026"}</p>

      <div className="mt-8 space-y-7 text-sm leading-7 text-white/70">
        <section>
          <h2 className="text-xl font-black text-white">1. {hr ? "Tko smo" : "Who we are"}</h2>
          <p className="mt-2">
            {hr
              ? "Party Games je multiplayer aplikacija za društvene igre. Za pitanja o privatnosti kontaktirajte nas na partygames.support@gmail.com."
              : "Party Games is a multiplayer party-game application. For privacy questions, contact us at partygames.support@gmail.com."}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-white">2. {hr ? "Podaci koje obrađujemo" : "Data we process"}</h2>
          <p className="mt-2">
            {hr
              ? "Aplikacija može obrađivati anonimni korisnički identifikator, odabrani nadimak i avatar, članstvo u sobi, rezultate i statistiku igre te sadržaj potreban za igranje, primjerice odgovore, glasove, pogađanja i poteze crtanja. Ne tražimo vaše pravo ime, adresu ni broj telefona."
              : "The app may process an anonymous user identifier, chosen nickname and avatar, room membership, game scores and statistics, and gameplay content such as answers, votes, guesses, and drawing strokes. We do not require your real name, address, or phone number."}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-white">3. {hr ? "Zašto koristimo podatke" : "Why we use data"}</h2>
          <p className="mt-2">
            {hr
              ? "Podatke koristimo kako bismo kreirali i povezali sobe, sinkronizirali igru između uređaja, prikazali rezultate, omogućili povratak u aktivnu igru, spriječili zloupotrebu i pružili podršku."
              : "We use data to create and connect rooms, synchronize gameplay between devices, display results, reconnect players to active games, prevent misuse, and provide support."}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-white">4. {hr ? "Usluge trećih strana" : "Third-party services"}</h2>
          <p className="mt-2">
            {hr
              ? "Za hosting koristimo Vercel, a za autentifikaciju, bazu podataka i sinkronizaciju Supabase. Ako uvedemo kupnje unutar aplikacije, obradu plaćanja obavljat će Google Play ili Apple App Store. Mi ne primamo potpune podatke vaše platne kartice."
              : "We use Vercel for hosting and Supabase for authentication, database storage, and synchronization. If in-app purchases are introduced, payments will be processed by Google Play or the Apple App Store. We do not receive your full payment-card details."}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-white">5. {hr ? "Čuvanje i dijeljenje" : "Retention and sharing"}</h2>
          <p className="mt-2">
            {hr
              ? "Podatke čuvamo samo koliko je potrebno za rad aplikacije, sigurnost, podršku i zakonske obveze. Ne prodajemo osobne podatke. Podatke možemo podijeliti samo s pružateljima usluga potrebnima za rad aplikacije ili kada to zahtijeva zakon. Sadržaj unutar sobe vidljiv je drugim sudionicima te sobe."
              : "We retain data only as needed to operate the app, maintain security, provide support, and meet legal obligations. We do not sell personal data. Data may be shared only with service providers needed to operate the app or when required by law. Content submitted in a room is visible to other participants in that room."}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-white">6. {hr ? "Djeca i sadržaj za odrasle" : "Children and adult content"}</h2>
          <p className="mt-2">
            {hr
              ? "Party Games sadrži opće igre, ali pojedini jasno označeni paketi mogu sadržavati sadržaj za osobe starije od 18 godina. Maloljetnici ne smiju koristiti pakete označene 18+."
              : "Party Games includes general-audience games, but some clearly labeled packs may contain content intended for adults aged 18 or older. Minors must not use packs marked 18+."}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-white">7. {hr ? "Vaša prava i brisanje" : "Your rights and deletion"}</h2>
          <p className="mt-2">
            {hr
              ? "Možete zatražiti pristup, ispravak ili brisanje svojih podataka. Pošaljite zahtjev na partygames.support@gmail.com i navedite nadimak, kod posljednje sobe i približno vrijeme korištenja kako bismo mogli pronaći anonimne podatke."
              : "You may request access to, correction of, or deletion of your data. Email partygames.support@gmail.com and include your nickname, latest room code, and approximate usage time so we can locate anonymous data."}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-white">8. {hr ? "Promjene pravila" : "Policy changes"}</h2>
          <p className="mt-2">
            {hr
              ? "Ova pravila možemo ažurirati kada se promijene funkcije aplikacije ili pravni zahtjevi. Datum zadnje izmjene bit će prikazan na vrhu stranice."
              : "We may update this policy when app features or legal requirements change. The latest revision date will be displayed at the top of this page."}
          </p>
        </section>
      </div>
    </main>
  );
}
