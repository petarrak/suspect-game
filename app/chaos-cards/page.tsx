"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AvatarPicker from "@/components/AvatarPicker";
import Button from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";
import { usePremiumStatus } from "@/lib/premium";
import { createChaosRoom, joinChaosRoom } from "@/lib/chaosCards";

export default function ChaosCardsHomePage() {
  const router = useRouter();
  const { language } = useLanguage();
  const premium = usePremiumStatus();
  const [mode, setMode] = useState<"menu" | "create" | "join">("menu");
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState("🃏");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const qrCode = new URLSearchParams(window.location.search).get("code");
    if (qrCode) {
      setCode(qrCode.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6));
      setMode("join");
    }
  }, []);

  function openCreate() {
    if (!premium.loading && !premium.is_premium) {
      router.push("/premium");
      return;
    }
    setMode("create");
  }

  async function submit() {
    if (!nickname.trim()) { setError(language === "hr" ? "Upiši nadimak." : "Enter a nickname."); return; }
    if (mode === "join" && code.length !== 6) { setError(language === "hr" ? "Upiši kod od 6 znakova." : "Enter the 6-character code."); return; }
    setBusy(true); setError(null);
    try {
      const result = mode === "create"
        ? await createChaosRoom(nickname.trim(), avatar)
        : await joinChaosRoom(code, nickname.trim(), avatar);
      router.push(`/chaos-cards/room/${result.code}`);
    } catch (e: any) { setError(e?.message ?? "Could not continue."); setBusy(false); }
  }

  if (mode === "menu") return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-6 p-6">
      <button onClick={() => router.push("/")} className="self-start text-sm text-white/40">← {language === "hr" ? "Natrag" : "Back"}</button>
      <header className="pt-10 text-center">
        <div className="text-8xl">🃏</div>
        <p className="mt-4 text-xs font-black tracking-[0.3em] text-yellow-300">👑 PARTY PREMIUM</p>
        <h1 className="mt-3 text-5xl font-black">CHAOS CARDS</h1>
        <p className="mt-3 text-white/45">{language === "hr" ? "Izvuci kartu. Slijedi pravilo. Preživi kaos." : "Draw a card. Follow the rule. Survive the chaos."}</p>
      </header>
      <div className="mt-auto flex flex-col gap-3 pb-6">
        <Button disabled={premium.loading} onClick={openCreate}>👑 {language === "hr" ? "NAPRAVI PREMIUM SOBU" : "CREATE PREMIUM ROOM"}</Button>
        <Button variant="secondary" onClick={() => setMode("join")}>🚪 {language === "hr" ? "PRIDRUŽI SE BESPLATNO" : "JOIN FOR FREE"}</Button>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-5 p-6">
      <button onClick={() => setMode("menu")} className="self-start text-sm text-white/40">← {language === "hr" ? "Natrag" : "Back"}</button>
      <h1 className="text-3xl font-black">{mode === "create" ? (language === "hr" ? "Napravi sobu" : "Create room") : (language === "hr" ? "Pridruži se" : "Join room")}</h1>
      {mode === "join" && <input className="input text-center uppercase tracking-[0.3em]" value={code} maxLength={6} placeholder="ROOM CODE" onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0,6))} />}
      <input className="input" value={nickname} maxLength={20} placeholder={language === "hr" ? "Nadimak" : "Nickname"} onChange={(e) => setNickname(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !busy && void submit()} />
      <AvatarPicker value={avatar} onChange={setAvatar} language={language} />
      {error && <p className="rounded-2xl border border-accent/25 bg-accent/10 p-3 text-center text-sm text-accent">{error}</p>}
      <div className="mt-auto"><Button disabled={busy} onClick={() => void submit()}>{busy ? "..." : mode === "create" ? "👑 CREATE" : "🚪 JOIN"}</Button></div>
    </main>
  );
}