"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Button from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";
import { supabase } from "@/lib/supabase";
import {
  chooseTruthOrDare,
  finishTruthDareTurn,
  getMyTruthDarePlayer,
  getTruthDarePlayers,
  getTruthDarePrompt,
  getTruthDareRoom,
  restartTruthDareGame,
  type TruthDarePlayer,
  type TruthDarePrompt,
  type TruthDareRoom,
} from "@/lib/truthDare";

export default function TruthDareGamePage() {
  const { roomId: raw } = useParams();
  const roomId = Array.isArray(raw) ? raw[0] : raw;
  const router = useRouter();
  const { language } = useLanguage();
  const [room, setRoom] = useState<TruthDareRoom | null>(null);
  const [players, setPlayers] = useState<TruthDarePlayer[]>([]);
  const [me, setMe] = useState<TruthDarePlayer | null>(null);
  const [prompt, setPrompt] = useState<TruthDarePrompt | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!roomId) return;

    const nextRoom = await getTruthDareRoom(roomId);

    // Prikaži sobu odmah. Učitavanje igrača ili pitanja više ne može
    // ostaviti cijelu stranicu zauvijek na "Loading...".
    setRoom(nextRoom);

    if (nextRoom.status === "waiting") {
      router.replace(`/truth-or-dare/room/${nextRoom.code}`);
      return;
    }

    const [nextPlayers, nextMe, nextPrompt] = await Promise.all([
      getTruthDarePlayers(roomId),
      getMyTruthDarePlayer(roomId),
      nextRoom.current_prompt_id ? getTruthDarePrompt(nextRoom.current_prompt_id) : Promise.resolve(null),
    ]);

    setPlayers(nextPlayers);
    setMe(nextMe);
    setPrompt(nextPrompt);
    setError(null);
  }, [roomId, router]);

  const safeLoad = useCallback(() => {
    void load().catch((e) => {
      setError(e?.message ?? "Could not load game.");
    });
  }, [load]);

  useEffect(() => { safeLoad(); }, [safeLoad]);
  useEffect(() => {
    if (!roomId) return;
    const channel = supabase
      .channel(`truth-dare-game-${roomId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "truth_dare_rooms", filter: `id=eq.${roomId}` }, safeLoad)
      .subscribe();

    // Rezerva za mobitele/PWA ako realtime događaj zakasni.
    const interval = window.setInterval(safeLoad, 1500);

    return () => {
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [roomId, safeLoad]);

  async function choose(choice: "TRUTH" | "DARE") {
    if (!roomId || busy) return;
    setBusy(true); setError(null);
    try {
      const result = await chooseTruthOrDare(roomId, choice);
      setPrompt({ id: result.prompt_id, prompt_type: result.choice, pack: result.pack, text_hr: result.text_hr, text_en: result.text_en });
      await load();
    } catch (e: any) { setError(e?.message); }
    finally { setBusy(false); }
  }

  async function finish(completed: boolean) {
    if (!roomId || busy) return;
    setBusy(true); setError(null);
    try { await finishTruthDareTurn(roomId, completed); setPrompt(null); await load(); }
    catch (e: any) { setError(e?.message); }
    finally { setBusy(false); }
  }

  async function restart() {
    if (!roomId || busy || !me?.is_host) return;
    setBusy(true); setError(null);
    try {
      const result = await restartTruthDareGame(roomId);
      router.replace(`/truth-or-dare/room/${result.code}`);
    } catch (e: any) { setError(e?.message); setBusy(false); }
  }

  if (!room) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-white/45">
          {language === "hr" ? "Učitavanje igre..." : "Loading game..."}
        </p>
        {error && (
          <p className="max-w-sm rounded-2xl border border-accent/25 bg-accent/10 p-4 text-sm text-accent">
            {error}
          </p>
        )}
        {error && (
          <Button variant="secondary" onClick={safeLoad}>
            🔄 {language === "hr" ? "POKUŠAJ PONOVNO" : "TRY AGAIN"}
          </Button>
        )}
      </main>
    );
  }
  const current = players.find((p) => p.id === room.current_player_id) ?? null;
  const myTurn = me?.id === room.current_player_id;

  if (room.status === "ended") {
    return (
      <main className="min-h-screen max-w-md mx-auto flex flex-col items-center justify-center gap-6 p-6 text-center">
        <div className="text-8xl">🏁</div>
        <h1 className="text-4xl font-black">{language === "hr" ? "IGRA JE GOTOVA" : "GAME OVER"}</h1>
        {me?.is_host ? (
          <Button disabled={busy} onClick={() => void restart()}>🔄 {language === "hr" ? "IGRAJ PONOVNO" : "PLAY AGAIN"}</Button>
        ) : (
          <p className="rounded-2xl bg-panel2 p-4 text-white/45">{language === "hr" ? "Čekamo hosta da pokrene novu igru..." : "Waiting for the host to start a new game..."}</p>
        )}
        <Button variant="secondary" onClick={() => router.push("/")}>🏠 PARTY GAMES</Button>
      </main>
    );
  }

  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-6 p-6">
      <header className="text-center pt-4">
        <p className="text-xs font-black tracking-[0.3em] text-accent">TRUTH OR DARE</p>
        <p className="mt-2 text-white/40">{language === "hr" ? "POTEZ" : "TURN"} {room.current_turn}/{room.max_turns}</p>
      </header>
      <section className="rounded-3xl border border-white/10 bg-panel p-6 text-center">
        <p className="text-xs font-black tracking-widest text-white/35">{language === "hr" ? "NA REDU" : "CURRENT PLAYER"}</p>
        <div className="mt-3 text-6xl">{current?.avatar ?? "🎲"}</div>
        <h2 className="mt-3 text-3xl font-black">{current?.nickname ?? "..."}</h2>
      </section>

      {!prompt ? (
        myTurn ? (
          <section className="grid grid-cols-2 gap-4">
            <button disabled={busy} onClick={() => void choose("TRUTH")} className="rounded-3xl border border-sky-400/35 bg-sky-400/10 p-7 text-center active:scale-95">
              <span className="text-6xl">😇</span><span className="mt-3 block text-2xl font-black text-sky-300">TRUTH</span>
            </button>
            <button disabled={busy} onClick={() => void choose("DARE")} className="rounded-3xl border border-red-400/35 bg-red-400/10 p-7 text-center active:scale-95">
              <span className="text-6xl">😈</span><span className="mt-3 block text-2xl font-black text-red-300">DARE</span>
            </button>
          </section>
        ) : <p className="rounded-2xl bg-panel2 p-5 text-center text-white/45">{language === "hr" ? "Čekamo da igrač odabere..." : "Waiting for the player to choose..."}</p>
      ) : (
        <section className={`rounded-3xl border p-7 text-center ${prompt.prompt_type === "TRUTH" ? "border-sky-400/35 bg-sky-400/10" : "border-red-400/35 bg-red-400/10"}`}>
          <div className="text-6xl">{prompt.prompt_type === "TRUTH" ? "😇" : "😈"}</div>
          <p className="mt-3 text-xs font-black tracking-widest text-white/40">{prompt.pack.replaceAll("_", " ")}</p>
          <h2 className="mt-5 text-2xl font-black leading-relaxed">{language === "hr" ? prompt.text_hr : prompt.text_en}</h2>
        </section>
      )}

      {error && <p className="rounded-2xl border border-accent/25 bg-accent/10 p-3 text-center text-sm text-accent">{error}</p>}
      {prompt && myTurn && (
        <div className="mt-auto grid grid-cols-2 gap-3">
          <Button variant="secondary" disabled={busy} onClick={() => void finish(false)}>❌ {language === "hr" ? "PRESKOČI" : "SKIP"}</Button>
          <Button disabled={busy} onClick={() => void finish(true)}>✅ {language === "hr" ? "GOTOVO" : "DONE"}</Button>
        </div>
      )}
    </main>
  );
}