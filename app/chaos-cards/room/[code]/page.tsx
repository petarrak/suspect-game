"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import Button from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";
import { supabase } from "@/lib/supabase";
import {
  configureChaosRoom, getChaosPlayers, getChaosRoomByCode,
  getMyChaosPlayer, kickChaosPlayer, startChaosGame,
  type ChaosMode, type ChaosPlayer, type ChaosRoom,
} from "@/lib/chaosCards";

const MODES: Array<{ id: ChaosMode; emoji: string; name: string }> = [
  { id: "PARTY", emoji: "🎉", name: "Party" },
  { id: "FUNNY", emoji: "😂", name: "Funny" },
  { id: "DRINKING", emoji: "🍻", name: "Drinking" },
  { id: "HOT", emoji: "🔥", name: "Hot" },
  { id: "BRUTAL", emoji: "😈", name: "Brutal" },
];

const ADULT_MODES: ChaosMode[] = ["DRINKING", "HOT", "BRUTAL"];

export default function ChaosCardsRoomPage() {
  const { code: raw } = useParams();
  const code = (Array.isArray(raw) ? raw[0] : raw)?.toUpperCase();
  const router = useRouter();
  const { language } = useLanguage();
  const [room, setRoom] = useState<ChaosRoom | null>(null);
  const [players, setPlayers] = useState<ChaosPlayer[]>([]);
  const [me, setMe] = useState<ChaosPlayer | null>(null);
  const [mode, setMode] = useState<ChaosMode>("PARTY");
  const [turns, setTurns] = useState(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [kickingId, setKickingId] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const load = useCallback(async () => {
    if (!code) return;
    const next = await getChaosRoomByCode(code);
    const [list, mine] = await Promise.all([getChaosPlayers(next.id), getMyChaosPlayer(next.id)]);
    setRoom(next); setPlayers(list); setMe(mine); setMode(next.mode); setTurns(next.max_turns);
    if (next.status === "playing") router.replace(`/chaos-cards/game/${next.id}`);
  }, [code, router]);

  useEffect(() => { void load().catch((e) => setError(e?.message)); }, [load]);
  useEffect(() => {
    if (!room?.id) return;
    const channel = supabase.channel(`chaos-lobby-${room.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chaos_card_rooms", filter: `id=eq.${room.id}` }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "chaos_card_players", filter: `room_id=eq.${room.id}` }, (payload) => {
        const removed = payload.eventType === "DELETE" ? payload.old as { id?: string } : null;
        if (removed?.id && removed.id === me?.id) {
          router.replace("/chaos-cards");
          return;
        }
        void load();
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [room?.id, me?.id, load, router]);

  useEffect(() => {
    if (!room?.id || !me?.id || me.is_host) return;

    let checking = false;
    const checkMembership = async () => {
      if (checking) return;
      checking = true;
      try {
        const currentPlayer = await getMyChaosPlayer(room.id);
        if (!currentPlayer) router.replace("/chaos-cards");
      } catch {
        // Sljedeća provjera će pokušati ponovno ako je mreža kratko prekinuta.
      } finally {
        checking = false;
      }
    };

    const interval = window.setInterval(checkMembership, 1000);
    return () => window.clearInterval(interval);
  }, [room?.id, me?.id, me?.is_host, router]);

  async function kickPlayer(player: ChaosPlayer) {
    if (!room || !me?.is_host || player.is_host || kickingId) return;
    const confirmed = window.confirm(
      language === "hr"
        ? `Izbaciti igrača ${player.nickname} iz sobe?`
        : `Remove ${player.nickname} from the room?`
    );
    if (!confirmed) return;
    setKickingId(player.id); setError(null);
    try { await kickChaosPlayer(room.id, player.id); await load(); }
    catch (e: any) { setError(e?.message ?? "Could not remove player."); }
    finally { setKickingId(null); }
  }

  async function configure(nextMode: ChaosMode, nextTurns: number) {
    if (!room || busy) return;

    if (nextMode !== mode && ADULT_MODES.includes(nextMode)) {
      const confirmed = window.confirm(
        language === "hr"
          ? "Ovaj način igre namijenjen je osobama od 18 godina. Potvrđuješ li da svi igrači imaju 18+ godina?"
          : "This game mode is intended for adults aged 18+. Do you confirm that all players are 18 or older?"
      );

      if (!confirmed) return;
    }

    setBusy(true); setError(null);
    try { await configureChaosRoom(room.id, nextMode, nextTurns); setMode(nextMode); setTurns(nextTurns); }
    catch (e: any) { setError(e?.message); }
    finally { setBusy(false); }
  }

  async function start() {
    if (!room || busy) return;
    setBusy(true); setError(null);
    try { await startChaosGame(room.id); }
    catch (e: any) { setError(e?.message); setBusy(false); }
  }

  if (!room) return <main className="min-h-screen flex items-center justify-center text-white/45">Loading...</main>;
  return (
    <main className="min-h-screen max-w-md mx-auto flex flex-col gap-5 p-6">
      <header className="pt-4 text-center">
        <p className="text-xs font-black tracking-[0.3em] text-yellow-300">🃏 CHAOS CARDS</p>
      </header>
      <section className="rounded-3xl border border-yellow-300/20 bg-panel p-5 text-center">
        <p className="text-xs font-black tracking-widest text-white/35">{language === "hr" ? "KOD SOBE" : "ROOM CODE"}</p>
        <h1 className="mt-2 text-4xl font-black tracking-[0.18em]">{room.code}</h1>
        {origin && <div className="mx-auto mt-5 w-fit rounded-2xl bg-white p-4 shadow-xl shadow-black/30"><QRCode value={`${origin}/chaos-cards?code=${room.code}`} size={168} /></div>}
        <p className="mt-3 text-sm text-white/40">📱 {language === "hr" ? "Skeniraj za pridruživanje" : "Scan to join"}</p>
      </section>
      <section className="rounded-3xl border border-white/10 bg-panel p-5">
        <p className="text-xs font-black tracking-widest text-white/35">{language === "hr" ? "IGRAČI" : "PLAYERS"} · {players.length}</p>
        <div className="mt-4 flex flex-col gap-3">{players.map((p) => <div key={p.id} className="flex items-center gap-3 rounded-2xl bg-panel2 p-3"><span className="text-3xl">{p.avatar}</span><span className="flex-1 font-black">{p.nickname}</span>{p.is_host && <span className="rounded-full bg-yellow-400/15 px-2 py-1 text-[9px] font-black text-yellow-300">HOST</span>}{me?.is_host && !p.is_host && <button type="button" disabled={kickingId===p.id} onClick={() => void kickPlayer(p)} className="rounded-xl border border-red-400/25 bg-red-400/10 px-3 py-2 text-xs font-black text-red-300 disabled:opacity-40">{kickingId===p.id ? "..." : `👢 ${language === "hr" ? "IZBACI" : "KICK"}`}</button>}</div>)}</div>
      </section>
      {me?.is_host && <section className="rounded-3xl border border-yellow-300/20 bg-panel p-5">
        <p className="text-xs font-black tracking-[0.22em] text-yellow-300">HOST</p>
        <h2 className="mt-1 text-xl font-black">{language === "hr" ? "POSTAVKE IGRE" : "GAME SETTINGS"}</h2>
        <p className="mt-5 text-sm font-black">{language === "hr" ? "NAČIN IGRE" : "GAME MODE"}</p>
        <div className="mt-3 grid grid-cols-3 gap-2">{MODES.map((item) => <button key={item.id} disabled={busy} onClick={() => void configure(item.id, turns)} className={`rounded-2xl border p-3 text-xs font-black ${mode === item.id ? "border-yellow-300 bg-yellow-300/15 text-yellow-200" : "border-white/10 bg-panel2 text-white/45"}`}><span className="block text-2xl">{item.emoji}</span>{item.name}</button>)}</div>
        <p className="mt-5 text-sm font-black">{language === "hr" ? "BROJ KARATA" : "CARDS"}</p>
        <div className="mt-3 grid grid-cols-4 gap-2">{[20,30,50,70].map((n) => <button key={n} disabled={busy} onClick={() => void configure(mode,n)} className={`rounded-xl border py-3 font-black ${turns===n ? "border-accent bg-accent/20" : "border-white/10 bg-panel2 text-white/45"}`}>{n}</button>)}</div>
      </section>}
      {error && <p className="rounded-2xl border border-accent/25 bg-accent/10 p-3 text-center text-sm text-accent">{error}</p>}
      <div className="mt-auto">{me?.is_host ? <Button disabled={busy || players.length<2} onClick={() => void start()}>🃏 {language === "hr" ? "POKRENI KAOS" : "START CHAOS"}</Button> : <p className="rounded-2xl bg-panel2 p-4 text-center text-sm text-white/45">{language === "hr" ? "Čekamo hosta..." : "Waiting for the host..."}</p>}</div>
    </main>
  );
}