"use client";

import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";

export default function TermsPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const hr = language === "hr";

  return (
    <main className="min-h-screen max-w-2xl mx-auto p-6 pb-16">
      <button type="button" onClick={() => router.back()} className="text-sm text-white/50">
        ← {hr ? "Natrag" : "Back"}
      </button>

      <p className="mt-8 text-xs font-black uppercase tracking-[0.25em] text-accent">🎉 PARTY GAMES</p>
      <h1 className="mt-2 text-4xl font-black">{hr ? "Uvjeti korištenja" : "Terms of Use"}</h1>
      <p className="mt-2 text-sm text-white/40">{hr ? "Ažurirano: 13. kolovoza 2026." : "Updated: August 13, 2026"}</p>

      <div className="mt-8 space-y-7 text-sm leading-7 text-white/70">
        <section>
          <h2 className="text-xl font-black text-white">1. {hr ? "Prihvaćanje uvjeta" : "Acceptance"}</h2>
          <p className="mt-2">{hr ? "Korištenjem aplikacije Party Games prihvaćate ove uvjete. Ako ih ne prihvaćate, nemojte koristiti aplikaciju." : "By using Party Games, you agree to these terms. If you do not agree, do not use the app."}</p>
        </section>

        <section>
          <h2 className="text-xl font-black text-white">2. {hr ? "Pravila ponašanja" : "Conduct"}</h2>
          <p className="mt-2">{hr ? "Ne smijete koristiti uvredljive nadimke, uznemiravati druge igrače, slati nezakonit sadržaj, varati, ometati rad aplikacije niti pokušavati pristupiti tuđim sobama ili podacima bez dopuštenja." : "You must not use offensive nicknames, harass other players, submit illegal content, cheat, disrupt the app, or attempt to access other users’ rooms or data without permission."}</p>
        </section>

        <section>
          <h2 className="text-xl font-black text-white">3. {hr ? "Sadržaj 18+" : "18+ content"}</h2>
          <p className="mt-2">{hr ? "Paketi označeni 18+ namijenjeni su isključivo punoljetnim korisnicima. Host je odgovoran odabrati sadržaj prikladan svojoj grupi, a svi igrači mogu odbiti pitanje ili izazov zbog kojeg se osjećaju neugodno ili nesigurno." : "Packs marked 18+ are intended only for adults. The host is responsible for selecting content appropriate for the group, and every player may refuse any question or challenge that feels uncomfortable or unsafe."}</p>
        </section>

        <section>
          <h2 className="text-xl font-black text-white">4. {hr ? "Sigurnost izazova" : "Challenge safety"}</h2>
          <p className="mt-2">{hr ? "Nikada nemojte izvršavati izazov koji je opasan, nezakonit, uključuje vožnju, nasilje, prisilu, neželjeni seksualni kontakt, prekomjerno pijenje ili rizik za zdravlje i imovinu. Igrači su odgovorni za vlastite odluke." : "Never perform a challenge that is dangerous, illegal, involves driving, violence, coercion, unwanted sexual contact, excessive drinking, or risks health or property. Players are responsible for their own decisions."}</p>
        </section>

        <section>
          <h2 className="text-xl font-black text-white">5. {hr ? "Premium i kupnje" : "Premium and purchases"}</h2>
          <p className="mt-2">{hr ? "Premium može otključati dodatne igre, pakete, avatare, teme i postavke. Cijena i trajanje prikazuju se prije kupnje. Kupnje i povrate obrađuje trgovina preko koje je kupnja izvršena. Pretplate se mogu automatski obnavljati dok ih ne otkažete u postavkama trgovine." : "Premium may unlock additional games, packs, avatars, themes, and settings. Price and duration are shown before purchase. Purchases and refunds are handled by the store used for the transaction. Subscriptions may renew automatically until canceled in your store settings."}</p>
        </section>

        <section>
          <h2 className="text-xl font-black text-white">6. {hr ? "Dostupnost i odgovornost" : "Availability and liability"}</h2>
          <p className="mt-2">{hr ? "Aplikaciju pružamo u dostupnom stanju i ne jamčimo neprekidan rad. U najvećoj mjeri dopuštenoj zakonom ne odgovaramo za štetu nastalu ponašanjem igrača, prekidom veze, gubitkom rezultata ili nepravilnim korištenjem aplikacije." : "The app is provided as available and uninterrupted operation is not guaranteed. To the fullest extent permitted by law, we are not liable for harm caused by player behavior, connection failures, lost scores, or misuse of the app."}</p>
        </section>

        <section>
          <h2 className="text-xl font-black text-white">7. {hr ? "Promjene i kontakt" : "Changes and contact"}</h2>
          <p className="mt-2">{hr ? "Možemo mijenjati aplikaciju i ove uvjete. Za pitanja se javite na partygames.support@gmail.com." : "We may modify the app and these terms. For questions, contact partygames.support@gmail.com."}</p>
        </section>
      </div>
    </main>
  );
}
