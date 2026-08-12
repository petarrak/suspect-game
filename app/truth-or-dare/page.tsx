"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AvatarPicker from "@/components/AvatarPicker";
import Button from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";
import {
  createTruthDareRoom,
  joinTruthDareRoom,
} from "@/lib/truthDare";

export default function TruthDareHomePage() {
  const router = useRouter();
  const { language } = useLanguage();
  const [mode, setMode] = useState<"menu" | "create" | "join">("menu");
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState("😎");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nicknameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const qrCode = new URLSearchParams(window.location.search).get("code");
    if (qrCode) {
      setCode(qrCode.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6));
      setMode("join");
    }
  }, []);

  useEffect(() => {
    if (mode !== "menu") nicknameRef.current?.focus();
  }, [mode]);

  async function submit() {
    if (!nickname.trim()) {
      setError(language === "hr" ? "Upiši nadimak." : "Enter a nickname.");
      return;
    }
    if (mode === "join" && code.length !== 6) {
      setError(language === "hr" ? "Upiši kod od 6 znakova." : "Enter the 6-character code.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = mode === "create"
        ? await createTruthDareRoom(nickname.trim(), avatar)
        : await joinTruthDareRoom(code, nickname.trim(), avatar);
      router.push(`/truth-or-dare/room/${result.code}`);
    } catch (e: any) {
      setError(e?.message ?? "Could not continue.");
      setLoading(false);
    }
  }

  if (mode === "menu") {
    return (
      <main className="min-h-screen max-w-md mx-auto flex flex-col gap-6 p-6">
        <button onClick={() => router.push("/")} className="self-start text-sm text-white/40">
          ← {language === "hr" ? "Natrag" : "Back"}
        </button>
        <header className="pt-12 text-center">
          <div className="text-8xl">😇😈</div>
          <p className="mt-5 text-xs font-black tracking-[0.3em] text-accent">PARTY GAMES</p>
          <h1 className="mt-3 text-5xl font-black">TRUTH OR DARE</h1>
          <p className="mt-3 text-white/45">
            {language === "hr" ? "Reci istinu ili prihvati izazov." : "Tell the truth or take the dare."}
          </p>
        </header>
        <div className="mt-auto flex flex-col gap-3 pb-6">
          <Button onClick={() => setMode("create")}>✨ {language === "hr" ? "NOVA SOBA" : "CREATE ROOM"}</Button>
          <Button variant="secondary" onClick={() => setMode("join")}>🚪 {language === "hr" ? "PRIDRUŽI SE" : "JOIN ROOM"}</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-5 p-6">
      <button onClick={() => setMode("menu")} className="self-start text-sm text-white/40">← {language === "hr" ? "Natrag" : "Back"}</button>
      <h1 className="text-3xl font-black">
        {mode === "create"
          ? language === "hr" ? "Napravi sobu" : "Create room"
          : language === "hr" ? "Pridruži se" : "Join room"}
      </h1>
      {mode === "join" && (
        <input
          className="input text-center uppercase tracking-[0.3em]"
          value={code}
          maxLength={6}
          placeholder="ROOM CODE"
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
        />
      )}
      <input
        ref={nicknameRef}
        className="input"
        value={nickname}
        maxLength={20}
        placeholder={language === "hr" ? "Nadimak" : "Nickname"}
        onChange={(e) => setNickname(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && !loading && void submit()}
      />
      <AvatarPicker value={avatar} onChange={setAvatar} language={language} />
      {error && <p className="rounded-2xl border border-accent/25 bg-accent/10 p-3 text-center text-sm text-accent">{error}</p>}
      <div className="mt-auto"><Button disabled={loading} onClick={() => void submit()}>{loading ? "..." : mode === "create" ? "✨ CREATE" : "🚪 JOIN"}</Button></div>
    </main>
  );
}